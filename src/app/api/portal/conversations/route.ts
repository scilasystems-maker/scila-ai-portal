import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/encryption";

// Helper to get client's Supabase connection
async function getClientConnection(userId: string) {
  const adminDb = await createAdminSupabase();

  const { data: portalUser } = await adminDb
    .from("portal_usuarios")
    .select("cliente_id")
    .eq("auth_user_id", userId)
    .single();

  if (!portalUser?.cliente_id) throw new Error("Sin cliente asignado");

  // Find conversation module
  const { data: modulo } = await adminDb
    .from("portal_modulos")
    .select("*")
    .eq("cliente_id", portalUser.cliente_id)
    .eq("tipo", "conversaciones")
    .single();

  if (!modulo) throw new Error("Módulo de conversaciones no configurado");

  const { data: client } = await adminDb
    .from("portal_clientes")
    .select("supabase_url, supabase_key")
    .eq("id", portalUser.cliente_id)
    .single();

  if (!client?.supabase_url || !client?.supabase_key) {
    throw new Error("Credenciales del cliente no configuradas");
  }

  const decryptedKey = decrypt(client.supabase_key);
  const clientDb = createClient(client.supabase_url, decryptedKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { clientDb, modulo, supabaseUrl: client.supabase_url, supabaseKey: decryptedKey };
}

// GET /api/portal/conversations?action=contacts|messages&phone=xxx&search=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "contacts";

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { clientDb, modulo } = await getClientConnection(user.id);
    const tabla = modulo.tabla_origen;
    const campos = modulo.mapeo_campos;

    const phoneField = campos.telefono || "telefono";
    const nameField = campos.nombre_cliente || "nombre_cliente";
    const messageField = campos.mensaje || "mensaje";
    const roleField = campos.rol || "rol";
    const dateField = campos.created_at || "created_at";
    const sessionField = campos.session_id || "session_id";

    if (action === "contacts") {
      const search = searchParams.get("search") || "";

      // Get all unique contacts with their last message
      // We need to get conversations grouped by phone number
      const { data: allMessages, error } = await clientDb
        .from(tabla)
        .select("*")
        .order(dateField, { ascending: false });

      if (error) throw new Error(error.message);

      // Group by phone and get last message + count
      const contactMap = new Map<string, any>();

      (allMessages || []).forEach((msg: any) => {
        const phone = msg[phoneField];
        if (!phone) return;

        if (!contactMap.has(phone)) {
          contactMap.set(phone, {
            phone,
            name: msg[nameField] || phone,
            last_message: msg[messageField] || "",
            last_date: msg[dateField],
            last_role: msg[roleField],
            message_count: 0,
            session_id: msg[sessionField],
          });
        }

        const contact = contactMap.get(phone)!;
        contact.message_count++;

        // Update last message if this is newer
        if (msg[dateField] > contact.last_date) {
          contact.last_message = msg[messageField] || "";
          contact.last_date = msg[dateField];
          contact.last_role = msg[roleField];
        }
      });

      let contacts = Array.from(contactMap.values());

      // Sort by most recent
      contacts.sort((a, b) => {
        if (!a.last_date) return 1;
        if (!b.last_date) return -1;
        return new Date(b.last_date).getTime() - new Date(a.last_date).getTime();
      });

      // Filter by search
      if (search) {
        const s = search.toLowerCase();
        contacts = contacts.filter(c =>
          c.name?.toLowerCase().includes(s) ||
          c.phone?.toLowerCase().includes(s) ||
          c.last_message?.toLowerCase().includes(s)
        );
      }

      return NextResponse.json({
        contacts,
        total: contacts.length,
        tabla,
        config: { phoneField, nameField, messageField, roleField, dateField, sessionField },
      });

    } else if (action === "messages") {
      const phone = searchParams.get("phone");
      const beforeDate = searchParams.get("before"); // For pagination
      const limit = parseInt(searchParams.get("limit") || "50");

      if (!phone) {
        return NextResponse.json({ error: "phone es obligatorio" }, { status: 400 });
      }

      // @ts-expect-error - dynamic table names cause deep type inference
      const { data: messages, error } = await clientDb
        .from(tabla)
        .select("*")
        .eq(phoneField, phone as any)
        .order(dateField, { ascending: true } as any)
        .limit(limit);
      if (error) throw new Error(error.message);

      return NextResponse.json({
        messages: messages || [],
        phone,
        config: { phoneField, nameField, messageField, roleField, dateField, sessionField },
      });
    }

    return NextResponse.json({ error: "action inválida" }, { status: 400 });
  } catch (error: any) {
    console.error("Conversations error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
