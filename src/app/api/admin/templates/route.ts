import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/encryption";

// POST /api/admin/templates — Execute SQL on client's Supabase
export async function POST(request: Request) {
  try {
    const { cliente_id, sql } = await request.json();
    if (!cliente_id || !sql) {
      return NextResponse.json({ error: "cliente_id y sql son obligatorios" }, { status: 400 });
    }

    const supabase = await createAdminSupabase();

    // Get client credentials
    const { data: client } = await supabase
      .from("portal_clientes")
      .select("supabase_url, supabase_key, empresa, nombre")
      .eq("id", cliente_id)
      .single();

    if (!client?.supabase_url || !client?.supabase_key) {
      return NextResponse.json({ error: "Cliente sin credenciales de Supabase" }, { status: 400 });
    }

    const decryptedKey = decrypt(client.supabase_key);

    // Execute SQL via Supabase REST API (using rpc or direct fetch)
    const response = await fetch(`${client.supabase_url}/rest/v1/rpc/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": decryptedKey,
        "Authorization": `Bearer ${decryptedKey}`,
      },
    });

    // Use the postgres connection via fetch to the SQL endpoint
    const sqlResponse = await fetch(`${client.supabase_url}/rest/v1/`, {
      headers: {
        "apikey": decryptedKey,
        "Authorization": `Bearer ${decryptedKey}`,
      },
    });

    // Better approach: use supabase-js and raw SQL via rpc
    // First, create a function that executes raw SQL, or use the management API
    // The simplest approach: use the Supabase Management API or pg endpoint

    // Use the direct postgres endpoint
    const pgResponse = await fetch(`${client.supabase_url}/pg`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": decryptedKey,
        "Authorization": `Bearer ${decryptedKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    // If pg endpoint doesn't work, try creating via the REST API
    // The most reliable way is to use the supabase client with rpc
    const clientDb = createClient(client.supabase_url, decryptedKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: "public" },
    });

    // Try executing via rpc (requires a helper function in the DB)
    // Since we can't execute raw SQL directly via supabase-js,
    // we'll use the SQL API endpoint that Supabase provides
    const sqlApiResponse = await fetch(`${client.supabase_url}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": decryptedKey,
        "Authorization": `Bearer ${decryptedKey}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ query: sql }),
    });

    if (sqlApiResponse.ok) {
      return NextResponse.json({ success: true, message: "Tabla creada correctamente" });
    }

    // If rpc doesn't exist, return the SQL for manual execution
    return NextResponse.json({
      success: false,
      message: "No se pudo ejecutar automáticamente. Supabase del cliente no tiene la función exec_sql. Copia el SQL y ejecútalo manualmente en el SQL Editor del Supabase del cliente.",
      sql,
      supabase_url: client.supabase_url,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
