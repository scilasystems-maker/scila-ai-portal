import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This endpoint creates the initial super_admin user
// It should only be called ONCE during setup
// POST /api/auth/setup with { secret: "scila_setup_2026" }

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Simple secret to prevent unauthorized setup
    if (body.secret !== "scila_setup_2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const adminEmail = "Scilasystems@gmail.com";
    const adminPassword = "Scilaexito@698";

    // Check if admin already exists
    const { data: existingUser } = await supabaseAdmin
      .from("portal_usuarios")
      .select("id")
      .eq("email", adminEmail)
      .single();

    if (existingUser) {
      return NextResponse.json({ message: "Admin already exists", id: existingUser.id });
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Skip email confirmation
    });

    if (authError) {
      // If user exists in auth but not in portal_usuarios
      if (authError.message.includes("already been registered")) {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuthUser = users.find((u: any) => u.email === adminEmail);

        if (existingAuthUser) {
          // Create portal user linked to existing auth user
          const { data: portalUser, error: portalError } = await supabaseAdmin
            .from("portal_usuarios")
            .insert({
              auth_user_id: existingAuthUser.id,
              email: adminEmail,
              nombre: "Admin SCILA",
              rol_global: "super_admin",
              rol_cliente: null,
              cliente_id: null,
              preferencias: { tema: "dark", notif_email: true, idioma: "es" },
              zona_horaria: "Europe/Madrid",
              activo: true,
            })
            .select()
            .single();

          if (portalError) {
            return NextResponse.json({ error: portalError.message }, { status: 500 });
          }

          return NextResponse.json({
            message: "Admin portal user created (auth user already existed)",
            id: portalUser.id,
          });
        }
      }
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Create portal user
    const { data: portalUser, error: portalError } = await supabaseAdmin
      .from("portal_usuarios")
      .insert({
        auth_user_id: authData.user.id,
        email: adminEmail,
        nombre: "Admin SCILA",
        rol_global: "super_admin",
        rol_cliente: null,
        cliente_id: null,
        preferencias: { tema: "dark", notif_email: true, idioma: "es" },
        zona_horaria: "Europe/Madrid",
        activo: true,
      })
      .select()
      .single();

    if (portalError) {
      return NextResponse.json({ error: portalError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Admin created successfully",
      auth_user_id: authData.user.id,
      portal_user_id: portalUser.id,
      email: adminEmail,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
