import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cliente_id } = body;
    if (!cliente_id) return NextResponse.json({ error: "cliente_id obligatorio" }, { status: 400 });
    const supabase = await createAdminSupabase();

    // Single module insert
    if (body.module && !body.modules) {
      const mod = body.module;
      const { data: existing } = await supabase.from("portal_modulos")
        .select("orden").eq("cliente_id", cliente_id).order("orden", { ascending: false }).limit(1);
      const nextOrder = (existing?.[0]?.orden ?? -1) + 1;
      const record = {
        cliente_id, tipo: mod.tipo || "generico", nombre_display: mod.nombre_display,
        icono: mod.icono || "LayoutGrid", tabla_origen: mod.tabla_origen || "",
        mapeo_campos: mod.mapeo_campos || {}, config_visual: mod.config_visual || { tipo_vista: "tabla" },
        metricas_config: mod.metricas_config || [], orden: nextOrder,
        visible: mod.visible !== false, permite_crear: mod.permite_crear || false,
        permite_editar: mod.permite_editar || false, permite_eliminar: mod.permite_eliminar || false,
      };
      const { data, error } = await supabase.from("portal_modulos").insert(record).select().single();
      if (error) throw error;
      const { data: allMods } = await supabase.from("portal_modulos").select("id").eq("cliente_id", cliente_id);
      await supabase.from("portal_clientes").update({
        modulos_habilitados: (allMods || []).map((m: any) => m.id), updated_at: new Date().toISOString(),
      }).eq("id", cliente_id);
      return NextResponse.json({ module: data });
    }

    // Batch insert (from wizard)
    const { modules } = body;
    if (!modules || !Array.isArray(modules))
      return NextResponse.json({ error: "modules (array) o module (object) obligatorio" }, { status: 400 });
    await supabase.from("portal_modulos").delete().eq("cliente_id", cliente_id);
    const modulesToInsert = modules.map((mod: any, index: number) => ({
      cliente_id, tipo: mod.tipo || "generico", nombre_display: mod.nombre_display,
      icono: mod.icono || "LayoutGrid", tabla_origen: mod.tabla_origen || "",
      mapeo_campos: mod.mapeo_campos || {}, config_visual: mod.config_visual || { tipo_vista: "tabla" },
      metricas_config: mod.metricas_config || [], orden: index,
      visible: mod.visible !== false, permite_crear: mod.permite_crear || false,
      permite_editar: mod.permite_editar || false, permite_eliminar: mod.permite_eliminar || false,
    }));
    const { data, error } = await supabase.from("portal_modulos").insert(modulesToInsert).select();
    if (error) throw error;
    await supabase.from("portal_clientes").update({
      modulos_habilitados: (data || []).map((m: any) => m.id), updated_at: new Date().toISOString(),
    }).eq("id", cliente_id);
    return NextResponse.json({ modules: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("cliente_id");
    if (!clienteId) return NextResponse.json({ error: "cliente_id obligatorio" }, { status: 400 });
    const supabase = await createAdminSupabase();
    const { data, error } = await supabase.from("portal_modulos").select("*").eq("cliente_id", clienteId).order("orden");
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id obligatorio" }, { status: 400 });
    const supabase = await createAdminSupabase();
    const allowed = ["nombre_display", "icono", "tipo", "tabla_origen", "mapeo_campos", "config_visual", "visible", "permite_crear", "permite_editar", "permite_eliminar", "orden"];
    const clean: Record<string, any> = {};
    for (const key of allowed) { if (updates[key] !== undefined) clean[key] = updates[key]; }
    const { data, error } = await supabase.from("portal_modulos").update(clean).eq("id", id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get("id");
    if (!moduleId) return NextResponse.json({ error: "id obligatorio" }, { status: 400 });
    const supabase = await createAdminSupabase();
    const { data: mod } = await supabase.from("portal_modulos").select("cliente_id").eq("id", moduleId).single();
    const { error } = await supabase.from("portal_modulos").delete().eq("id", moduleId);
    if (error) throw error;
    if (mod?.cliente_id) {
      const { data: remaining } = await supabase.from("portal_modulos").select("id").eq("cliente_id", mod.cliente_id);
      await supabase.from("portal_clientes").update({
        modulos_habilitados: (remaining || []).map((m: any) => m.id), updated_at: new Date().toISOString(),
      }).eq("id", mod.cliente_id);
    }
    return NextResponse.json({ message: "Módulo eliminado" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
