"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/shared/Header";
import {
  Mail, Inbox, Send, Trash2, Star, Archive, FolderOpen, Plus,
  Loader2, RefreshCw, ChevronLeft, Paperclip, X,
  Reply, ReplyAll, Forward, ArrowLeft, Settings,
  AlertCircle, CheckCircle, Eye, EyeOff, Pen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailAccount { id: string; nombre: string; email: string; imap_host: string; imap_port: number; smtp_host: string; smtp_port: number; smtp_secure: boolean; usuario: string; activo: boolean; }
interface EmailFolder { name: string; path: string; specialUse: string | null; }
interface EmailMessage { uid: number; flags: string[]; seen: boolean; flagged: boolean; date: string; subject: string; from: { name: string; email: string }[]; to: { name: string; email: string }[]; cc: { name: string; email: string }[]; messageId: string | null; html?: string; text?: string; attachments?: { filename: string; contentType: string; size: number }[]; }

const PRESETS: Record<string, { imap_host: string; imap_port: number; smtp_host: string; smtp_port: number; smtp_secure: boolean }> = {
  gmail: { imap_host: "imap.gmail.com", imap_port: 993, smtp_host: "smtp.gmail.com", smtp_port: 465, smtp_secure: true },
  outlook: { imap_host: "outlook.office365.com", imap_port: 993, smtp_host: "smtp.office365.com", smtp_port: 587, smtp_secure: false },
  ionos: { imap_host: "imap.ionos.es", imap_port: 993, smtp_host: "smtp.ionos.es", smtp_port: 465, smtp_secure: true },
  yahoo: { imap_host: "imap.mail.yahoo.com", imap_port: 993, smtp_host: "smtp.mail.yahoo.com", smtp_port: 465, smtp_secure: true },
  custom: { imap_host: "", imap_port: 993, smtp_host: "", smtp_port: 465, smtp_secure: true },
};

function getFolderLabel(f: EmailFolder): string {
  if (f.name === "INBOX") return "Bandeja de entrada";
  if (f.specialUse === "\\Sent" || f.name.toLowerCase() === "sent") return "Enviados";
  if (f.specialUse === "\\Trash" || f.name.toLowerCase() === "trash") return "Papelera";
  if (f.specialUse === "\\Drafts" || f.name.toLowerCase() === "drafts") return "Borradores";
  if (f.specialUse === "\\Junk" || f.name.toLowerCase() === "spam" || f.name.toLowerCase() === "junk") return "Spam";
  return f.name;
}
function getFolderIcon(f: EmailFolder) {
  if (f.name === "INBOX") return Inbox;
  if (f.specialUse === "\\Sent" || f.name.toLowerCase().includes("sent")) return Send;
  if (f.specialUse === "\\Trash" || f.name.toLowerCase().includes("trash")) return Trash2;
  if (f.specialUse === "\\Drafts" || f.name.toLowerCase().includes("draft")) return Pen;
  if (f.specialUse === "\\Junk" || f.name.toLowerCase().includes("spam")) return Archive;
  return FolderOpen;
}
function fmtDate(d: string) { if (!d) return ""; const dt = new Date(d), now = new Date(), diff = (now.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24); if (diff < 1 && dt.getDate() === now.getDate()) return dt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }); if (diff < 7) return dt.toLocaleDateString("es-ES", { weekday: "short", hour: "2-digit", minute: "2-digit" }); return dt.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }); }
function fmtFullDate(d: string) { if (!d) return ""; return new Date(d).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }); }

export default function EmailPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selAccount, setSelAccount] = useState<EmailAccount | null>(null);
  const [folders, setFolders] = useState<EmailFolder[]>([]);
  const [selFolder, setSelFolder] = useState("INBOX");
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selMsg, setSelMsg] = useState<EmailMessage | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<"list" | "read" | "compose" | "accounts">("list");
  const [showForm, setShowForm] = useState(false);
  const [cTo, setCTo] = useState(""); const [cCc, setCCc] = useState(""); const [cSubject, setCSubject] = useState(""); const [cBody, setCBody] = useState(""); const [cReplyTo, setCReplyTo] = useState<string | null>(null); const [cRefs, setCRefs] = useState<string | null>(null);
  const [fp, setFp] = useState("custom"); const [fNombre, setFNombre] = useState(""); const [fEmail, setFEmail] = useState(""); const [fImapH, setFImapH] = useState(""); const [fImapP, setFImapP] = useState(993); const [fSmtpH, setFSmtpH] = useState(""); const [fSmtpP, setFSmtpP] = useState(465); const [fSecure, setFSecure] = useState(true); const [fUser, setFUser] = useState(""); const [fPass, setFPass] = useState(""); const [fShowPass, setFShowPass] = useState(false); const [fTesting, setFTesting] = useState(false); const [fTestRes, setFTestRes] = useState<{ success: boolean; message: string } | null>(null); const [fSaving, setFSaving] = useState(false); const [editId, setEditId] = useState<string | null>(null);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAccounts(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (selAccount) { loadFolders(); setSelFolder("INBOX"); setPage(1); } }, [selAccount?.id]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (selAccount && selFolder) loadMessages(); }, [selAccount?.id, selFolder, page]);

  const loadAccounts = async () => { try { const r = await fetch("/api/portal/email"); const d = await r.json(); if (!r.ok) throw new Error(d.error); setAccounts(d.accounts || []); if (d.accounts?.length > 0 && !selAccount) setSelAccount(d.accounts[0]); else if (!d.accounts?.length) { setView("accounts"); setShowForm(true); } } catch (e) { console.error(e); } finally { setLoading(false); } };
  const loadFolders = async () => { if (!selAccount) return; try { const r = await fetch(`/api/portal/email/messages?action=folders&account_id=${selAccount.id}`); const d = await r.json(); if (r.ok) setFolders(d.folders || []); } catch (e) { console.error(e); } };
  const loadMessages = async () => { if (!selAccount) return; setLoadingMsgs(true); try { const p2 = new URLSearchParams({ action: "list", account_id: selAccount.id, folder: selFolder, page: page.toString(), limit: "30" }); const r = await fetch(`/api/portal/email/messages?${p2}`); const d = await r.json(); if (!r.ok) throw new Error(d.error); setMessages(d.messages || []); setTotal(d.total || 0); setPages(d.pages || 0); } catch (e) { console.error(e); } finally { setLoadingMsgs(false); } };
  const readMessage = async (msg: EmailMessage) => { if (!selAccount) return; setLoadingMsg(true); setView("read"); try { const p2 = new URLSearchParams({ action: "read", account_id: selAccount.id, folder: selFolder, uid: msg.uid.toString() }); const r = await fetch(`/api/portal/email/messages?${p2}`); const d = await r.json(); if (!r.ok) throw new Error(d.error); setSelMsg(d); setMessages(prev => prev.map(m => m.uid === msg.uid ? { ...m, seen: true } : m)); } catch (e: any) { alert(e.message); } finally { setLoadingMsg(false); } };

  const handleSend = async () => { if (!selAccount || !cTo.trim()) return; setSending(true); try { const r = await fetch("/api/portal/email/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", account_id: selAccount.id, to: cTo, cc: cCc || undefined, subject: cSubject, html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.6">${cBody.replace(/\n/g, "<br>")}</div>`, text: cBody, inReplyTo: cReplyTo, references: cRefs }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); resetCompose(); setView("list"); loadMessages(); } catch (e: any) { alert("Error: " + e.message); } finally { setSending(false); } };
  const resetCompose = () => { setCTo(""); setCCc(""); setCSubject(""); setCBody(""); setCReplyTo(null); setCRefs(null); };
  const handleReply = (msg: EmailMessage, all = false) => { setCTo(msg.from?.[0]?.email || ""); if (all && msg.cc?.length) setCCc(msg.cc.map(c => c.email).join(", ")); setCSubject(msg.subject?.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`); setCBody(`\n\n--- ${msg.from?.[0]?.name || msg.from?.[0]?.email} escribió ---\n\n`); setCReplyTo(msg.messageId); setCRefs(msg.messageId); setView("compose"); };
  const handleForward = (msg: EmailMessage) => { setCTo(""); setCSubject(msg.subject?.startsWith("Fwd:") ? msg.subject : `Fwd: ${msg.subject}`); setCBody(`\n\n---------- Mensaje reenviado ----------\nDe: ${msg.from?.[0]?.name || ""} <${msg.from?.[0]?.email || ""}>\nAsunto: ${msg.subject}\n\n${msg.text || ""}`); setView("compose"); };
  const handleDelete = async (msg: EmailMessage) => { if (!selAccount || !confirm("Eliminar este correo?")) return; try { await fetch("/api/portal/email/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", account_id: selAccount.id, uid: msg.uid, folder: selFolder }) }); setView("list"); setSelMsg(null); loadMessages(); } catch (e: any) { alert(e.message); } };
  const handleToggleFlag = async (msg: EmailMessage) => { if (!selAccount) return; try { await fetch("/api/portal/email/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "flag", account_id: selAccount.id, uid: msg.uid, folder: selFolder, flag: "\\Flagged", add: !msg.flagged }) }); setMessages(prev => prev.map(m => m.uid === msg.uid ? { ...m, flagged: !m.flagged } : m)); } catch (e) { console.error(e); } };

  const applyPreset = (p: string) => { setFp(p); const v = PRESETS[p]; if (v) { setFImapH(v.imap_host); setFImapP(v.imap_port); setFSmtpH(v.smtp_host); setFSmtpP(v.smtp_port); setFSecure(v.smtp_secure); } };
  const testConn = async () => { setFTesting(true); setFTestRes(null); try { const r = await fetch("/api/portal/email/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ smtp_host: fSmtpH, smtp_port: fSmtpP, smtp_secure: fSecure, usuario: fUser, password: fPass }) }); const d = await r.json(); setFTestRes({ success: d.success, message: d.success ? "Conexión exitosa" : d.error }); } catch (e: any) { setFTestRes({ success: false, message: e.message }); } finally { setFTesting(false); } };
  const saveAccount = async () => { if (!fEmail || !fImapH || !fSmtpH || !fUser || (!fPass && !editId)) { alert("Completa todos los campos"); return; } setFSaving(true); try { const b: Record<string, any> = { nombre: fNombre || fEmail, email: fEmail, imap_host: fImapH, imap_port: fImapP, smtp_host: fSmtpH, smtp_port: fSmtpP, smtp_secure: fSecure, usuario: fUser }; if (fPass) b.password = fPass; if (editId) b.id = editId; const r = await fetch("/api/portal/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); resetForm(); setShowForm(false); await loadAccounts(); setView("list"); } catch (e: any) { alert(e.message); } finally { setFSaving(false); } };
  const deleteAccount = async (id: string) => { if (!confirm("Eliminar esta cuenta?")) return; try { await fetch(`/api/portal/email?id=${id}`, { method: "DELETE" }); if (selAccount?.id === id) { setSelAccount(null); setMessages([]); setFolders([]); } loadAccounts(); } catch (e: any) { alert(e.message); } };
  const resetForm = () => { setFp("custom"); setFNombre(""); setFEmail(""); setFImapH(""); setFImapP(993); setFSmtpH(""); setFSmtpP(465); setFSecure(true); setFUser(""); setFPass(""); setFShowPass(false); setFTestRes(null); setEditId(null); };
  const editAccount = (acc: EmailAccount) => { setEditId(acc.id); setFNombre(acc.nombre); setFEmail(acc.email); setFImapH(acc.imap_host); setFImapP(acc.imap_port); setFSmtpH(acc.smtp_host); setFSmtpP(acc.smtp_port); setFSecure(acc.smtp_secure); setFUser(acc.usuario); setFPass(""); setShowForm(true); setView("accounts"); };

  if (loading) return (<><Header title="Email" subtitle="Cargando..." /><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-purple" /></div></>);

  // ── Accounts view ──
  if (view === "accounts" || accounts.length === 0) return (
    <><Header title="Email" subtitle="Gestión de cuentas" />
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {accounts.length > 0 && (<div className="space-y-3"><h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Cuentas conectadas</h2>
        {accounts.map(acc => (<div key={acc.id} className="card flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-brand-purple/10 flex items-center justify-center"><Mail className="w-5 h-5 text-brand-purple" /></div><div className="flex-1 min-w-0"><p className="font-semibold text-sm truncate">{acc.nombre || acc.email}</p><p className="text-xs text-[var(--muted-foreground)] truncate">{acc.email} · {acc.imap_host}</p></div><div className="flex gap-2"><button onClick={() => { setSelAccount(acc); setView("list"); }} className="btn-ghost text-xs px-3 py-1.5">Abrir</button><button onClick={() => editAccount(acc)} className="btn-ghost text-xs px-3 py-1.5">Editar</button><button onClick={() => deleteAccount(acc.id)} className="btn-ghost text-xs px-3 py-1.5 text-danger">Eliminar</button></div></div>))}</div>)}
      {!showForm && <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Añadir cuenta de correo</button>}
      {showForm && (<div className="card space-y-5">
        <div className="flex items-center justify-between"><h2 className="font-bold text-lg">{editId ? "Editar cuenta" : "Nueva cuenta de correo"}</h2><button onClick={() => { setShowForm(false); resetForm(); }} className="btn-ghost p-1"><X className="w-5 h-5" /></button></div>
        <div><label className="text-xs font-medium text-[var(--muted-foreground)] mb-2 block">Proveedor</label><div className="flex flex-wrap gap-2">{[{ id: "gmail", label: "Gmail" }, { id: "outlook", label: "Outlook" }, { id: "ionos", label: "IONOS" }, { id: "yahoo", label: "Yahoo" }, { id: "custom", label: "Otro" }].map(p => <button key={p.id} onClick={() => applyPreset(p.id)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors", fp === p.id ? "bg-brand-purple/10 text-brand-purple border-brand-purple/30" : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]")}>{p.label}</button>)}</div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Nombre</label><input type="text" className="input-field" placeholder="Correo principal" value={fNombre} onChange={e => setFNombre(e.target.value)} /></div>
          <div><label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Email *</label><input type="email" className="input-field" placeholder="info@tuempresa.com" value={fEmail} onChange={e => setFEmail(e.target.value)} /></div>
          <div><label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Usuario *</label><input type="text" className="input-field" placeholder="Normalmente el email" value={fUser} onChange={e => setFUser(e.target.value)} /></div>
          <div><label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Contraseña {editId ? "(vacío = mantener)" : "*"}</label><div className="relative"><input type={fShowPass ? "text" : "password"} className="input-field pr-10" placeholder="••••••••" value={fPass} onChange={e => setFPass(e.target.value)} /><button onClick={() => setFShowPass(!fShowPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">{fShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
        </div>
        <div><label className="text-xs font-medium text-[var(--muted-foreground)] mb-2 block">Servidores</label><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2"><p className="text-xs font-semibold">IMAP (recepción)</p><input type="text" className="input-field" placeholder="imap.servidor.com" value={fImapH} onChange={e => setFImapH(e.target.value)} /><input type="number" className="input-field" placeholder="993" value={fImapP} onChange={e => setFImapP(parseInt(e.target.value) || 993)} /></div>
          <div className="space-y-2"><p className="text-xs font-semibold">SMTP (envío)</p><input type="text" className="input-field" placeholder="smtp.servidor.com" value={fSmtpH} onChange={e => setFSmtpH(e.target.value)} /><input type="number" className="input-field" placeholder="465" value={fSmtpP} onChange={e => setFSmtpP(parseInt(e.target.value) || 465)} /><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={fSecure} onChange={e => setFSecure(e.target.checked)} className="rounded border-[var(--border)]" />SSL/TLS</label></div>
        </div></div>
        {fTestRes && <div className={cn("p-3 rounded-lg text-sm flex items-center gap-2", fTestRes.success ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>{fTestRes.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{fTestRes.message}</div>}
        <div className="flex gap-3">
          <button onClick={testConn} disabled={fTesting || !fSmtpH || !fUser || !fPass} className="btn-ghost flex items-center gap-2 text-sm">{fTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Probar conexión</button>
          <button onClick={saveAccount} disabled={fSaving} className="btn-primary flex items-center gap-2 text-sm">{fSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}{editId ? "Guardar" : "Conectar cuenta"}</button>
          <button onClick={() => { setShowForm(false); resetForm(); }} className="btn-ghost text-sm">Cancelar</button>
        </div>
        {fp === "gmail" && <div className="p-3 rounded-lg bg-warning/10 text-warning text-xs"><strong>Gmail:</strong> Necesitas activar las contraseñas de aplicación en myaccount.google.com</div>}
      </div>)}
      {accounts.length > 0 && <button onClick={() => setView("list")} className="btn-ghost text-sm flex items-center gap-2"><ArrowLeft className="w-4 h-4" />Volver al correo</button>}
    </div></>);

  // ── Main email client ──
  return (<><Header title="Email" subtitle={selAccount?.email || ""} />
    <div className="flex h-[calc(100vh-65px)] overflow-hidden">
      {/* Sidebar carpetas */}
      <div className="w-56 flex-shrink-0 border-r border-[var(--border)] flex-col bg-[var(--card)] hidden lg:flex">
        {accounts.length > 1 && <div className="p-3 border-b border-[var(--border)]"><select className="input-field text-xs w-full" value={selAccount?.id || ""} onChange={e => { const a = accounts.find(x => x.id === e.target.value); if (a) setSelAccount(a); }}>{accounts.map(a => <option key={a.id} value={a.id}>{a.nombre || a.email}</option>)}</select></div>}
        <div className="p-3"><button onClick={() => { resetCompose(); setView("compose"); }} className="btn-primary w-full flex items-center justify-center gap-2 text-sm"><Pen className="w-4 h-4" />Redactar</button></div>
        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">{folders.map(f => { const Icon = getFolderIcon(f); const active = f.path === selFolder; return (<button key={f.path} onClick={() => { setSelFolder(f.path); setPage(1); setView("list"); setSelMsg(null); }} className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors", active ? "bg-brand-purple/10 text-brand-purple font-medium" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]")}><Icon className="w-4 h-4 flex-shrink-0" /><span className="truncate">{getFolderLabel(f)}</span></button>); })}</nav>
        <div className="p-2 border-t border-[var(--border)]"><button onClick={() => setView("accounts")} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><Settings className="w-4 h-4" /><span>Cuentas</span></button></div>
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        {/* Compose */}
        {view === "compose" && (<div className="flex-1 flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--card)]"><button onClick={() => setView("list")} className="btn-ghost p-1.5"><ArrowLeft className="w-5 h-5" /></button><h3 className="font-semibold text-sm">Nuevo mensaje</h3><div className="flex-1" /><button onClick={handleSend} disabled={sending || !cTo.trim()} className="btn-primary flex items-center gap-2 text-sm">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Enviar</button></div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center gap-3"><label className="text-sm font-medium w-12 text-right text-[var(--muted-foreground)]">Para:</label><input type="text" className="input-field flex-1" placeholder="email@ejemplo.com" value={cTo} onChange={e => setCTo(e.target.value)} /></div>
            <div className="flex items-center gap-3"><label className="text-sm font-medium w-12 text-right text-[var(--muted-foreground)]">Cc:</label><input type="text" className="input-field flex-1" placeholder="(opcional)" value={cCc} onChange={e => setCCc(e.target.value)} /></div>
            <div className="flex items-center gap-3"><label className="text-sm font-medium w-12 text-right text-[var(--muted-foreground)]">Asunto:</label><input type="text" className="input-field flex-1" placeholder="Asunto" value={cSubject} onChange={e => setCSubject(e.target.value)} /></div>
            <textarea className="input-field w-full min-h-[300px] resize-y" placeholder="Escribe tu mensaje..." value={cBody} onChange={e => setCBody(e.target.value)} />
          </div>
        </div>)}
        {/* Read */}
        {view === "read" && selMsg && (<div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--card)]">
            <button onClick={() => { setView("list"); setSelMsg(null); }} className="btn-ghost p-1.5"><ArrowLeft className="w-5 h-5" /></button><div className="flex-1" />
            <button onClick={() => handleReply(selMsg)} className="btn-ghost p-1.5" title="Responder"><Reply className="w-4 h-4" /></button>
            <button onClick={() => handleReply(selMsg, true)} className="btn-ghost p-1.5" title="Responder a todos"><ReplyAll className="w-4 h-4" /></button>
            <button onClick={() => handleForward(selMsg)} className="btn-ghost p-1.5" title="Reenviar"><Forward className="w-4 h-4" /></button>
            <button onClick={() => handleDelete(selMsg)} className="btn-ghost p-1.5 text-danger" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">{loadingMsg ? <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-purple" /></div> :
            <div className="max-w-3xl mx-auto space-y-4">
              <h1 className="text-xl font-bold">{selMsg.subject}</h1>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-purple/10 flex items-center justify-center flex-shrink-0"><span className="text-sm font-bold text-brand-purple">{(selMsg.from?.[0]?.name || selMsg.from?.[0]?.email || "?")?.[0]?.toUpperCase()}</span></div>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="font-semibold text-sm">{selMsg.from?.[0]?.name || selMsg.from?.[0]?.email}</span><span className="text-xs text-[var(--muted-foreground)]">&lt;{selMsg.from?.[0]?.email}&gt;</span></div><p className="text-xs text-[var(--muted-foreground)]">Para: {selMsg.to?.map(t => t.name || t.email).join(", ")}{selMsg.cc?.length ? ` · Cc: ${selMsg.cc.map(c => c.name || c.email).join(", ")}` : ""}</p><p className="text-xs text-[var(--muted-foreground)]">{fmtFullDate(selMsg.date || "")}</p></div>
              </div>
              {selMsg.attachments && selMsg.attachments.length > 0 && <div className="flex flex-wrap gap-2">{selMsg.attachments.map((att, i) => <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--muted)] text-xs"><Paperclip className="w-3 h-3" /><span>{att.filename}</span></div>)}</div>}
              <div className="border-t border-[var(--border)] pt-4">{selMsg.html ? <div className="email-body prose prose-sm max-w-none text-[var(--foreground)]" dangerouslySetInnerHTML={{ __html: selMsg.html }} style={{ wordBreak: "break-word", overflowWrap: "break-word" }} /> : <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{selMsg.text || "(Sin contenido)"}</pre>}</div>
              <div className="border-t border-[var(--border)] pt-4 flex gap-2"><button onClick={() => handleReply(selMsg)} className="btn-ghost flex items-center gap-2 text-sm"><Reply className="w-4 h-4" />Responder</button><button onClick={() => handleReply(selMsg, true)} className="btn-ghost flex items-center gap-2 text-sm"><ReplyAll className="w-4 h-4" />Responder a todos</button><button onClick={() => handleForward(selMsg)} className="btn-ghost flex items-center gap-2 text-sm"><Forward className="w-4 h-4" />Reenviar</button></div>
            </div>
          }</div>
        </div>)}
        {/* List */}
        {view === "list" && (<div className="flex-1 flex flex-col">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--card)]">
            <button onClick={() => setMobileSidebar(!mobileSidebar)} className="lg:hidden btn-ghost p-1.5"><FolderOpen className="w-5 h-5" /></button>
            <span className="text-sm font-semibold">{getFolderLabel(folders.find(f => f.path === selFolder) || { name: selFolder, path: selFolder, specialUse: null })}</span>
            <span className="text-xs text-[var(--muted-foreground)]">{total} correos</span><div className="flex-1" />
            <button onClick={loadMessages} className="btn-ghost p-1.5"><RefreshCw className={cn("w-4 h-4", loadingMsgs && "animate-spin")} /></button>
            <button onClick={() => { resetCompose(); setView("compose"); }} className="btn-primary flex items-center gap-2 text-sm lg:hidden"><Pen className="w-4 h-4" /></button>
          </div>
          {mobileSidebar && <div className="lg:hidden border-b border-[var(--border)] bg-[var(--card)] px-4 py-2 space-y-1">{folders.map(f => <button key={f.path} onClick={() => { setSelFolder(f.path); setPage(1); setMobileSidebar(false); }} className={cn("w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm", f.path === selFolder ? "bg-brand-purple/10 text-brand-purple" : "text-[var(--muted-foreground)]")}>{getFolderLabel(f)}</button>)}<button onClick={() => setView("accounts")} className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm text-[var(--muted-foreground)]"><Settings className="w-4 h-4" />Cuentas</button></div>}
          <div className="flex-1 overflow-y-auto">{loadingMsgs ? <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-purple" /></div> : messages.length === 0 ? <div className="flex flex-col items-center justify-center py-20"><Inbox className="w-12 h-12 text-[var(--muted-foreground)] mb-3" /><p className="text-sm text-[var(--muted-foreground)]">No hay correos</p></div> :
            <div className="divide-y divide-[var(--border)]">{messages.map(msg => <div key={msg.uid} onClick={() => readMessage(msg)} className={cn("w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--muted)] cursor-pointer", !msg.seen && "bg-brand-purple/5")}>
              <button onClick={e => { e.stopPropagation(); handleToggleFlag(msg); }} className="flex-shrink-0 p-0.5"><Star className={cn("w-4 h-4", msg.flagged ? "fill-warning text-warning" : "text-[var(--muted-foreground)]")} /></button>
              <div className="w-40 flex-shrink-0 truncate"><span className={cn("text-sm", !msg.seen ? "font-semibold" : "text-[var(--muted-foreground)]")}>{msg.from?.[0]?.name || msg.from?.[0]?.email || "Desconocido"}</span></div>
              <div className="flex-1 min-w-0 truncate"><span className={cn("text-sm", !msg.seen && "font-semibold")}>{msg.subject}</span></div>
              <span className="text-xs text-[var(--muted-foreground)] flex-shrink-0 w-20 text-right">{fmtDate(msg.date || "")}</span>
            </div>)}</div>}
          </div>
          {pages > 1 && <div className="flex items-center justify-center gap-3 py-3 border-t border-[var(--border)] bg-[var(--card)]"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button><span className="text-xs text-[var(--muted-foreground)]">Página {page} de {pages}</span><button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} className="btn-ghost p-1.5 disabled:opacity-30"><ChevronLeft className="w-4 h-4 rotate-180" /></button></div>}
        </div>)}
      </div>
    </div></>);
}
