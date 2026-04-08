import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";

// GET /api/admin/audit?page=1&limit=50&accion=xxx&cliente_id=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const accion = searchParams.get("accion");
    const clienteId = searchParams.get("cliente_id");

    const supabase = await createAdminSupabase();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("portal_audit_log")
      .select("*, portal_usuarios(nombre, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (accion) query = query.eq("accion", accion);
    if (clienteId) query = query.eq("cliente_id", clienteId);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      logs: data || [],
      total: count || 0,
      page,
      total_pages: Math.ceil((count || 0) / limit),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
