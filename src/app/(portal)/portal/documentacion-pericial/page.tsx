"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/shared/Header";
import {
  Loader2, RefreshCw, Search, ArrowUpDown, X, Send,
  FileText, Phone, Download, CheckCircle, Plus, AlertTriangle,
  ChevronDown, ChevronUp, MessageSquare, Image,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Cita {
  id: string; informe_id: string; cliente_id: string; fecha_hora: string; duracion_minutos: number; estado: string;
  direccion: string; municipio: string;
  informes_periciales?: { numero_informe: string; numero_siniestro: string; aseguradora: string; cliente_id: string };
  clientes?: { nombre: string; telefono: string };
}
interface Solicitud { id: string; informe_id: string; documentos_solicitados: string[]; mensaje_asegurado: string; estado: string; creado_en: string; documento_nombre?: string; documento_estado?: string; }
interface Documento { id: string; nombre_archivo: string; tipo_archivo: string; documento_tipo: string | null; creado_en: string; signed_url: string; }
interface ChatMsg { role: "user" | "assistant"; content: string; }

function toMadrid(s: string) { if (!s) return "—"; try { return new Date(s).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return s; } }

function MarkdownText({ content }: { content: string }) {
  return (<div className="space-y-1">{content.split("\n").map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    const isBullet = /^[\-\*]\s/.test(line.trim());
    const text = isBullet ? line.trim().slice(2) : line;
    const parts: (string | JSX.Element)[] = [];
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let last = 0, match: RegExpExecArray | null, k = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > last) parts.push(<span key={k++}>{text.slice(last, match.index)}</span>);
      if (match[1]) parts.push(<strong key={k++} className="font-semibold">{match[1]}</strong>);
      else if (match[2]) parts.push(<em key={k++}>{match[2]}</em>);
      last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>);
    const rendered = parts.length ? parts : text;
    if (isBullet) return <div key={i} className="flex gap-2 ml-2"><span className="text-brand-purple">•</span><span>{rendered}</span></div>;
    return <p key={i}>{rendered}</p>;
  })}</div>);
}

export default function DocumentacionPericialPage() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("fecha_hora");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterAseg, setFilterAseg] = useState("");
  const [filterMuni, setFilterMuni] = useState("");

  // Panel
  const [selCita, setSelCita] = useState<Cita | null>(null);
  const [panelView, setPanelView] = useState<"detalle" | "chat" | "faltante">("detalle");
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [secOpen, setSecOpen] = useState({ solicitados: true, recibidos: true });

  // Chat
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Faltante
  const [selFaltante, setSelFaltante] = useState("");
  const [sendingFaltante, setSendingFaltante] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadCitas(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

  const loadCitas = async () => { setLoading(true); try { const r = await fetch("/api/portal/agente-pericial/documentacion?action=citas"); if (r.ok) setCitas(await r.json()); } catch (e) { console.error(e); } finally { setLoading(false); } };

  const loadDetalle = async (informeId: string) => {
    setLoadingDetalle(true);
    try { const r = await fetch(`/api/portal/agente-pericial/documentacion?action=detalle&informe_id=${informeId}`); if (r.ok) { const d = await r.json(); setSolicitudes(d.solicitudes || []); setDocumentos(d.documentos || []); } }
    catch (e) { console.error(e); }
    finally { setLoadingDetalle(false); }
  };

  const openPanel = (cita: Cita) => {
    setSelCita(cita);
    setChatMsgs([]);
    setChatInput("");
    setSessionId(crypto.randomUUID());
    setSolicitudes([]);
    setDocumentos([]);
    setSelFaltante("");
    const informeId = cita.informe_id || null;
    if (informeId) { setPanelView("detalle"); loadDetalle(informeId); }
    else setPanelView("chat");
  };

  const sendChat = async (msg?: string) => {
    if (!selCita) return;
    const text = msg || chatInput;
    if (!text.trim()) return;
    setChatMsgs(prev => [...prev, { role: "user", content: text }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const r = await fetch("/api/portal/agente-pericial/documentacion", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: text, informe_id: selCita.informe_id || null, cliente_id: selCita.cliente_id || null, telefono: selCita.clientes?.telefono || null }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setChatMsgs(prev => [...prev, { role: "assistant", content: data.reply || data.mensaje || JSON.stringify(data) }]);
    } catch (e: any) { setChatMsgs(prev => [...prev, { role: "assistant", content: "Error: " + e.message }]); }
    finally { setChatLoading(false); }
  };

  const sendFaltante = async () => {
    if (!selCita || !selFaltante) return;
    setSendingFaltante(true);
    try {
      const r = await fetch("/api/portal/agente-pericial/documentacion", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: `Solicitar documento faltante: ${selFaltante}`, informe_id: selCita.informe_id || null, cliente_id: selCita.cliente_id || null, telefono: selCita.clientes?.telefono || null, action: "solicitar_faltante" }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      alert("Solicitud de documento faltante enviada");
      setSelFaltante("");
      setPanelView("detalle");
      if (selCita) loadDetalle(selCita.informe_id);
    } catch (e: any) { alert("Error: " + e.message); }
    finally { setSendingFaltante(false); }
  };

  const markComplete = async () => {
    if (!selCita || !confirm("Marcar documentación como completa?")) return;
    try {
      const r = await fetch("/api/portal/agente-pericial/documentacion", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ informe_id: selCita.informe_id || null, action: "completar" }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      alert("Documentación marcada como completa");
      loadDetalle(selCita.informe_id);
      loadCitas();
    } catch (e: any) { alert("Error: " + e.message); }
  };

  const handleSort = (col: string) => { if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortCol(col); setSortDir("asc"); } };
  const getAsegurado = (c: Cita) => c.clientes?.nombre || "—";
  const getNumInforme = (c: Cita) => c.informes_periciales?.numero_informe || "—";
  const getAseguradora = (c: Cita) => c.informes_periciales?.aseguradora || "—";
  const getNumSiniestro = (c: Cita) => c.informes_periciales?.numero_siniestro || "—";

  const aseguradoras = Array.from(new Set(citas.map(c => c.informes_periciales?.aseguradora).filter(Boolean))) as string[];
  const municipios = Array.from(new Set(citas.map(c => c.municipio).filter(Boolean))) as string[];

  const hasSolicitudes = solicitudes.length > 0;
  const docsConEstado = solicitudes.map((s: any) => ({ name: s.nombre_documento || "Sin nombre", recibido: s.estado === "RECIBIDO" || s.estado === "COMPLETADA" }));

  const filtered = citas.filter(c => {
    const s = search.toLowerCase();
    const matchS = !s || getAsegurado(c).toLowerCase().includes(s) || getNumInforme(c).toLowerCase().includes(s) || getNumSiniestro(c).toLowerCase().includes(s) || getAseguradora(c).toLowerCase().includes(s) || c.municipio?.toLowerCase().includes(s);
    return matchS && (!filterAseg || c.informes_periciales?.aseguradora === filterAseg) && (!filterMuni || c.municipio === filterMuni);
  }).sort((a, b) => {
    let va = "", vb = "";
    if (sortCol === "asegurado") { va = getAsegurado(a); vb = getAsegurado(b); }
    else if (sortCol === "numero_informe") { va = getNumInforme(a); vb = getNumInforme(b); }
    else if (sortCol === "aseguradora") { va = getAseguradora(a); vb = getAseguradora(b); }
    else { va = (a as any)[sortCol] || ""; vb = (b as any)[sortCol] || ""; }
    return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  const SortHeader = ({ col, label }: { col: string; label: string }) => (
    <th onClick={() => handleSort(col)} className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-[var(--foreground)] select-none">
      <span className="flex items-center gap-1">{label}<ArrowUpDown className={cn("w-3 h-3", sortCol === col ? "text-brand-purple" : "opacity-30")} /></span>
    </th>
  );

  if (loading) return (<><Header title="Documentación Pericial" subtitle="" /><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-purple" /></div></>);

  return (
    <><Header title="Documentación Pericial" subtitle={`${filtered.length} visitas completadas`} />
    <div className="flex h-[calc(100vh-65px)]">
      {/* Tabla */}
      <div className={cn("flex-1 flex flex-col p-4 lg:p-6 overflow-hidden", selCita && "hidden lg:flex")}>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" /><input className="input-field pl-9 w-full" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          {aseguradoras.length > 1 && <select className="input-field text-xs" value={filterAseg} onChange={e => setFilterAseg(e.target.value)}><option value="">Todas las aseguradoras</option>{aseguradoras.map(a => <option key={a} value={a}>{a}</option>)}</select>}
          {municipios.length > 1 && <select className="input-field text-xs" value={filterMuni} onChange={e => setFilterMuni(e.target.value)}><option value="">Todos los municipios</option>{municipios.map(m => <option key={m} value={m}>{m}</option>)}</select>}
          <button onClick={loadCitas} className="btn-ghost p-2"><RefreshCw className="w-4 h-4" /></button>
        </div>
        <div className="card p-0 overflow-hidden flex-1"><div className="overflow-x-auto h-full">
          <table className="w-full text-sm"><thead><tr className="border-b border-[var(--border)] bg-[var(--muted)]/30 sticky top-0">
            <SortHeader col="asegurado" label="Asegurado" /><SortHeader col="numero_informe" label="Nº Informe" />
            <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Nº Siniestro</th>
            <SortHeader col="aseguradora" label="Aseguradora" /><SortHeader col="municipio" label="Municipio" />
            <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Dirección</th>
            <SortHeader col="fecha_hora" label="Fecha visita" />
            <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Duración</th>
          </tr></thead><tbody>{filtered.length === 0 ? <tr><td colSpan={8} className="text-center py-12 text-[var(--muted-foreground)]">No hay visitas completadas</td></tr> :
            filtered.map(cita => <tr key={cita.id} onClick={() => openPanel(cita)} className={cn("border-b border-[var(--border)] hover:bg-brand-purple/5 cursor-pointer", selCita?.id === cita.id && "bg-brand-purple/10")}>
              <td className="px-4 py-3 font-medium">{getAsegurado(cita)}</td>
              <td className="px-4 py-3 font-mono text-xs text-brand-purple font-semibold">{getNumInforme(cita)}</td>
              <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs">{getNumSiniestro(cita)}</td>
              <td className="px-4 py-3 text-xs">{getAseguradora(cita)}</td>
              <td className="px-4 py-3">{cita.municipio || "—"}</td>
              <td className="px-4 py-3 text-[var(--muted-foreground)] text-xs max-w-[180px] truncate">{cita.direccion || "—"}</td>
              <td className="px-4 py-3 text-xs whitespace-nowrap">{toMadrid(cita.fecha_hora)}</td>
              <td className="px-4 py-3 text-center text-xs">{cita.duracion_minutos ? `${cita.duracion_minutos} min` : "—"}</td>
            </tr>)
          }</tbody></table>
        </div></div>
      </div>

      {/* Panel lateral */}
      {selCita && (
        <div className="w-full lg:w-[440px] flex-shrink-0 border-l border-[var(--border)] bg-[var(--card)] flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="min-w-0"><h3 className="font-semibold text-sm truncate">{getAsegurado(selCita)}</h3><p className="text-xs text-[var(--muted-foreground)]">{getNumInforme(selCita)} · {getAseguradora(selCita)}</p></div>
            <button onClick={() => setSelCita(null)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
          </div>

          {/* Info cita */}
          <div className="px-4 py-3 border-b border-[var(--border)] space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Siniestro:</span><span>{getNumSiniestro(selCita)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Municipio:</span><span>{selCita.municipio}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Dirección:</span><span className="text-right max-w-[200px] truncate">{selCita.direccion}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Visita:</span><span>{toMadrid(selCita.fecha_hora)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Teléfono:</span><span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selCita.clientes?.telefono || "—"}</span></div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loadingDetalle ? <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-brand-purple" /></div> :

            panelView === "detalle" ? (
              <div className="px-4 py-4 space-y-4">
                {!hasSolicitudes ? (
                  <div className="text-center py-8">
                    <FileText className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
                    <p className="text-sm text-[var(--muted-foreground)] mb-4">No hay documentación solicitada para este informe</p>
                    <button onClick={() => setPanelView("chat")} className="btn-primary text-sm flex items-center gap-2 mx-auto"><MessageSquare className="w-4 h-4" />Solicitar documentación</button>
                  </div>
                ) : (<>
                  {/* Documentos solicitados */}
                  <div>
                    <button onClick={() => setSecOpen(p => ({ ...p, solicitados: !p.solicitados }))} className="flex items-center gap-2 w-full text-left">
                      {secOpen.solicitados ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      <span className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Documentos solicitados ({docsConEstado.length})</span>
                    </button>
                    {secOpen.solicitados && <div className="mt-2 space-y-1.5">{docsConEstado.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-xs">
                        {d.recibido ? <CheckCircle className="w-4 h-4 text-success flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />}
                        <span className="flex-1">{d.name}</span>
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", d.recibido ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>{d.recibido ? "Recibido" : "Pendiente"}</span>
                      </div>
                    ))}</div>}
                  </div>

                  {/* Documentos recibidos — agrupados por tipo */}
                  <div>
                    <button onClick={() => setSecOpen(p => ({ ...p, recibidos: !p.recibidos }))} className="flex items-center gap-2 w-full text-left">
                      {secOpen.recibidos ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      <span className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Documentos recibidos ({documentos.length})</span>
                    </button>
                    {secOpen.recibidos && (documentos.length === 0 ? <p className="text-xs text-[var(--muted-foreground)] mt-2 ml-6">Sin documentos recibidos aún</p> :
                      <div className="mt-2 space-y-3">{(() => {
                        const grouped: Record<string, Documento[]> = {};
                        documentos.forEach(doc => {
                          let tipo = doc.documento_tipo;
                          if (!tipo || tipo === "OTRO" || tipo.length > 30) {
                            // Fallback: usar tipo_archivo simplificado
                            const ta = (doc.tipo_archivo || "").toLowerCase();
                            if (ta.startsWith("image/")) tipo = "FOTOS";
                            else if (ta.includes("pdf")) tipo = "PDF";
                            else tipo = "__sin_clasificar__";
                          }
                          if (!grouped[tipo]) grouped[tipo] = [];
                          grouped[tipo].push(doc);
                        });
                        const sortedKeys = Object.keys(grouped).filter(k => k !== "__sin_clasificar__").sort();
                        if (grouped["__sin_clasificar__"]) sortedKeys.push("__sin_clasificar__");
                        return sortedKeys.map(tipo => (
                          <div key={tipo}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[11px] font-semibold text-[var(--foreground)]">{tipo === "__sin_clasificar__" ? "Sin clasificar" : tipo}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple font-medium">{grouped[tipo].length}</span>
                            </div>
                            <div className="space-y-1 ml-1">{grouped[tipo].map(doc => {
                              const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(doc.nombre_archivo || "") || (doc.tipo_archivo || "").startsWith("image/");
                              return (
                                <a key={doc.id} href={doc.signed_url || "#"} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-xs hover:bg-brand-purple/5 transition-colors cursor-pointer">
                                  {isImage ? <Image className="w-4 h-4 text-brand-cyan flex-shrink-0" /> : <FileText className="w-4 h-4 text-brand-purple flex-shrink-0" />}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{doc.nombre_archivo}</p>
                                    <p className="text-[10px] text-[var(--muted-foreground)]">{doc.tipo_archivo} · {toMadrid(doc.creado_en)}</p>
                                  </div>
                                  <Download className="w-3.5 h-3.5 text-[var(--muted-foreground)] flex-shrink-0" />
                                </a>
                              );
                            })}</div>
                          </div>
                        ));
                      })()}</div>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                    <button onClick={() => setPanelView("chat")} className="btn-ghost w-full text-xs flex items-center justify-center gap-2"><Plus className="w-3 h-3" />Solicitar documentación adicional</button>
                    <button onClick={() => { setSelFaltante(""); setPanelView("faltante"); }} className="btn-ghost w-full text-xs flex items-center justify-center gap-2"><AlertTriangle className="w-3 h-3" />Solicitar documento faltante</button>
                    <button onClick={markComplete} className="btn-primary w-full text-xs flex items-center justify-center gap-2"><CheckCircle className="w-3 h-3" />Marcar como completa</button>
                  </div>
                </>)}
              </div>
            ) :

            panelView === "faltante" ? (
              <div className="px-4 py-4 space-y-4">
                <button onClick={() => setPanelView("detalle")} className="btn-ghost text-xs flex items-center gap-1"><X className="w-3 h-3" />Volver</button>
                <p className="text-sm font-medium">Selecciona el documento faltante:</p>
                <select className="input-field w-full text-sm" value={selFaltante} onChange={e => setSelFaltante(e.target.value)}>
                  <option value="">— Selecciona un documento —</option>
                  {docsConEstado.filter(d => !d.recibido).map((d, i) => <option key={i} value={d.name}>{d.name}</option>)}
                </select>
                <button onClick={sendFaltante} disabled={!selFaltante || sendingFaltante} className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {sendingFaltante ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar solicitud al asegurado
                </button>
              </div>
            ) :

            /* Chat */
            (
              <div className="flex flex-col h-full">
                <div className="px-4 pt-3"><button onClick={() => { if (hasSolicitudes) setPanelView("detalle"); }} className={cn("btn-ghost text-xs flex items-center gap-1", !hasSolicitudes && "hidden")}><X className="w-3 h-3" />Volver</button></div>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {chatMsgs.length === 0 && !chatLoading && <div className="text-center py-8"><FileText className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" /><p className="text-sm text-[var(--muted-foreground)]">Escribe qué documentación necesitas</p></div>}
                  {chatMsgs.map((msg, i) => (
                    <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed", msg.role === "user" ? "bg-brand-purple text-white rounded-tr-sm" : "bg-[var(--muted)] border border-[var(--border)] rounded-tl-sm")}>
                        {msg.role === "assistant" ? <MarkdownText content={msg.content} /> : msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && <div className="flex justify-start"><div className="bg-[var(--muted)] border border-[var(--border)] rounded-2xl rounded-tl-sm px-4 py-3"><Loader2 className="w-4 h-4 animate-spin text-brand-purple" /></div></div>}
                  <div ref={chatEndRef} />
                </div>
                <div className="px-4 py-3 border-t border-[var(--border)]">
                  <form onSubmit={e => { e.preventDefault(); sendChat(); }} className="flex gap-2">
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ej: Necesito fotos y factura..." disabled={chatLoading} className="input-field flex-1 text-sm" autoFocus />
                    <button type="submit" disabled={chatLoading || !chatInput.trim()} className="btn-primary p-2.5 disabled:opacity-50"><Send className="w-4 h-4" /></button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div></>
  );
}
