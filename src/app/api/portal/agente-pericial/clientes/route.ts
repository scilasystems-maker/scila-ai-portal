import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";
import { createClientSupabase } from "@/lib/supabase/dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("cliente_id");

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const adminDb = await createAdminSupabase();
    const { data: portalUser } = await adminDb
      .from("portal_usuarios").select("cliente_id").eq("auth_user_id", user.id).single();
    if (!portalUser?.cliente_id) return NextResponse.json([], { status: 200 });

    const { data: clientData } = await adminDb
      .from("portal_clientes").select("supabase_url, supabase_key").eq("id", portalUser.cliente_id).single();
    if (!clientData?.supabase_url || !clientData?.supabase_key) return NextResponse.json([], { status: 200 });

    const clientDb = createClientSupabase(clientData.supabase_url, clientData.supabase_key);

    // Si piden los informes de un cliente específico
    if (clienteId) {
      const { data: informes, error } = await clientDb
        .from("informes_periciales")
        .select("id, numero_informe, numero_siniestro, aseguradora, estado, creado_en")
        .eq("cliente_id", clienteId)
        .order("creado_en", { ascending: false });

      if (error) throw error;
      return NextResponse.json(informes || []);
    }

    // Lista de clientes
    const { data: clientes, error } = await clientDb
      .from("clientes")
      .select("id, nombre, telefono, municipio, direccion, codigo_postal")
      .order("nombre", { ascending: true });

    if (error) throw error;
    return NextResponse.json(clientes || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
