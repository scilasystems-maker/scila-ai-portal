import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/admin/detect-tables — Detect tables in a client's Supabase
export async function POST(request: Request) {
  try {
    const { supabase_url, supabase_key } = await request.json();

    if (!supabase_url || !supabase_key) {
      return NextResponse.json(
        { error: "URL y Key de Supabase son obligatorios" },
        { status: 400 }
      );
    }

    // Connect to the client's Supabase
    const clientDb = createClient(supabase_url, supabase_key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Query information_schema to get all public tables
    const { data: tables, error: tablesError } = await clientDb.rpc(
      "get_public_tables_info"
    );

    // If RPC doesn't exist, use a raw query approach via a known table
    if (tablesError) {
      // Fallback: try to query using the REST API approach
      // We'll use a SQL function or direct approach
      const result = await fetchTablesDirectly(supabase_url, supabase_key);
      return NextResponse.json(result);
    }

    return NextResponse.json(tables);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function fetchTablesDirectly(url: string, key: string) {
  // Use the PostgREST schema endpoint to discover tables
  const schemaUrl = `${url}/rest/v1/`;
  
  try {
    const response = await fetch(schemaUrl, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error connecting to Supabase: ${response.status}`);
    }

    // The response gives us the OpenAPI spec with all tables
    const schema = await response.json();
    
    // Also try to get table info via SQL using the Supabase client
    const clientDb = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: "public" },
    });

    // Get table names from definitions
    const tableNames = schema.definitions 
      ? Object.keys(schema.definitions)
      : [];

    // For each table, get columns and row count
    const tablesWithInfo = await Promise.all(
      tableNames.map(async (tableName: string) => {
        try {
          // Get columns from schema definition
          const tableDef = schema.definitions[tableName];
          const columns = tableDef?.properties
            ? Object.entries(tableDef.properties).map(([name, info]: [string, any]) => ({
                column_name: name,
                data_type: info.type || info.format || "unknown",
                is_nullable: tableDef.required?.includes(name) ? "NO" : "YES",
                column_default: info.default || null,
                description: info.description || null,
              }))
            : [];

          // Get row count
          const { count } = await clientDb
            .from(tableName)
            .select("*", { count: "exact", head: true });

          // Get preview rows
          const { data: preview } = await clientDb
            .from(tableName)
            .select("*")
            .limit(5);

          return {
            name: tableName,
            columns,
            row_count: count || 0,
            preview: preview || [],
          };
        } catch (err) {
          return {
            name: tableName,
            columns: [],
            row_count: 0,
            preview: [],
            error: "Could not fetch details",
          };
        }
      })
    );

    return { tables: tablesWithInfo };
  } catch (error: any) {
    // If schema endpoint fails, try alternate approach
    // Just try to connect and report the error
    throw new Error(
      `No se pudo conectar al Supabase del cliente. Verifica la URL y la Service Role Key. Error: ${error.message}`
    );
  }
}
