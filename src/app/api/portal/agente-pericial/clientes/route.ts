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
      .from("portal_usuarios")
      .select("cliente_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!portalUser?.cliente_id) return NextResponse.json([], { status: 200 });

    const { data: clientData } = await adminDb
      .from("portal_clientes")
      .select("supabase_url, supabase_key, id")
      .eq("id", portalUser.cliente_id)
      .single();

    if (!clientData?.supabase_url || !clientData?.supabase_key) return NextResponse.json([], { status: 200 });

    const franciscoDb = createClientSupabase(clientData.supabase_url, clientData.supabase_key);

    // Si piden los informes de un cliente específico
    if (clienteId) {
      const { data: informes, error } = await franciscoDb
        .from("informes_periciales")
        .select("id, numero_informe, aseguradora, municipio_siniestro, estado, creado_en")
        .eq("cliente_id", clienteId)
        .eq("user_id", clientData.id)
        .order("numero_informe", { ascending: false });

      if (error) throw error;
      return NextResponse.json(informes || []);
    }

    // Lista de clientes
    const { data: clientes, error } = await franciscoDb
      .from("clientes")
      .select("id, nombre, telefono, municipio")
      .eq("user_id", clientData.id)
      .order("nombre", { ascending: true });

    if (error) throw error;
    return NextResponse.json(clientes || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
