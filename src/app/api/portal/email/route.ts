import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const adminDb = await createAdminSupabase();
    const { data: portalUser } = await adminDb.from("portal_usuarios").select("cliente_id").eq("auth_user_id", user.id).single();
    if (!portalUser?.cliente_id) return NextResponse.json({ error: "Sin cliente" }, { status: 403 });
    const { data: accounts, error } = await adminDb.from("portal_email_accounts")
      .select("id, nombre, email, imap_host, imap_port, smtp_host, smtp_port, smtp_secure, usuario, activo, ultimo_sync, created_at")
      .eq("cliente_id", portalUser.cliente_id).order("created_at");
    if (error) throw error;
    return NextResponse.json({ accounts: accounts || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const adminDb = await createAdminSupabase();
    const { data: portalUser } = await adminDb.from("portal_usuarios").select("id, cliente_id").eq("auth_user_id", user.id).single();
    if (!portalUser?.cliente_id) return NextResponse.json({ error: "Sin cliente" }, { status: 403 });
    const body = await request.json();
    const { id, nombre, email, imap_host, imap_port, smtp_host, smtp_port, smtp_secure, usuario, password } = body;
    if (!email || !imap_host || !smtp_host || !usuario) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    const record: Record<string, any> = {
      cliente_id: portalUser.cliente_id, nombre: nombre || email, email, imap_host,
      imap_port: imap_port || 993, smtp_host, smtp_port: smtp_port || 465,
      smtp_secure: smtp_secure !== false, usuario, updated_at: new Date().toISOString(),
    };
    if (password) record.password_encrypted = encrypt(password);
    if (id) {
      const { data, error } = await adminDb.from("portal_email_accounts").update(record).eq("id", id).eq("cliente_id", portalUser.cliente_id).select("id, nombre, email").single();
      if (error) throw error;
      return NextResponse.json({ account: data, message: "Cuenta actualizada" });
    } else {
      if (!password) return NextResponse.json({ error: "Contraseña obligatoria" }, { status: 400 });
      record.created_by = portalUser.id;
      const { data, error } = await adminDb.from("portal_email_accounts").insert(record).select("id, nombre, email").single();
      if (error) throw error;
      return NextResponse.json({ account: data, message: "Cuenta creada" });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("id");
    if (!accountId) return NextResponse.json({ error: "id obligatorio" }, { status: 400 });
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const adminDb = await createAdminSupabase();
    const { data: portalUser } = await adminDb.from("portal_usuarios").select("cliente_id").eq("auth_user_id", user.id).single();
    if (!portalUser?.cliente_id) return NextResponse.json({ error: "Sin cliente" }, { status: 403 });
    const { error } = await adminDb.from("portal_email_accounts").delete().eq("id", accountId).eq("cliente_id", portalUser.cliente_id);
    if (error) throw error;
    return NextResponse.json({ message: "Cuenta eliminada" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
