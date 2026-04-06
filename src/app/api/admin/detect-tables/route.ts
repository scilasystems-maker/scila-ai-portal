import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { supabase_url, supabase_key } = await request.json();

    if (!supabase_url || !supabase_key) {
      return NextResponse.json({ error: "URL y Key son obligatorios" }, { status: 400 });
    }

    console.log("Connecting to:", supabase_url);

    // Connect to client's Supabase
    const clientDb = createClient(supabase_url, supabase_key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get OpenAPI schema which lists all tables
    const schemaUrl = `${supabase_url}/rest/v1/`;
    const response = await fetch(schemaUrl, {
      headers: {
        apikey: supabase_key,
        Authorization: `Bearer ${supabase_key}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Schema fetch error:", response.status, text);
      return NextResponse.json({ error: `Error conectando: ${response.status}` }, { status: 500 });
    }

    const schema = await response.json();
    const tableNames = schema.definitions ? Object.keys(schema.definitions) : [];

    console.log("Tables found:", tableNames);

    // Get details for each table
    const tables = await Promise.all(
      tableNames.map(async (tableName) => {
        try {
          const tableDef = schema.definitions[tableName];
          const columns = tableDef?.properties
            ? Object.entries(tableDef.properties).map(([name, info]: [string, any]) => ({
                column_name: name,
                data_type: info.type || info.format || "unknown",
                is_nullable: tableDef.required?.includes(name) ? "NO" : "YES",
              }))
            : [];

          const { count } = await clientDb
            .from(tableName)
            .select("*", { count: "exact", head: true });

          const { data: preview } = await clientDb
            .from(tableName)
            .select("*")
            .limit(3);

          return {
            name: tableName,
            columns,
            row_count: count || 0,
            preview: preview || [],
          };
        } catch (err: any) {
          console.error(`Error on table ${tableName}:`, err.message);
          return { name: tableName, columns: [], row_count: 0, preview: [] };
        }
      })
    );

    return NextResponse.json({ tables });
  } catch (error: any) {
    console.error("DETECT TABLES ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}