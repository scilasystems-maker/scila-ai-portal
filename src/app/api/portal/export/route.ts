import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/encryption";

// GET /api/portal/export?module_id=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get("module_id");
    if (!moduleId) return NextResponse.json({ error: "module_id obligatorio" }, { status: 400 });

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const adminDb = await createAdminSupabase();

    const { data: portalUser } = await adminDb
      .from("portal_usuarios")
      .select("cliente_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!portalUser?.cliente_id) return NextResponse.json({ error: "Sin cliente" }, { status: 403 });

    const { data: modulo } = await adminDb
      .from("portal_modulos")
      .select("*")
      .eq("id", moduleId)
      .eq("cliente_id", portalUser.cliente_id)
      .single();

    if (!modulo) return NextResponse.json({ error: "Módulo no encontrado" }, { status: 404 });

    const { data: client } = await adminDb
      .from("portal_clientes")
      .select("supabase_url, supabase_key")
      .eq("id", portalUser.cliente_id)
      .single();

    const decryptedKey = decrypt(client!.supabase_key!);
    const clientDb = createClient(client!.supabase_url!, decryptedKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: records, error } = await clientDb
      .from(modulo.tabla_origen)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) throw error;

    // Generate CSV
    if (!records || records.length === 0) {
      return new NextResponse("Sin datos", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    const headers = Object.keys(records[0]);
    const csvHeader = headers.map(h => `"${h}"`).join(",");
    const csvRows = records.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(",")
    );

    const csv = [csvHeader, ...csvRows].join("\n");
    const filename = `${modulo.nombre_display.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
