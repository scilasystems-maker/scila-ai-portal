"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Header } from "@/components/shared/Header";
import {
  Upload, Send, Loader2, FileText, RefreshCw,
  ChevronDown, ChevronRight, Users, ClipboardList,
  MessageSquare, CheckCircle, Clock, AlertCircle, XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message { role: "user" | "assistant"; content: string; }
interface Informe {
  id: string; numero_informe: string; aseguradora: string;
  municipio_siniestro: string; estado: string; creado_en: string;
}
interface Cliente {
  id: string; nombre: string; telefono: string; municipio: string;
  informes?: Informe[];
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDIENTE_ENVIO:           { label: "Pendiente envío",     color: "bg-warning/10 text-warning border-warning/20",         icon: Clock },
  MENSAJE_ENVIADO:           { label: "Mensaje enviado",     color: "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20", icon: MessageSquare },
  "2DO_INTENTO":             { label: "2º intento",          color: "bg-warning/10 text-warning border-warning/20",         icon: Clock },
  "3ER_INTENTO":             { label: "3er intento",         color: "bg-danger/10 text-danger border-danger/20",            icon: AlertCircle },
  CITA_CONFIRMADA:           { label: "Cita confirmada",     color: "bg-success/10 text-success border-success/20",         icon: CheckCircle },
  CITA_NO_CONFIRMADA:        { label: "No confirmada",       color: "bg-warning/10 text-warning border-warning/20",         icon: Clock },
  IMPOSIBLE_CONTACTAR_WHATSAPP: { label: "Sin WhatsApp",    color: "bg-danger/10 text-danger border-danger/20",            icon: XCircle },
  PENDIENTE_FRANCISCO:       { label: "Acción requerida",   color: "bg-danger/10 text-danger border-danger/20",            icon: AlertCircle },
  RENEGOCIANDO:              { label: "Renegociando",        color: "bg-brand-purple/10 text-brand-purple border-brand-purple/20", icon: RefreshCw },
};

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_CONFIG[estado] || { label: estado, color: "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium", cfg.color)}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

export default function AgentePericialPage() {
  const [tab, setTab] = useState<"chat" | "informes" | "clientes">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [informeCreado, setInformeCreado] = useState(false);
  const [informes, setInformes] = useState<Informe[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesExpanded, setClientesExpanded] = useState<Record<string, boolean>>({});
  const [loadingData, setLoadingData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadInformes = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/portal/agente-pericial/informes");
      if (res.ok) setInformes(await res.json());
    } finally { setLoadingData(false); }
  }, []);

  const loadClientes = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/portal/agente-pericial/clientes");
      if (res.ok) setClientes(await res.json());
    } finally { setLoadingData(false); }
  }, []);

  useEffect(() => {
    if (tab === "informes") loadInformes();
    if (tab === "clientes") loadClientes();
  }, [tab, loadInformes, loadClientes]);

  const handleFileChange = async (file: File) => {
    if (file.type !== "application/pdf") { alert("Solo se aceptan PDFs"); return; }
    setPdfFile(file);
    const base64 = await fileToBase64(file);
    await sendMessage("", base64, file.name);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const sendMessage = async (text: string, pdf?: string | null, pdfName?: string) => {
    if (!text.trim() && !pdf) return;
    const userMsg: Message = { role: "user", content: text || `📄 ${pdfName}` };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/portal/agente-pericial/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, sessionId, pdf: pdf ?? null, pdfName: pdfName ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      if (data.informeCreado) { setInformeCreado(true); }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally { setLoading(false); }
  };

  const handleReset = () => {
    setMessages([]); setPdfFile(null); setInformeCreado(false); setInput("");
  };

  const toggleCliente = async (clienteId: string) => {
    setClientesExpanded(prev => ({ ...prev, [clienteId]: !prev[clienteId] }));
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente && !cliente.informes) {
      const res = await fetch(`/api/portal/agente-pericial/clientes?cliente_id=${clienteId}`);
      if (res.ok) {
        const data = await res.json();
        setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, informes: data } : c));
      }
    }
  };

  return (
    <>
      <Header title="Agente Pericial" subtitle="Fides Peritaciones" />
      <div className="p-4 lg:p-6">

        {/* Tabs */}
        <div className="flex border border-[var(--border)] rounded-lg overflow-hidden w-fit mb-6">
          {[
            { id: "chat", label: "Chat", icon: MessageSquare },
            { id: "informes", label: "Informes", icon: ClipboardList },
            { id: "clientes", label: "Clientes", icon: Users },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={cn("flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                  tab === t.id ? "bg-brand-purple/10 text-brand-purple" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                )}>
                <Icon className="w-4 h-4" />{t.label}
              </button>
            );
          })}
        </div>

        {/* ── CHAT ── */}
        {tab === "chat" && (
          <div className="flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
            {messages.length === 0 ? (
              <div
                onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && handleFileChange(e.dataTransfer.files[0]); }}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="card flex flex-col items-center justify-center gap-4 py-20 cursor-pointer border-2 border-dashed border-[var(--border)] hover:border-brand-purple/50 hover:bg-brand-purple/5 transition-all flex-1"
              >
                <div className="w-16 h-16 rounded-2xl bg-brand-purple/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-brand-purple" />
                </div>
                <div className="text-center">
                  <p className="font-semibold">Arrastra el encargo pericial aquí</p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">o haz clic para seleccionar el PDF</p>
                </div>
                <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])} />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  {pdfFile && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-purple/10 text-brand-purple text-sm">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium truncate max-w-[200px]">{pdfFile.name}</span>
                    </div>
                  )}
                  <button onClick={handleReset} className="flex items-center gap-2 btn-ghost text-sm ml-auto">
                    <RefreshCw className="w-4 h-4" />Nuevo encargo
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                        msg.role === "user"
                          ? "bg-brand-purple text-white rounded-tr-sm"
                          : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] rounded-tl-sm"
                      )}>{msg.content}</div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl rounded-tl-sm px-4 py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-purple" />
                      </div>
                    </div>
                  )}
                  {informeCreado && (
                    <div className="flex justify-center">
                      <div className="text-xs px-3 py-1.5 rounded-full bg-success/10 text-success border border-success/20 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />Informe creado — WhatsApp enviado al asegurado
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {!informeCreado && (
                  <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
                    <input type="text" value={input} onChange={e => setInput(e.target.value)}
                      placeholder="Escribe tu respuesta..." disabled={loading}
                      className="input-field flex-1" autoFocus />
                    <button type="submit" disabled={loading || !input.trim()} className="btn-primary p-3 disabled:opacity-50">
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        )}

        {/* ── INFORMES ── */}
        {tab === "informes" && (
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <p className="text-sm font-medium">{informes.length} informes</p>
              <button onClick={loadInformes} className="btn-ghost p-2"><RefreshCw className={cn("w-4 h-4", loadingData && "animate-spin")} /></button>
            </div>
            {loadingData ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-purple" /></div>
            ) : informes.length === 0 ? (
              <div className="text-center py-12 text-[var(--muted-foreground)] text-sm">No hay informes todavía</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {["Nº Informe", "Asegurado", "Aseguradora", "Municipio", "Estado", "Fecha"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {informes.map((inf, i) => (
                      <tr key={inf.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-purple">{inf.numero_informe}</td>
                        <td className="px-4 py-3">{(inf as any).clientes?.nombre || "—"}</td>
                        <td className="px-4 py-3">{inf.aseguradora}</td>
                        <td className="px-4 py-3">{inf.municipio_siniestro}</td>
                        <td className="px-4 py-3"><EstadoBadge estado={inf.estado} /></td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs whitespace-nowrap">
                          {new Date(inf.creado_en).toLocaleDateString("es-ES")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── CLIENTES ── */}
        {tab === "clientes" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-[var(--muted-foreground)]">{clientes.length} asegurados</p>
              <button onClick={loadClientes} className="btn-ghost p-2"><RefreshCw className={cn("w-4 h-4", loadingData && "animate-spin")} /></button>
            </div>
            {loadingData && clientes.length === 0 ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-purple" /></div>
            ) : clientes.length === 0 ? (
              <div className="card text-center py-12 text-[var(--muted-foreground)] text-sm">No hay clientes todavía</div>
            ) : clientes.map(cliente => (
              <div key={cliente.id} className="card p-0 overflow-hidden">
                <button onClick={() => toggleCliente(cliente.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)]/50 transition-colors text-left">
                  <div className="w-8 h-8 rounded-full bg-brand-purple/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-brand-purple">{cliente.nombre?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{cliente.nombre}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{cliente.telefono} — {cliente.municipio}</p>
                  </div>
                  {clientesExpanded[cliente.id]
                    ? <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0" />
                  }
                </button>

                {clientesExpanded[cliente.id] && (
                  <div className="border-t border-[var(--border)]">
                    {!cliente.informes ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-brand-purple" /></div>
                    ) : cliente.informes.length === 0 ? (
                      <p className="text-xs text-[var(--muted-foreground)] px-4 py-3">Sin informes</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[var(--muted)]/30">
                            {["Nº Informe", "Aseguradora", "Municipio", "Estado", "Fecha"].map(h => (
                              <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {cliente.informes.map(inf => (
                            <tr key={inf.id} className="border-t border-[var(--border)] hover:bg-[var(--muted)]/30 transition-colors">
                              <td className="px-4 py-2 font-mono text-xs font-semibold text-brand-purple">{inf.numero_informe}</td>
                              <td className="px-4 py-2 text-xs">{inf.aseguradora}</td>
                              <td className="px-4 py-2 text-xs">{inf.municipio_siniestro}</td>
                              <td className="px-4 py-2"><EstadoBadge estado={inf.estado} /></td>
                              <td className="px-4 py-2 text-xs text-[var(--muted-foreground)]">{new Date(inf.creado_en).toLocaleDateString("es-ES")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
