import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";

// GET /api/admin/client-agentes?cliente_id=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("cliente_id");
    if (!clienteId) return NextResponse.json({ error: "cliente_id obligatorio" }, { status: 400 });

    const supabase = await createAdminSupabase();
    const { data, error } = await supabase
      .from("portal_cliente_agentes")
      .select("*, portal_agentes(nombre, descripcion, precio, periodicidad)")
      .eq("cliente_id", clienteId)
      .order("created_at");

    if (error) throw error;

    // Calculate totals
    const items = (data || []).map((item: any) => {
      const precioBase = parseFloat(String(item.portal_agentes?.precio)) || 0;
      const precioFinal = item.precio_custom !== null ? parseFloat(String(item.precio_custom)) : precioBase;
      const descuento = item.descuento || 0;
      const precioConDescuento = precioFinal * (1 - descuento / 100);
      return { ...item, precio_base: precioBase, precio_final: precioFinal, precio_con_descuento: precioConDescuento };
    });

    const totalMensual = items
      .filter((i: any) => i.activo && i.portal_agentes?.periodicidad === "mensual")
      .reduce((sum: number, i: any) => sum + i.precio_con_descuento, 0);

    return NextResponse.json({ items, total_mensual: totalMensual });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/client-agentes — Assign agent to client + auto-create invoice
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createAdminSupabase();

    const precioCustom = body.precio_custom !== undefined && body.precio_custom !== "" ? parseFloat(body.precio_custom) : null;
    const descuento = body.descuento ? parseFloat(body.descuento) : 0;

    // 1. First, get the agent details BEFORE inserting
    const { data: agente } = await supabase
      .from("portal_agentes")
      .select("id, nombre, precio, periodicidad")
      .eq("id", body.agente_id)
      .single();

    if (!agente) {
      return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });
    }

    // 2. Insert the assignment
    const { data, error } = await supabase
      .from("portal_cliente_agentes")
      .insert({
        cliente_id: body.cliente_id,
        agente_id: body.agente_id,
        precio_custom: precioCustom,
        descuento,
        fecha_inicio: body.fecha_inicio || new Date().toISOString().split("T")[0],
        fecha_fin: body.fecha_fin || null,
        activo: true,
        notas: body.notas || null,
      })
      .select("*")
      .single();

    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) {
        return NextResponse.json({ error: "Este agente ya está asignado a este cliente" }, { status: 409 });
      }
      throw error;
    }

    // 3. Auto-create pending invoice for first payment using the agent data we already have
    const precioBase = parseFloat(String(agente.precio)) || 0;
    const precioFinal = precioCustom !== null ? precioCustom : precioBase;
    const precioConDescuento = precioFinal * (1 - descuento / 100);

    if (precioConDescuento > 0 && !isNaN(precioConDescuento)) {
      const now = new Date();
      const mesActual = now.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
      const vencimiento = new Date(now);
      vencimiento.setDate(vencimiento.getDate() + 30);

      await supabase.from("portal_facturacion_admin").insert({
        cliente_id: body.cliente_id,
        concepto: `${agente.nombre} — ${mesActual}`,
        importe: precioConDescuento,
        estado: "pendiente",
        fecha_emision: now.toISOString().split("T")[0],
        fecha_vencimiento: vencimiento.toISOString().split("T")[0],
        notas: descuento > 0 ? `Dto ${descuento}% aplicado` : null,
      });
    }

    return NextResponse.json({ ...data, portal_agentes: agente });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/client-agentes — Update assignment
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "ID obligatorio" }, { status: 400 });

    if (updates.precio_custom !== undefined) {
      updates.precio_custom = updates.precio_custom !== "" && updates.precio_custom !== null ? parseFloat(updates.precio_custom) : null;
    }
    if (updates.descuento !== undefined) updates.descuento = parseFloat(updates.descuento) || 0;

    const supabase = await createAdminSupabase();
    const { data, error } = await supabase
      .from("portal_cliente_agentes")
      .update(updates)
      .eq("id", id)
      .select("*, portal_agentes(nombre, descripcion, precio, periodicidad)")
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/client-agentes?id=xxx
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obligatorio" }, { status: 400 });

    const supabase = await createAdminSupabase();
    const { error } = await supabase.from("portal_cliente_agentes").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
