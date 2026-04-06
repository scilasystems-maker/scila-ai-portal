import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/encryption";

// GET /api/portal/data?module_id=xxx&page=1&limit=50&search=xxx&filter_field=xxx&filter_value=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get("module_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const filterField = searchParams.get("filter_field") || "";
    const filterValue = searchParams.get("filter_value") || "";
    const sortField = searchParams.get("sort") || "";
    const sortDir = searchParams.get("dir") || "desc";

    if (!moduleId) {
      return NextResponse.json({ error: "module_id es obligatorio" }, { status: 400 });
    }

    // Auth check
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const adminDb = await createAdminSupabase();

    // Get portal user
    const { data: portalUser } = await adminDb
      .from("portal_usuarios")
      .select("cliente_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!portalUser?.cliente_id) {
      return NextResponse.json({ error: "Sin cliente asignado" }, { status: 403 });
    }

    // Get module config
    const { data: modulo } = await adminDb
      .from("portal_modulos")
      .select("*")
      .eq("id", moduleId)
      .eq("cliente_id", portalUser.cliente_id)
      .single();

    if (!modulo) {
      return NextResponse.json({ error: "Módulo no encontrado" }, { status: 404 });
    }

    // Get client credentials
    const { data: client } = await adminDb
      .from("portal_clientes")
      .select("supabase_url, supabase_key")
      .eq("id", portalUser.cliente_id)
      .single();

    if (!client?.supabase_url || !client?.supabase_key) {
      return NextResponse.json({ error: "Credenciales del cliente no configuradas" }, { status: 500 });
    }

    // Connect to client's Supabase
    const decryptedKey = decrypt(client.supabase_key);
    const clientDb = createClient(client.supabase_url, decryptedKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Build query
    const tableName = modulo.tabla_origen;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = clientDb.from(tableName).select("*", { count: "exact" });

    // Apply search if provided
    if (search && modulo.mapeo_campos) {
      const searchFields = Object.values(modulo.mapeo_campos).filter(Boolean) as string[];
      if (searchFields.length > 0) {
        const orConditions = searchFields
          .map((field: string) => `${field}.ilike.%${search}%`)
          .join(",");
        query = query.or(orConditions);
      }
    }

    // Apply filter
    if (filterField && filterValue) {
      query = query.eq(filterField, filterValue);
    }

    // Apply sort
    if (sortField) {
      query = query.order(sortField, { ascending: sortDir === "asc" });
    } else {
      // Default sort by most recent
      const dateField = modulo.mapeo_campos?.fecha || modulo.mapeo_campos?.created_at || "created_at";
      query = query.order(dateField, { ascending: false });
    }

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Data fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
      modulo: {
        id: modulo.id,
        tipo: modulo.tipo,
        nombre_display: modulo.nombre_display,
        mapeo_campos: modulo.mapeo_campos,
        config_visual: modulo.config_visual,
        permite_crear: modulo.permite_crear,
        permite_editar: modulo.permite_editar,
        permite_eliminar: modulo.permite_eliminar,
      },
    });
  } catch (error: any) {
    console.error("Portal data error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/portal/data — Create a record in client's table
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { module_id, record } = body;

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const adminDb = await createAdminSupabase();

    const { data: portalUser } = await adminDb
      .from("portal_usuarios")
      .select("cliente_id")
      .eq("auth_user_id", user.id)
      .single();

    const { data: modulo } = await adminDb
      .from("portal_modulos")
      .select("*")
      .eq("id", module_id)
      .eq("cliente_id", portalUser?.cliente_id)
      .single();

    if (!modulo?.permite_crear) {
      return NextResponse.json({ error: "No tienes permiso para crear" }, { status: 403 });
    }

    const { data: client } = await adminDb
      .from("portal_clientes")
      .select("supabase_url, supabase_key")
      .eq("id", portalUser?.cliente_id)
      .single();

    const decryptedKey = decrypt(client!.supabase_key!);
    const clientDb = createClient(client!.supabase_url!, decryptedKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await clientDb
      .from(modulo.tabla_origen)
      .insert(record)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/portal/data — Update a record
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { module_id, record_id, updates } = body;

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const adminDb = await createAdminSupabase();

    const { data: portalUser } = await adminDb
      .from("portal_usuarios")
      .select("cliente_id")
      .eq("auth_user_id", user.id)
      .single();

    const { data: modulo } = await adminDb
      .from("portal_modulos")
      .select("*")
      .eq("id", module_id)
      .eq("cliente_id", portalUser?.cliente_id)
      .single();

    if (!modulo?.permite_editar) {
      return NextResponse.json({ error: "No tienes permiso para editar" }, { status: 403 });
    }

    const { data: client } = await adminDb
      .from("portal_clientes")
      .select("supabase_url, supabase_key")
      .eq("id", portalUser?.cliente_id)
      .single();

    const decryptedKey = decrypt(client!.supabase_key!);
    const clientDb = createClient(client!.supabase_url!, decryptedKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await clientDb
      .from(modulo.tabla_origen)
      .update(updates)
      .eq("id", record_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/portal/data
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get("module_id");
    const recordId = searchParams.get("record_id");

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const adminDb = await createAdminSupabase();

    const { data: portalUser } = await adminDb
      .from("portal_usuarios")
      .select("cliente_id")
      .eq("auth_user_id", user.id)
      .single();

    const { data: modulo } = await adminDb
      .from("portal_modulos")
      .select("*")
      .eq("id", moduleId)
      .eq("cliente_id", portalUser?.cliente_id)
      .single();

    if (!modulo?.permite_eliminar) {
      return NextResponse.json({ error: "No tienes permiso para eliminar" }, { status: 403 });
    }

    const { data: client } = await adminDb
      .from("portal_clientes")
      .select("supabase_url, supabase_key")
      .eq("id", portalUser?.cliente_id)
      .single();

    const decryptedKey = decrypt(client!.supabase_key!);
    const clientDb = createClient(client!.supabase_url!, decryptedKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await clientDb
      .from(modulo.tabla_origen)
      .delete()
      .eq("id", recordId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
