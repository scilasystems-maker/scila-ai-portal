import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";

// GET /api/admin/agentes
export async function GET() {
  try {
    const supabase = await createAdminSupabase();
    const { data, error } = await supabase
      .from("portal_agentes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/agentes
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createAdminSupabase();
    const { data, error } = await supabase
      .from("portal_agentes")
      .insert({
        nombre: body.nombre,
        descripcion: body.descripcion || null,
        precio: parseFloat(body.precio) || 0,
        periodicidad: body.periodicidad || "mensual",
        activo: body.activo !== false,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/agentes
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "ID obligatorio" }, { status: 400 });
    if (updates.precio) updates.precio = parseFloat(updates.precio);

    const supabase = await createAdminSupabase();
    const { data, error } = await supabase
      .from("portal_agentes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/agentes?id=xxx
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obligatorio" }, { status: 400 });

    const supabase = await createAdminSupabase();
    const { error } = await supabase.from("portal_agentes").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
