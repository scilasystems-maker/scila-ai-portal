import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";
import { createClientSupabase } from "@/lib/supabase/dynamic";

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const adminDb = await createAdminSupabase();
    const { data: portalUser } = await adminDb
      .from("portal_usuarios").select("cliente_id").eq("auth_user_id", user.id).single();
    if (!portalUser?.cliente_id) return NextResponse.json({ error: "Sin cliente" }, { status: 403 });

    const { data: clientData } = await adminDb
      .from("portal_clientes").select("supabase_url, supabase_key").eq("id", portalUser.cliente_id).single();
    if (!clientData?.supabase_url || !clientData?.supabase_key) return NextResponse.json({ error: "Sin credenciales" }, { status: 403 });

    const clientDb = createClientSupabase(clientData.supabase_url, clientData.supabase_key);
    const body = await request.json();
    const { table, id, updates } = body;

    if (!table || !id || !updates) return NextResponse.json({ error: "table, id y updates obligatorios" }, { status: 400 });

    const allowedTables = ["informes_periciales", "citas", "clientes"];
    if (!allowedTables.includes(table)) return NextResponse.json({ error: "Tabla no permitida" }, { status: 400 });

    const { data, error } = await clientDb.from(table).update(updates).eq("id", id).select().single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
