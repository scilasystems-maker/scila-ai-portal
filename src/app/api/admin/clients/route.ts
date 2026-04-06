import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

// GET /api/admin/clients — List all clients
export async function GET() {
  try {
    const supabase = await createAdminSupabase();
    const { data, error } = await supabase
      .from("portal_clientes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    // Don't send encrypted keys to frontend
    const safe = (data || []).map(({ supabase_key, ...rest }: any) => ({
      ...rest,
      has_credentials: !!supabase_key,
    }));

    return NextResponse.json(safe);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/clients — Create a new client
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, nombre, empresa, supabase_url, supabase_key, plan, coste_hora, minutos_por_conv } = body;

    if (!email) {
      return NextResponse.json({ error: "Email es obligatorio" }, { status: 400 });
    }

    const supabase = await createAdminSupabase();

    // Encrypt the service_role key before storing
    const encryptedKey = supabase_key ? encrypt(supabase_key) : null;

    // Create the client record
    const { data: client, error: clientError } = await supabase
      .from("portal_clientes")
      .insert({
        email,
        nombre: nombre || null,
        empresa: empresa || null,
        supabase_url: supabase_url || null,
        supabase_key: encryptedKey,
        plan: plan || "basico",
        estado: "activo",
        coste_hora: coste_hora || 15,
        minutos_por_conv: minutos_por_conv || 5,
      })
      .select()
      .single();

    if (clientError) {
      if (clientError.message.includes("duplicate")) {
        return NextResponse.json({ error: "Ya existe un cliente con ese email" }, { status: 409 });
      }
      throw clientError;
    }

    // Create auth user for the client
    const tempPassword = generateTempPassword();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError && !authError.message.includes("already been registered")) {
      // Rollback client creation if auth fails
      await supabase.from("portal_clientes").delete().eq("id", client.id);
      throw authError;
    }

    const authUserId = authData?.user?.id;

    // Create portal user for the client owner
    if (authUserId) {
      const { error: userError } = await supabase
        .from("portal_usuarios")
        .insert({
          auth_user_id: authUserId,
          cliente_id: client.id,
          email,
          nombre: nombre || null,
          rol_global: "client_owner",
          rol_cliente: "owner",
          preferencias: { tema: "dark", notif_email: true, idioma: "es" },
          zona_horaria: "Europe/Madrid",
          activo: true,
        });

      if (userError) {
        console.error("Error creating portal user:", userError);
      }
    }

    return NextResponse.json({
      ...client,
      supabase_key: undefined,
      has_credentials: !!encryptedKey,
      temp_password: tempPassword,
      auth_user_id: authUserId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/clients — Delete a client
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID es obligatorio" }, { status: 400 });
    }

    const supabase = await createAdminSupabase();

    // Get client email to delete auth user
    const { data: client } = await supabase
      .from("portal_clientes")
      .select("email")
      .eq("id", id)
      .single();

    // Delete portal users for this client
    await supabase.from("portal_usuarios").delete().eq("cliente_id", id);

    // Delete modules for this client
    await supabase.from("portal_modulos").delete().eq("cliente_id", id);

    // Delete the client
    const { error } = await supabase.from("portal_clientes").delete().eq("id", id);
    if (error) throw error;

    // Try to delete auth user
    if (client?.email) {
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const authUser = users.find((u: any) => u.email === client.email);
      if (authUser) {
        await supabase.auth.admin.deleteUser(authUser.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/clients — Update a client
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, supabase_key, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "ID es obligatorio" }, { status: 400 });
    }

    const supabase = await createAdminSupabase();

    // If updating supabase_key, encrypt it
    if (supabase_key) {
      updates.supabase_key = encrypt(supabase_key);
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("portal_clientes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      ...data,
      supabase_key: undefined,
      has_credentials: !!data.supabase_key,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
