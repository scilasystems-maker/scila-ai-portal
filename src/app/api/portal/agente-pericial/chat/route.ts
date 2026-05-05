import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

const N8N_WEBHOOK = process.env.N8N_AGENTE_PERICIAL_URL || "https://scilaai-n8n.l5wzcm.easypanel.host/webhook/agente-pericial-chat";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = await request.json();
    const { messages, sessionId, pdf, pdfName } = body;

    // Reenviar a N8N
    const response = await fetch(N8N_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message: messages[messages.length - 2]?.content || "", pdf_base64: pdf || null, pdf_name: pdfName || null }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`N8N error: ${err}`);
    }

    const data = await response.json();
    return NextResponse.json({ reply: data.reply, informeCreado: data.informeCreado || false });
  } catch (error: any) {
    console.error("Chat agente error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
