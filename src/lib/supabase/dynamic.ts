import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "../encryption";

/**
 * Creates a Supabase client connected to a CLIENT's project.
 * Used to read their leads, appointments, conversations, etc.
 * 
 * @param encryptedUrl - The client's Supabase URL (stored plain)
 * @param encryptedKey - The client's service_role key (stored encrypted)
 */
export function createClientSupabase(
  supabaseUrl: string,
  encryptedKey: string
): SupabaseClient {
  const decryptedKey = decrypt(encryptedKey);

  return createClient(supabaseUrl, decryptedKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Lists all public tables in a client's Supabase project.
 */
export async function listClientTables(client: SupabaseClient): Promise<TableInfo[]> {
  const { data, error } = await client.rpc("get_public_tables").select();

  if (error) {
    // Fallback: query information_schema directly
    const { data: tables, error: fallbackError } = await client
      .from("information_schema.tables" as any)
      .select("table_name")
      .eq("table_schema", "public")
      .neq("table_name", "schema_migrations");

    if (fallbackError) {
      throw new Error(`Error listing tables: ${fallbackError.message}`);
    }

    return (tables || []).map((t: any) => ({
      name: t.table_name,
      columns: [],
      rowCount: 0,
    }));
  }

  return data || [];
}

/**
 * Gets columns for a specific table in a client's Supabase.
 */
export async function getTableColumns(
  client: SupabaseClient,
  tableName: string
): Promise<ColumnInfo[]> {
  const { data, error } = await client.rpc("get_table_columns", {
    p_table_name: tableName,
  });

  if (error) {
    throw new Error(`Error getting columns for ${tableName}: ${error.message}`);
  }

  return data || [];
}

/**
 * Gets a preview of data from a client's table.
 */
export async function getTablePreview(
  client: SupabaseClient,
  tableName: string,
  limit: number = 5
): Promise<{ data: any[]; count: number }> {
  const { data, error, count } = await client
    .from(tableName)
    .select("*", { count: "exact" })
    .limit(limit);

  if (error) {
    throw new Error(`Error previewing ${tableName}: ${error.message}`);
  }

  return { data: data || [], count: count || 0 };
}

// ── Types ──
export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}
