"use client";

import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/shared/Header";
import { Upload, Send, Loader2, FileText, RefreshCw, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message { role: "user" | "assistant"; content: string; }

function MarkdownText({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        const isBullet = /^[\-\*]\s/.test(line.trim());
        const formatted = renderInline(isBullet ? line.trim().slice(2) : line);
        if (isBullet) return <div key={i} className="flex gap-2 ml-2"><span className="text-brand-purple">•</span><span>{formatted}</span></div>;
        return <p key={i}>{formatted}</p>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts: (string | JSX.Element)[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0, match, key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(<span key={key++}>{text.slice(last, match.index)}</span>);
    if (match[1]) parts.push(<strong key={key++} className="font-semibold">{match[1]}</strong>);
    else if (match[2]) parts.push(<em key={key++}>{match[2]}</em>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
  return parts.length ? parts : text;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { const r = reader.result as string; resolve(r.split(",")[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AgentePericialPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [informeCreado, setInformeCreado] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleFileChange = async (file: File) => {
    if (file.type !== "application/pdf") { alert("Solo se aceptan PDFs"); return; }
    setPdfFile(file);
    const base64 = await fileToBase64(file);
    await sendMessage("", base64, file.name);
  };

  const sendMessage = async (text: string, pdf?: string, pdfName?: string) => {
    const userMsg = pdf ? `📄 ${pdfName || "PDF"}` : text;
    if (!userMsg.trim() && !pdf) return;
    const newMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/portal/agente-pericial/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, sessionId, pdf: pdf || null, pdfName: pdfName || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      if (data.informeCreado) setInformeCreado(true);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally { setLoading(false); }
  };

  const handleReset = () => { setMessages([]); setPdfFile(null); setInformeCreado(false); };

  return (
    <>
      <Header title="Agente Pericial" subtitle="Chat IA" />
      <div className="p-4 lg:p-6">
        <div className="flex flex-col" style={{ height: "calc(100vh - 180px)" }}>
          {messages.length === 0 ? (
            <div
              onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0]); }}
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
                      "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-brand-purple text-white rounded-tr-sm"
                        : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] rounded-tl-sm"
                    )}>
                      {msg.role === "assistant" ? <MarkdownText content={msg.content} /> : msg.content}
                    </div>
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
      </div>
    </>
  );
}
