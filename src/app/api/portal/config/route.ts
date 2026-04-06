import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";

// GET /api/portal/config — Get portal config for logged-in user
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const adminDb = await createAdminSupabase();

    // Get portal user
    const { data: portalUser, error: userError } = await adminDb
      .from("portal_usuarios")
      .select("*")
      .eq("auth_user_id", user.id)
      .single();

    if (userError || !portalUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Get client info
    let client = null;
    let modules: any[] = [];

    if (portalUser.cliente_id) {
      const { data: clientData } = await adminDb
        .from("portal_clientes")
        .select("id, email, nombre, empresa, plan, estado, coste_hora, minutos_por_conv, supabase_url")
        .eq("id", portalUser.cliente_id)
        .single();

      client = clientData;

      // Get modules for this client
      const { data: modulesData } = await adminDb
        .from("portal_modulos")
        .select("*")
        .eq("cliente_id", portalUser.cliente_id)
        .eq("visible", true)
        .order("orden");

      modules = modulesData || [];
    }

    return NextResponse.json({
      user: portalUser,
      client,
      modules,
    });
  } catch (error: any) {
    console.error("Portal config error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
