"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/shared/Header";
import {
  Database, Copy, Play, CheckCircle, AlertCircle, Loader2,
  MessageSquare, Calendar, Users, Globe, Briefcase, ChevronDown,
  ChevronUp, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  bg: string;
  sql: string;
}

const TEMPLATES: Template[] = [
  {
    id: "conversaciones",
    name: "Conversaciones WhatsApp",
    description: "Tabla para almacenar mensajes entre el agente IA y los clientes por WhatsApp",
    icon: MessageSquare,
    color: "text-success",
    bg: "bg-success/10",
    sql: `CREATE TABLE IF NOT EXISTS public.conversaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  telefono text NOT NULL,
  nombre_cliente text NULL,
  mensaje text NOT NULL,
  rol text NOT NULL DEFAULT 'cliente',
  session_id text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),

  CONSTRAINT conversaciones_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_conversaciones_telefono ON public.conversaciones (telefono);
CREATE INDEX IF NOT EXISTS idx_conversaciones_created ON public.conversaciones (created_at DESC);

-- Habilitar RLS (opcional)
-- ALTER TABLE public.conversaciones ENABLE ROW LEVEL SECURITY;`,
  },
  {
    id: "citas",
    name: "Citas / Reuniones",
    description: "Tabla para gestionar citas, reuniones y agendamientos con clientes",
    icon: Calendar,
    color: "text-brand-cyan",
    bg: "bg-brand-cyan/10",
    sql: `CREATE TABLE IF NOT EXISTS public.citas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  paciente_nombre text NOT NULL,
  paciente_telefono text NULL,
  paciente_email text NULL,
  fecha_cita date NOT NULL,
  hora_cita time NULL,
  estado text NOT NULL DEFAULT 'pendiente',
  tipo_cita text NULL,
  notas text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),

  CONSTRAINT citas_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_citas_fecha ON public.citas (fecha_cita);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON public.citas (estado);`,
  },
  {
    id: "leads",
    name: "Leads / Clientes",
    description: "Tabla CRM para gestionar leads, contactos y clientes potenciales",
    icon: Users,
    color: "text-brand-purple",
    bg: "bg-brand-purple/10",
    sql: `CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  telefono text NULL,
  email text NULL,
  estado text NOT NULL DEFAULT 'nuevo',
  fuente text NULL,
  notas text NULL,
  fecha_registro timestamp with time zone NULL DEFAULT now(),

  CONSTRAINT clientes_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_clientes_estado ON public.clientes (estado);
CREATE INDEX IF NOT EXISTS idx_clientes_fecha ON public.clientes (fecha_registro DESC);`,
  },
  {
    id: "webs",
    name: "Webs y Suscripciones",
    description: "Registro de páginas web donde estás registrado con usuarios, contraseñas y planes",
    icon: Globe,
    color: "text-warning",
    bg: "bg-warning/10",
    sql: `CREATE TABLE IF NOT EXISTS public.webs_suscripciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  url text NOT NULL,
  nombre_web text NULL,
  descripcion text NULL,
  usuario text NULL,
  password text NULL,
  precio decimal NULL,
  plan text NULL,
  estado text NOT NULL DEFAULT 'activa',
  fecha_alta date NULL DEFAULT CURRENT_DATE,
  fecha_renovacion date NULL,
  notas text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),

  CONSTRAINT webs_suscripciones_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_webs_estado ON public.webs_suscripciones (estado);`,
  },
  {
    id: "empresas",
    name: "Empresas Contactadas",
    description: "CRM de ventas para registrar empresas contactadas, seguimientos y estados de negociación",
    icon: Briefcase,
    color: "text-brand-cyan",
    bg: "bg-brand-cyan/10",
    sql: `CREATE TABLE IF NOT EXISTS public.empresas_contactadas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre_empresa text NOT NULL,
  persona_contacto text NULL,
  medio_contacto text NOT NULL DEFAULT 'Email',
  dato_contacto text NULL,
  estado text NOT NULL DEFAULT 'Contactado',
  mensaje_enviado text NULL,
  respuesta text NULL,
  sector text NULL,
  web_empresa text NULL,
  fecha_contacto date NULL DEFAULT CURRENT_DATE,
  fecha_seguimiento date NULL,
  notas text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),

  CONSTRAINT empresas_contactadas_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_empresas_estado ON public.empresas_contactadas (estado);
CREATE INDEX IF NOT EXISTS idx_empresas_fecha ON public.empresas_contactadas (fecha_contacto DESC);
CREATE INDEX IF NOT EXISTS idx_empresas_medio ON public.empresas_contactadas (medio_contacto);

-- Estados posibles: Contactado, Contestado, Interesado, Venta cerrada, Rechazado, Cliente potencial
-- Medios posibles: Instagram, Email, Facebook, LinkedIn, WhatsApp, Teléfono, Otro`,
  },
];

export default function TemplatesPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [executing, setExecuting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: string; text: string; sql?: string; url?: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const res = await fetch("/api/admin/clients");
      const data = await res.json();
      setClients(Array.isArray(data) ? data.filter((c: any) => c.has_credentials) : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const copySQL = (template: Template) => {
    navigator.clipboard.writeText(template.sql);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const executeSQL = async (template: Template) => {
    if (!selectedClient) {
      setMessage({ type: "error", text: "Selecciona un cliente primero" });
      return;
    }
    setExecuting(template.id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: selectedClient, sql: template.sql }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: `Tabla "${template.name}" creada correctamente en el Supabase del cliente` });
      } else {
        const clientData = clients.find(c => c.id === selectedClient);
        setMessage({
          type: "warning",
          text: data.message || "No se pudo ejecutar automáticamente. Copia el SQL y ejecútalo manualmente.",
          sql: template.sql,
          url: data.supabase_url ? `${data.supabase_url}` : undefined,
        });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setExecuting(null);
    }
  };

  return (
    <>
      <Header title="Plantillas SQL" subtitle="Tablas predefinidas para crear en el Supabase de los clientes" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Client selector */}
        <div className="card">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-brand-purple" />
              <span className="font-semibold text-sm">Ejecutar en:</span>
            </div>
            <select
              className="input-field w-auto min-w-[250px]"
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
            >
              <option value="">Seleccionar cliente...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.empresa || c.nombre || c.email}</option>
              ))}
            </select>
            <span className="text-xs text-[var(--muted-foreground)]">
              Solo clientes con Supabase conectado
            </span>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className={cn("p-4 rounded-lg text-sm",
            message.type === "success" && "bg-success/10 border border-success/20 text-success",
            message.type === "error" && "bg-danger/10 border border-danger/20 text-danger",
            message.type === "warning" && "bg-warning/10 border border-warning/20 text-warning"
          )}>
            <div className="flex items-start gap-2">
              {message.type === "success" ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
              <div>
                <p>{message.text}</p>
                {message.url && (
                  <a href={`${message.url}/project/default/sql`} target="_blank" rel="noopener"
                    className="inline-flex items-center gap-1 mt-2 text-xs underline">
                    Abrir SQL Editor del cliente <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Templates */}
        <div className="space-y-4">
          {TEMPLATES.map(template => {
            const Icon = template.icon;
            const isExpanded = expandedTemplate === template.id;

            return (
              <div key={template.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-2.5 rounded-lg", template.bg)}>
                      <Icon className={cn("w-5 h-5", template.color)} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-[var(--muted-foreground)]">{template.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copySQL(template)}
                      className="btn-ghost text-xs flex items-center gap-1.5"
                    >
                      {copiedId === template.id ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                      {copiedId === template.id ? "Copiado" : "Copiar SQL"}
                    </button>
                    <button
                      onClick={() => executeSQL(template)}
                      disabled={!selectedClient || executing === template.id}
                      className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {executing === template.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      {executing === template.id ? "Ejecutando..." : "Ejecutar"}
                    </button>
                    <button
                      onClick={() => setExpandedTemplate(isExpanded ? null : template.id)}
                      className="btn-ghost p-2"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <pre className="text-xs font-mono bg-[var(--muted)] p-4 rounded-lg overflow-x-auto whitespace-pre text-[var(--muted-foreground)]">
                      {template.sql}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
