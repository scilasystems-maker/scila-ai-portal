import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";

// POST /api/admin/modules — Save modules for a client
export async function POST(request: Request) {
  try {
    const { cliente_id, modules } = await request.json();

    if (!cliente_id || !modules || !Array.isArray(modules)) {
      return NextResponse.json(
        { error: "cliente_id y modules son obligatorios" },
        { status: 400 }
      );
    }

    const supabase = await createAdminSupabase();

    // Delete existing modules for this client
    await supabase.from("portal_modulos").delete().eq("cliente_id", cliente_id);

    // Insert new modules
    const modulesToInsert = modules.map((mod: any, index: number) => ({
      cliente_id,
      tipo: mod.tipo || "generico",
      nombre_display: mod.nombre_display,
      icono: mod.icono || "LayoutGrid",
      tabla_origen: mod.tabla_origen,
      mapeo_campos: mod.mapeo_campos || {},
      config_visual: mod.config_visual || { tipo_vista: "tabla" },
      metricas_config: mod.metricas_config || [],
      orden: index,
      visible: mod.visible !== false,
      permite_crear: mod.permite_crear || false,
      permite_editar: mod.permite_editar || false,
      permite_eliminar: mod.permite_eliminar || false,
    }));

    const { data, error } = await supabase
      .from("portal_modulos")
      .insert(modulesToInsert)
      .select();

    if (error) throw error;

    // Update client's modulos_habilitados
    const moduleIds = (data || []).map((m: any) => m.id);
    await supabase
      .from("portal_clientes")
      .update({ modulos_habilitados: moduleIds, updated_at: new Date().toISOString() })
      .eq("id", cliente_id);

    return NextResponse.json({ modules: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/admin/modules?cliente_id=xxx — Get modules for a client
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("cliente_id");

    if (!clienteId) {
      return NextResponse.json({ error: "cliente_id es obligatorio" }, { status: 400 });
    }

    const supabase = await createAdminSupabase();
    const { data, error } = await supabase
      .from("portal_modulos")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("orden");

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
