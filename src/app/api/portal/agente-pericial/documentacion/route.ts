import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { createClient } from "@supabase/supabase-js";

interface ModuleConfig {
  webhook_url: string;
  webhook_completar: string;
  tabla_solicitudes: string;
  tabla_documentos: string;
  columna_storage: string;
  bucket_name: string;
}

async function getModuleConfig(userId: string): Promise<{ config: ModuleConfig; clienteId: string } | null> {
  const adminDb = await createAdminSupabase();
  const { data: portalUser } = await adminDb
    .from("portal_usuarios").select("cliente_id").eq("auth_user_id", userId).single();
  if (!portalUser?.cliente_id) return null;
  const { data: modulo } = await adminDb
    .from("portal_modulos").select("config_visual")
    .eq("cliente_id", portalUser.cliente_id).eq("tipo", "documentacion_pericial").single();
  const cv = modulo?.config_visual || {};
  return {
    config: {
      webhook_url: cv.webhook_url || "",
      webhook_completar: cv.webhook_completar || "",
      tabla_solicitudes: cv.tabla_solicitudes || "solicitudes_documentacion",
      tabla_documentos: cv.tabla_documentos || "documentos_recibidos",
      columna_storage: cv.columna_storage || "url_storage",
      bucket_name: cv.bucket_name || "documentos-periciales",
    },
    clienteId: portalUser.cliente_id,
  };
}

async function getRawClient(clienteId: string) {
  const adminDb = await createAdminSupabase();
  const { data: clientData } = await adminDb
    .from("portal_clientes").select("supabase_url, supabase_key").eq("id", clienteId).single();
  if (!clientData?.supabase_url || !clientData?.supabase_key) throw new Error("Sin credenciales");
  const decryptedKey = decrypt(clientData.supabase_key);
  return {
    client: createClient(clientData.supabase_url, decryptedKey, { auth: { autoRefreshToken: false, persistSession: false } }),
    url: clientData.supabase_url,
    key: decryptedKey,
  };
}

async function getSignedUrl(supabaseUrl: string, serviceKey: string, bucket: string, path: string): Promise<string> {
  try {
    const endpoint = `${supabaseUrl}/storage/v1/object/sign/${bucket}/${path}`;
    console.log("[SIGN] Requesting:", endpoint);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      body: JSON.stringify({ expiresIn: 3600 }),
    });
    const data = await res.json();
    console.log("[SIGN] Response status:", res.status, "data:", JSON.stringify(data));
    if (!res.ok) return "";
    // Supabase puede devolver signedURL o signedUrl
    const signedPath = data.signedURL || data.signedUrl || "";
    return signedPath ? `${supabaseUrl}/storage/v1${signedPath}` : "";
  } catch (e: any) { console.error("[SIGN] Error:", e.message); return ""; }
}

// GET — citas completadas + detalle solicitudes/documentos
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const moduleData = await getModuleConfig(user.id);
    if (!moduleData) return NextResponse.json([], { status: 200 });
    const { config, clienteId } = moduleData;
    const { client: rawClient, url: supabaseUrl, key: serviceKey } = await getRawClient(clienteId);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "citas";

    if (action === "citas") {
      const { data: citas, error } = await rawClient
        .from("citas")
        .select("*, informes_periciales(numero_informe, numero_siniestro, aseguradora, cliente_id), clientes(nombre, telefono)")
        .eq("estado", "COMPLETADA")
        .order("fecha_hora", { ascending: false });
      if (error) throw error;
      return NextResponse.json(citas || []);
    }

    if (action === "detalle") {
      const informeId = searchParams.get("informe_id");
      if (!informeId) return NextResponse.json({ error: "informe_id obligatorio" }, { status: 400 });

      console.log("[DOC DETALLE] tabla_solicitudes:", config.tabla_solicitudes, "tabla_documentos:", config.tabla_documentos, "informe_id:", informeId);

      // Solicitudes con estado real
      const { data: solicitudes, error: e1 } = await rawClient
        .from(config.tabla_solicitudes)
        .select("*")
        .eq("informe_id", informeId)
        .order("creado_en", { ascending: false });
      
      console.log("[DOC DETALLE] Solicitudes result:", solicitudes?.length, "error:", e1?.message);
      if (solicitudes?.length) console.log("[DOC DETALLE] Primera solicitud:", JSON.stringify(solicitudes[0]));
      if (e1) console.error("[DOC DETALLE] Solicitudes error:", e1);

      // Documentos recibidos
      const { data: documentos, error: e2 } = await rawClient
        .from(config.tabla_documentos)
        .select("*")
        .eq("informe_id", informeId)
        .order("creado_en", { ascending: false });
      
      console.log("[DOC DETALLE] Documentos result:", documentos?.length, "error:", e2?.message);
      if (documentos?.length) console.log("[DOC DETALLE] Primer documento keys:", Object.keys(documentos[0]), "documento_tipo:", documentos[0].documento_tipo);
      if (e2) console.error("[DOC DETALLE] Documentos error:", e2);

      // Generar URLs firmadas via REST API
      const docsConUrl = await Promise.all((documentos || []).map(async (doc: any) => {
        let storagePath = doc[config.columna_storage] || "";
        let signedUrl = "";
        if (storagePath) {
          // Si url_storage es una URL completa, extraer solo el path relativo
          const bucketPrefix = `/storage/v1/object/${config.bucket_name}/`;
          const fullPrefix = `${supabaseUrl}${bucketPrefix}`;
          if (storagePath.startsWith("http")) {
            const idx = storagePath.indexOf(bucketPrefix);
            if (idx !== -1) {
              storagePath = storagePath.substring(idx + bucketPrefix.length);
            }
          }
          console.log("[SIGN] Extracted path:", storagePath);
          signedUrl = await getSignedUrl(supabaseUrl, serviceKey, config.bucket_name, storagePath);
        }
        return { ...doc, signed_url: signedUrl };
      }));

      return NextResponse.json({ solicitudes: solicitudes || [], documentos: docsConUrl });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — enviar mensaje al webhook
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const moduleData = await getModuleConfig(user.id);
    if (!moduleData?.config.webhook_url) return NextResponse.json({ error: "Webhook no configurado" }, { status: 400 });

    const body = await request.json();
    const { session_id, message, informe_id, cliente_id, telefono, action: webhookAction } = body;

    // Usar webhook_completar si la acción es completar
    let targetWebhook = moduleData.config.webhook_url;
    let postBody: any = { session_id, message: message || null, informe_id: informe_id || null, cliente_id: cliente_id || null, telefono: telefono || null, action: webhookAction || "chat" };

    if (webhookAction === "completar" && moduleData.config.webhook_completar) {
      targetWebhook = moduleData.config.webhook_completar;
      postBody = { informe_id: informe_id || null };
    }

    if (!targetWebhook) return NextResponse.json({ error: "Webhook no configurado" }, { status: 400 });

    const response = await fetch(targetWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postBody),
    });

    if (!response.ok) throw new Error("N8N error: " + (await response.text()));
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Documentacion POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
