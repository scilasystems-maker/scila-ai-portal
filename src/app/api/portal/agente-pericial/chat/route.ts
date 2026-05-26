import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";

const FALLBACK_WEBHOOK = process.env.N8N_AGENTE_PERICIAL_URL || "https://scilaai-n8n.l5wzcm.easypanel.host/webhook/agente-pericial-chat";

async function getWebhookUrl(userId: string): Promise<string> {
  const adminDb = await createAdminSupabase();

  // Obtener cliente_id del usuario
  const { data: portalUser } = await adminDb
    .from("portal_usuarios")
    .select("cliente_id")
    .eq("auth_user_id", userId)
    .single();

  if (!portalUser?.cliente_id) return FALLBACK_WEBHOOK;

  // Buscar el módulo agente_pericial de este cliente
  const { data: modulo } = await adminDb
    .from("portal_modulos")
    .select("config_visual")
    .eq("cliente_id", portalUser.cliente_id)
    .eq("tipo", "agente_pericial")
    .single();

  // Leer webhook_url del config_visual del módulo
  const webhookUrl = modulo?.config_visual?.webhook_url;
  return webhookUrl || FALLBACK_WEBHOOK;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await request.json();
    const { messages, sessionId, pdf, pdfName } = body;
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user");
    const messageText = pdf ? "" : (lastUserMessage?.content || "");

    // Obtener webhook dinámico del módulo del cliente
    const webhookUrl = await getWebhookUrl(user.id);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        message: messageText,
        pdf_base64: pdf || null,
        pdf_name: pdfName || null,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`N8N error: ${err}`);
    }

    const data = await response.json();
    return NextResponse.json({
      reply: data.reply,
      fase: data.fase || null,
      informeCreado: data.informeCreado || false,
      numeroInforme: data.numeroInforme || null,
    });
  } catch (error: any) {
    console.error("Chat agente error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
