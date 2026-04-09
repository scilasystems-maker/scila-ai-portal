import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";

// GET /api/admin/billing?cliente_id=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("cliente_id");

    const supabase = await createAdminSupabase();

    // Get all invoices
    let query = supabase
      .from("portal_facturacion_admin")
      .select("*, portal_clientes(empresa, nombre, email)")
      .order("fecha_emision", { ascending: false });
    if (clienteId) query = query.eq("cliente_id", clienteId);
    const { data, error } = await query;
    if (error) throw error;
    const all = data || [];

    // Get active subscriptions to check for auto-invoice generation
    let agentQuery = supabase
      .from("portal_cliente_agentes")
      .select("*, portal_agentes(nombre, precio, periodicidad), portal_clientes!portal_cliente_agentes_cliente_fk(empresa, nombre, email)")
      .eq("activo", true);
    if (clienteId) agentQuery = agentQuery.eq("cliente_id", clienteId);
    const { data: subscriptions } = await agentQuery;

    // Auto-generate invoices for subscriptions where next payment is within 5 days
    // and no pending invoice exists for that period
    const now = new Date();
    const upcoming: any[] = [];

    for (const sub of (subscriptions || [])) {
      const agentName = sub.portal_agentes?.nombre || "Agente";
      const clientName = sub.portal_clientes?.empresa || sub.portal_clientes?.nombre || "Cliente";
      const precioBase = sub.portal_agentes?.precio || 0;
      const precioFinal = sub.precio_custom !== null ? sub.precio_custom : precioBase;
      const descuento = sub.descuento || 0;
      const precioConDescuento = precioFinal * (1 - descuento / 100);
      const periodicidad = sub.portal_agentes?.periodicidad || "mensual";

      if (periodicidad === "unico") continue;

      // Calculate next payment date
      const fechaInicio = new Date(sub.fecha_inicio || sub.created_at);
      const nextPayment = new Date(fechaInicio);
      while (nextPayment <= now) {
        if (periodicidad === "mensual") nextPayment.setMonth(nextPayment.getMonth() + 1);
        else if (periodicidad === "trimestral") nextPayment.setMonth(nextPayment.getMonth() + 3);
        else if (periodicidad === "anual") nextPayment.setFullYear(nextPayment.getFullYear() + 1);
        else nextPayment.setMonth(nextPayment.getMonth() + 1);
      }

      const daysUntil = Math.ceil((nextPayment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // If within 5 days, check if invoice already exists for this period
      if (daysUntil <= 5) {
        const mesLabel = nextPayment.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
        const conceptoBuscar = `${agentName} — ${mesLabel}`;

        const existingInvoice = all.find((f: any) =>
          f.cliente_id === sub.cliente_id &&
          f.concepto.includes(agentName) &&
          f.concepto.includes(mesLabel)
        );

        if (!existingInvoice) {
          // Auto-create the invoice
          const vencimiento = new Date(nextPayment);
          vencimiento.setDate(vencimiento.getDate() + 30);

          const { data: newInvoice } = await supabase.from("portal_facturacion_admin").insert({
            cliente_id: sub.cliente_id,
            concepto: conceptoBuscar,
            importe: precioConDescuento,
            estado: "pendiente",
            fecha_emision: nextPayment.toISOString().split("T")[0],
            fecha_vencimiento: vencimiento.toISOString().split("T")[0],
            notas: `Generada automáticamente. ${descuento > 0 ? `Dto ${descuento}%` : ""}`.trim(),
          }).select("*, portal_clientes(empresa, nombre, email)").single();

          if (newInvoice) all.unshift(newInvoice);
        }
      }

      upcoming.push({
        id: `upcoming-${sub.id}`,
        cliente_id: sub.cliente_id,
        cliente_nombre: clientName,
        agente_nombre: agentName,
        importe: precioConDescuento,
        periodicidad,
        fecha_proximo_pago: nextPayment.toISOString().split("T")[0],
        dias_restantes: daysUntil,
        descuento: descuento > 0 ? descuento : null,
        es_urgente: daysUntil <= 5,
      });
    }

    upcoming.sort((a, b) => a.dias_restantes - b.dias_restantes);

    // Summary - Total cobrado = ONLY paid
    const totalPendiente = all.filter((f: any) => f.estado === "pendiente").reduce((s: number, f: any) => s + (f.importe || 0), 0);
    const totalPagado = all.filter((f: any) => f.estado === "pagado").reduce((s: number, f: any) => s + (f.importe || 0), 0);
    const totalVencido = all.filter((f: any) => f.estado === "vencido").reduce((s: number, f: any) => s + (f.importe || 0), 0);

    return NextResponse.json({
      facturas: all,
      resumen: {
        pendiente: totalPendiente,
        pagado: totalPagado,
        vencido: totalVencido,
      },
      upcoming,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/billing
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createAdminSupabase();
    const { data, error } = await supabase
      .from("portal_facturacion_admin")
      .insert({
        cliente_id: body.cliente_id,
        concepto: body.concepto,
        importe: parseFloat(body.importe) || 0,
        estado: body.estado || "pendiente",
        fecha_emision: body.fecha_emision || new Date().toISOString().split("T")[0],
        fecha_vencimiento: body.fecha_vencimiento || null,
        notas: body.notas || null,
      })
      .select("*, portal_clientes(empresa, nombre, email)")
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/billing
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "ID obligatorio" }, { status: 400 });
    if (updates.importe) updates.importe = parseFloat(updates.importe);
    // Fix empty dates — send null instead of ""
    if (updates.fecha_vencimiento === "") updates.fecha_vencimiento = null;
    if (updates.fecha_emision === "") updates.fecha_emision = null;
    const supabase = await createAdminSupabase();
    const { data, error } = await supabase
      .from("portal_facturacion_admin")
      .update(updates)
      .eq("id", id)
      .select("*, portal_clientes(empresa, nombre, email)")
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/billing?id=xxx
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obligatorio" }, { status: 400 });
    const supabase = await createAdminSupabase();
    const { error } = await supabase.from("portal_facturacion_admin").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
