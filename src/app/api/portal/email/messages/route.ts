import { NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParseEmail } from "./email-parser";

async function getAccount(accountId: string, clienteId: string) {
  const adminDb = await createAdminSupabase();
  const { data, error } = await adminDb.from("portal_email_accounts")
    .select("*").eq("id", accountId).eq("cliente_id", clienteId).single();
  if (error || !data) throw new Error("Cuenta no encontrada");
  return { ...data, password: decrypt(data.password_encrypted) };
}

async function getImap(account: any): Promise<ImapFlow> {
  const client = new ImapFlow({
    host: account.imap_host, port: account.imap_port || 993,
    secure: account.imap_port === 993,
    auth: { user: account.usuario, pass: account.password },
    logger: false,
  });
  await client.connect();
  return client;
}

function parseAddr(addr: any): { name: string; email: string }[] {
  if (!addr) return [];
  if (Array.isArray(addr)) return addr.map(a => ({ name: a.name || "", email: a.address || a.email || "" }));
  if (addr.value && Array.isArray(addr.value)) return addr.value.map((a: any) => ({ name: a.name || "", email: a.address || "" }));
  return [{ name: addr.name || "", email: addr.address || addr.email || String(addr) }];
}

async function auth(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const adminDb = await createAdminSupabase();
  const { data: pu } = await adminDb.from("portal_usuarios").select("cliente_id").eq("auth_user_id", user.id).single();
  if (!pu?.cliente_id) throw new Error("Sin cliente");
  return pu.cliente_id;
}

export async function GET(request: Request) {
  try {
    const clienteId = await auth(request);
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";
    const accountId = searchParams.get("account_id");
    if (!accountId) return NextResponse.json({ error: "account_id obligatorio" }, { status: 400 });
    const account = await getAccount(accountId, clienteId);

    if (action === "folders") {
      const client = await getImap(account);
      try {
        const folders: any[] = [];
        const tree = await client.listTree();
        function walk(items: any[]) {
          for (const item of items) {
            folders.push({ name: item.name, path: item.path || item.name, specialUse: item.specialUse || null });
            if (item.folders?.length) walk(item.folders);
          }
        }
        walk(tree.folders || []);
        return NextResponse.json({ folders });
      } finally { await client.logout(); }
    }

    if (action === "list") {
      const folder = searchParams.get("folder") || "INBOX";
      const pg = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "30");
      const client = await getImap(account);
      try {
        const lock = await client.getMailboxLock(folder);
        try {
          const total = client.mailbox?.exists || 0;
          if (total === 0) return NextResponse.json({ messages: [], total: 0, page: pg, pages: 0 });
          const start = Math.max(1, total - (pg * limit) + 1);
          const end = Math.max(1, total - ((pg - 1) * limit));
          const messages: any[] = [];
          for await (const msg of client.fetch(`${start}:${end}`, { envelope: true, flags: true, uid: true })) {
            messages.push({
              uid: msg.uid, flags: Array.from(msg.flags || []),
              seen: msg.flags?.has("\\Seen") || false, flagged: msg.flags?.has("\\Flagged") || false,
              date: msg.envelope?.date?.toISOString() || null,
              subject: msg.envelope?.subject || "(Sin asunto)",
              from: parseAddr(msg.envelope?.from), to: parseAddr(msg.envelope?.to),
              cc: parseAddr(msg.envelope?.cc), messageId: msg.envelope?.messageId || null,
            });
          }
          messages.sort((a, b) => (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0));
          return NextResponse.json({ messages, total, page: pg, pages: Math.ceil(total / limit) });
        } finally { lock.release(); }
      } finally { await client.logout(); }
    }

    if (action === "read") {
      const uid = searchParams.get("uid");
      const folder = searchParams.get("folder") || "INBOX";
      if (!uid) return NextResponse.json({ error: "uid obligatorio" }, { status: 400 });
      const client = await getImap(account);
      try {
        const lock = await client.getMailboxLock(folder);
        try {
          await client.messageFlagsAdd({ uid: parseInt(uid) }, ["\\Seen"], { uid: true });
          const msg = await client.fetchOne(uid, { envelope: true, source: true, flags: true, uid: true }, { uid: true });
          let htmlBody = "", textBody = "";
          let attachments: any[] = [];
          if (msg.source) {
            const parsed = simpleParseEmail(msg.source.toString());
            htmlBody = parsed.html; textBody = parsed.text; attachments = parsed.attachments;
          }
          return NextResponse.json({
            uid: msg.uid, flags: Array.from(msg.flags || []),
            subject: msg.envelope?.subject || "(Sin asunto)",
            from: parseAddr(msg.envelope?.from), to: parseAddr(msg.envelope?.to),
            cc: parseAddr(msg.envelope?.cc), date: msg.envelope?.date?.toISOString() || null,
            messageId: msg.envelope?.messageId || null, html: htmlBody, text: textBody, attachments,
          });
        } finally { lock.release(); }
      } finally { await client.logout(); }
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const clienteId = await auth(request);
    const body = await request.json();
    const { action, account_id } = body;
    if (!account_id) return NextResponse.json({ error: "account_id obligatorio" }, { status: 400 });
    const account = await getAccount(account_id, clienteId);

    if (action === "send") {
      const { to, cc, bcc, subject, html, text, inReplyTo, references } = body;
      if (!to) return NextResponse.json({ error: "Destinatario obligatorio" }, { status: 400 });
      const transport = nodemailer.createTransport({
        host: account.smtp_host, port: account.smtp_port || 465,
        secure: account.smtp_secure !== false,
        auth: { user: account.usuario, pass: account.password },
      });
      const mailOpts: Record<string, any> = { from: `"${account.nombre || account.email}" <${account.email}>`, to, subject: subject || "(Sin asunto)" };
      if (cc) mailOpts.cc = cc;
      if (bcc) mailOpts.bcc = bcc;
      if (html) mailOpts.html = html;
      if (text) mailOpts.text = text;
      if (!html && !text) mailOpts.text = "";
      if (inReplyTo) mailOpts.inReplyTo = inReplyTo;
      if (references) mailOpts.references = references;
      const info = await transport.sendMail(mailOpts);
      return NextResponse.json({ success: true, messageId: info.messageId });
    }

    if (action === "delete") {
      const { uid, folder } = body;
      if (!uid || !folder) return NextResponse.json({ error: "uid y folder obligatorios" }, { status: 400 });
      const client = await getImap(account);
      try {
        const lock = await client.getMailboxLock(folder);
        try {
          const tree = await client.listTree();
          let trashPath = "";
          function findTrash(items: any[]) { for (const item of items) { if (item.specialUse === "\\Trash" || ["trash", "papelera"].includes((item.name || "").toLowerCase())) { trashPath = item.path; return; } if (item.folders) findTrash(item.folders); } }
          findTrash(tree.folders || []);
          if (trashPath && folder !== trashPath) { await client.messageMove({ uid }, trashPath, { uid: true }); }
          else { await client.messageFlagsAdd({ uid }, ["\\Deleted"], { uid: true }); await client.expunge({ uid }); }
        } finally { lock.release(); }
        return NextResponse.json({ success: true });
      } finally { await client.logout(); }
    }

    if (action === "move") {
      const { uid, from_folder, to_folder } = body;
      if (!uid || !from_folder || !to_folder) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
      const client = await getImap(account);
      try {
        const lock = await client.getMailboxLock(from_folder);
        try { await client.messageMove({ uid }, to_folder, { uid: true }); } finally { lock.release(); }
        return NextResponse.json({ success: true });
      } finally { await client.logout(); }
    }

    if (action === "flag") {
      const { uid, folder, flag, add } = body;
      if (!uid || !folder || !flag) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
      const client = await getImap(account);
      try {
        const lock = await client.getMailboxLock(folder);
        try {
          if (add) await client.messageFlagsAdd({ uid }, [flag], { uid: true });
          else await client.messageFlagsRemove({ uid }, [flag], { uid: true });
        } finally { lock.release(); }
        return NextResponse.json({ success: true });
      } finally { await client.logout(); }
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
