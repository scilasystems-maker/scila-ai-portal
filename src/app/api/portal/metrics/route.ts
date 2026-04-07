import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/encryption";

// GET /api/portal/metrics?period=7|30|90|all
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get("period") || "30");

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const adminDb = await createAdminSupabase();

    const { data: portalUser } = await adminDb
      .from("portal_usuarios")
      .select("cliente_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!portalUser?.cliente_id) {
      return NextResponse.json({ error: "Sin cliente" }, { status: 403 });
    }

    // Get client info
    const { data: client } = await adminDb
      .from("portal_clientes")
      .select("supabase_url, supabase_key, coste_hora, minutos_por_conv")
      .eq("id", portalUser.cliente_id)
      .single();

    if (!client?.supabase_url || !client?.supabase_key) {
      return NextResponse.json({ error: "Sin credenciales" }, { status: 500 });
    }

    // Get modules
    const { data: modules } = await adminDb
      .from("portal_modulos")
      .select("*")
      .eq("cliente_id", portalUser.cliente_id)
      .eq("visible", true);

    const decryptedKey = decrypt(client.supabase_key);
    const clientDb = createClient(client.supabase_url, decryptedKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date();
    const periodStart = new Date();
    periodStart.setDate(now.getDate() - period);
    const prevPeriodStart = new Date();
    prevPeriodStart.setDate(now.getDate() - (period * 2));

    const metrics: any = {
      period,
      coste_hora: client.coste_hora || 15,
      minutos_por_conv: client.minutos_por_conv || 5,
      modules: {},
    };

    for (const mod of (modules || [])) {
      const tabla = mod.tabla_origen;
      const campos = mod.mapeo_campos || {};
      const dateField = campos.fecha || campos.created_at || campos.fecha_registro || "created_at";

      try {
        // Total count
        const { count: totalCount } = await clientDb
          .from(tabla)
          .select("*", { count: "exact", head: true });

        // Current period count
        const { count: currentCount } = await clientDb
          .from(tabla)
          .select("*", { count: "exact", head: true })
          .gte(dateField, periodStart.toISOString());

        // Previous period count (for comparison)
        const { count: prevCount } = await clientDb
          .from(tabla)
          .select("*", { count: "exact", head: true })
          .gte(dateField, prevPeriodStart.toISOString())
          .lt(dateField, periodStart.toISOString());

        // Get all records for charts
        const { data: records } = await clientDb
          .from(tabla)
          .select("*")
          .order(dateField, { ascending: true });

        const allRecords = records || [];

        // ── Per-day distribution ──
        const perDay: Record<string, number> = {};
        allRecords.forEach((r: any) => {
          const d = r[dateField];
          if (!d) return;
          const day = new Date(d).toISOString().split("T")[0];
          perDay[day] = (perDay[day] || 0) + 1;
        });

        // Fill gaps for last N days
        const dailyData = [];
        for (let i = period - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().split("T")[0];
          dailyData.push({
            date: key,
            label: d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
            count: perDay[key] || 0,
          });
        }

        // ── Status distribution (if status field exists) ──
        let statusDist: { name: string; value: number; }[] = [];
        const statusField = campos.estado;
        if (statusField) {
          const statusMap: Record<string, number> = {};
          allRecords.forEach((r: any) => {
            const s = r[statusField] || "Sin estado";
            statusMap[s] = (statusMap[s] || 0) + 1;
          });
          statusDist = Object.entries(statusMap).map(([name, value]) => ({ name, value }));
          statusDist.sort((a, b) => b.value - a.value);
        }

        // ── Hourly heatmap (for conversations) ──
        let hourlyData: { hour: number; day: number; count: number }[] = [];
        if (mod.tipo === "conversaciones") {
          const heatmap: Record<string, number> = {};
          allRecords.forEach((r: any) => {
            const d = r[dateField];
            if (!d) return;
            const date = new Date(d);
            const hour = date.getHours();
            const day = date.getDay(); // 0=Sun, 6=Sat
            const key = `${day}-${hour}`;
            heatmap[key] = (heatmap[key] || 0) + 1;
          });
          hourlyData = Object.entries(heatmap).map(([key, count]) => {
            const [day, hour] = key.split("-").map(Number);
            return { hour, day, count };
          });
        }

        // ── Role distribution (for conversations) ──
        let rolesDist: { name: string; value: number }[] = [];
        const roleField = campos.rol;
        if (roleField) {
          const roleMap: Record<string, number> = {};
          allRecords.forEach((r: any) => {
            const role = r[roleField] || "unknown";
            roleMap[role] = (roleMap[role] || 0) + 1;
          });
          rolesDist = Object.entries(roleMap).map(([name, value]) => ({ name, value }));
        }

        // ── Average response time (for conversations) ──
        let avgResponseTime = 0;
        if (mod.tipo === "conversaciones" && roleField) {
          let totalTime = 0;
          let responseCount = 0;
          for (let i = 1; i < allRecords.length; i++) {
            const prev = allRecords[i - 1];
            const curr = allRecords[i];
            if (prev[roleField] === "cliente" && curr[roleField] === "agente") {
              const diff = new Date(curr[dateField]).getTime() - new Date(prev[dateField]).getTime();
              if (diff > 0 && diff < 3600000) { // Max 1 hour
                totalTime += diff;
                responseCount++;
              }
            }
          }
          avgResponseTime = responseCount > 0 ? Math.round(totalTime / responseCount / 1000) : 0;
        }

        // ── Top contacts (for conversations) ──
        let topContacts: { name: string; phone: string; count: number }[] = [];
        if (mod.tipo === "conversaciones") {
          const phoneField = campos.telefono || "telefono";
          const nameCol = campos.nombre_cliente || "nombre_cliente";
          const contactMap: Record<string, { name: string; phone: string; count: number }> = {};
          allRecords.forEach((r: any) => {
            const phone = r[phoneField];
            if (!phone) return;
            if (!contactMap[phone]) {
              contactMap[phone] = { name: r[nameCol] || phone, phone, count: 0 };
            }
            contactMap[phone].count++;
          });
          topContacts = Object.values(contactMap).sort((a, b) => b.count - a.count).slice(0, 6);
        }

        // Calculate change percentage
        const change = prevCount && prevCount > 0
          ? Math.round(((currentCount || 0) - prevCount) / prevCount * 100)
          : null;

        metrics.modules[mod.id] = {
          id: mod.id,
          tipo: mod.tipo,
          nombre: mod.nombre_display,
          total: totalCount || 0,
          current_period: currentCount || 0,
          prev_period: prevCount || 0,
          change,
          daily: dailyData,
          status_distribution: statusDist,
          hourly_heatmap: hourlyData,
          roles_distribution: rolesDist,
          avg_response_time: avgResponseTime,
          top_contacts: topContacts,
        };
      } catch (err: any) {
        console.error(`Metrics error for ${tabla}:`, err.message);
        metrics.modules[mod.id] = {
          id: mod.id,
          tipo: mod.tipo,
          nombre: mod.nombre_display,
          total: 0,
          error: err.message,
        };
      }
    }

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error("Metrics API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
