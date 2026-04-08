import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";

// GET /api/admin/billing?cliente_id=xxx (optional filter)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("cliente_id");

    const supabase = await createAdminSupabase();
    let query = supabase
      .from("portal_facturacion_admin")
      .select("*, portal_clientes(empresa, nombre, email)")
      .order("fecha_emision", { ascending: false });

    if (clienteId) query = query.eq("cliente_id", clienteId);

    const { data, error } = await query;
    if (error) throw error;

    // Summary
    const all = data || [];
    const totalPendiente = all.filter(f => f.estado === "pendiente").reduce((s, f) => s + (f.importe || 0), 0);
    const totalPagado = all.filter(f => f.estado === "pagado").reduce((s, f) => s + (f.importe || 0), 0);
    const totalVencido = all.filter(f => f.estado === "vencido").reduce((s, f) => s + (f.importe || 0), 0);

    return NextResponse.json({
      facturas: all,
      resumen: { pendiente: totalPendiente, pagado: totalPagado, vencido: totalVencido, total: totalPendiente + totalPagado + totalVencido },
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
