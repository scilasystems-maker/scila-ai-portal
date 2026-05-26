import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { createClient } from "@supabase/supabase-js";

// GET /api/admin/detect-tables-by-client?cliente_id=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("cliente_id");
    if (!clienteId) return NextResponse.json({ error: "cliente_id obligatorio" }, { status: 400 });

    const adminDb = await createAdminSupabase();
    const { data: clientData } = await adminDb
      .from("portal_clientes")
      .select("supabase_url, supabase_key")
      .eq("id", clienteId)
      .single();

    if (!clientData?.supabase_url || !clientData?.supabase_key) {
      return NextResponse.json({ error: "El cliente no tiene credenciales de Supabase configuradas" }, { status: 400 });
    }

    const decryptedKey = decrypt(clientData.supabase_key);
    const schemaUrl = `${clientData.supabase_url}/rest/v1/`;

    const response = await fetch(schemaUrl, {
      headers: { apikey: decryptedKey, Authorization: `Bearer ${decryptedKey}` },
    });

    if (!response.ok) throw new Error("No se pudo conectar al Supabase del cliente");

    const schema = await response.json();
    const tableNames = schema.definitions ? Object.keys(schema.definitions) : [];

    const clientDb = createClient(clientData.supabase_url, decryptedKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const tables = await Promise.all(
      tableNames.map(async (name: string) => {
        try {
          const { count } = await clientDb.from(name).select("*", { count: "exact", head: true });
          return { name, row_count: count || 0 };
        } catch {
          return { name, row_count: 0 };
        }
      })
    );

    return NextResponse.json({ tables });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
