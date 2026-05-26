"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/shared/Header";
import {
  ArrowLeft, Loader2, Database, Users, Calendar, MessageSquare,
  LayoutGrid, Edit, Trash2, Bot, Save, X, Eye, ExternalLink, Shield,
  CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, Mail,
  Zap, Plus, DollarSign, Percent, Globe, Briefcase
} from "lucide-react";
import Link from "next/link";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";

interface ClientDetail {
  id: string;
  email: string;
  nombre: string | null;
  empresa: string | null;
  plan: string;
  estado: string;
  supabase_url: string | null;
  has_credentials: boolean;
  max_usuarios: number;
  coste_hora: number;
  minutos_por_conv: number;
  created_at: string;
  updated_at: string;
}

interface Module {
  id: string;
  tipo: string;
  nombre_display: string;
  icono: string;
  tabla_origen: string;
  visible: boolean;
  permite_crear: boolean;
  permite_editar: boolean;
  permite_eliminar: boolean;
}

interface TeamMember {
  id: string;
  email: string;
  nombre: string | null;
  rol_cliente: string;
  activo: boolean;
  ultimo_acceso: string | null;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => { loadClient(); }, [clientId]);

  const loadClient = async () => {
    setLoading(true);
    try {
      // Load client
      const clientRes = await fetch("/api/admin/clients");
      const clients = await clientRes.json();
      const found = (Array.isArray(clients) ? clients : []).find((c: any) => c.id === clientId);
      if (!found) { setError("Cliente no encontrado"); return; }
      setClient(found);
      setEditForm({
        nombre: found.nombre || "",
        empresa: found.empresa || "",
        plan: found.plan,
        estado: found.estado,
        max_usuarios: found.max_usuarios,
        coste_hora: found.coste_hora,
        minutos_por_conv: found.minutos_por_conv,
      });

      // Load modules
      const modRes = await fetch(`/api/admin/modules?cliente_id=${clientId}`);
      const modData = await modRes.json();
      setModules(Array.isArray(modData) ? modData : []);

      // Load team (using admin supabase via a simple fetch)
      // We'll use the clients endpoint for now
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveClient = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clientId, ...editForm }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setEditing(false);
      setMessage("Cliente actualizado correctamente");
      loadClient();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteClient = async () => {
    if (!confirm("¿Estás SEGURO de eliminar este cliente? Se borrarán todos sus datos, módulos y usuarios del portal.")) return;
    try {
      const res = await fetch(`/api/admin/clients?id=${clientId}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      router.push("/admin/clients");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleEstado = async () => {
    const newEstado = client?.estado === "activo" ? "suspendido" : "activo";
    try {
      const res = await fetch("/api/admin/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clientId, estado: newEstado }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setMessage(`Cliente ${newEstado === "activo" ? "activado" : "suspendido"}`);
      loadClient();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getModuleIcon = (tipo: string) => {
    switch (tipo) {
      case "leads": return <Users className="w-4 h-4 text-brand-purple" />;
      case "citas": return <Calendar className="w-4 h-4 text-brand-cyan" />;
      case "conversaciones": return <MessageSquare className="w-4 h-4 text-success" />;
      case "agente_pericial": return <Bot className="w-4 h-4 text-brand-cyan" />;
      default: return <LayoutGrid className="w-4 h-4 text-warning" />;
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Detalle de Cliente" />
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-purple" /></div>
      </>
    );
  }

  if (!client) {
    return (
      <>
        <Header title="Cliente no encontrado" />
        <div className="p-6">
          <Link href="/admin/clients" className="btn-ghost inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />Volver
          </Link>
          <div className="card mt-4 text-center py-12">
            <AlertCircle className="w-12 h-12 text-danger mx-auto mb-3" />
            <p className="text-sm text-[var(--muted-foreground)]">{error || "Cliente no encontrado"}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={client.empresa || client.nombre || client.email} subtitle={`ID: ${client.id}`} />

      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <ArrowLeft className="w-4 h-4" />Volver a clientes
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={toggleEstado} className={cn("btn-ghost text-xs", client.estado === "activo" ? "text-warning" : "text-success")}>
              {client.estado === "activo" ? "Suspender" : "Activar"}
            </button>
            <button onClick={deleteClient} className="btn-danger text-xs flex items-center gap-1">
              <Trash2 className="w-3 h-3" />Eliminar
            </button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm">
            <CheckCircle className="w-4 h-4" />{message}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Info */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Información del cliente</h3>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="btn-ghost text-xs flex items-center gap-1">
                  <Edit className="w-3 h-3" />Editar
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="btn-ghost text-xs"><X className="w-3 h-3 mr-1 inline" />Cancelar</button>
                  <button onClick={saveClient} disabled={saving} className="btn-primary text-xs flex items-center gap-1">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}Guardar
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Nombre</label>
                    <input className="input-field" value={editForm.nombre} onChange={e => setEditForm((p: any) => ({ ...p, nombre: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Empresa</label>
                    <input className="input-field" value={editForm.empresa} onChange={e => setEditForm((p: any) => ({ ...p, empresa: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Plan</label>
                    <select className="input-field" value={editForm.plan} onChange={e => setEditForm((p: any) => ({ ...p, plan: e.target.value }))}>
                      <option value="basico">Básico</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">€/hora</label>
                    <input type="number" className="input-field" value={editForm.coste_hora} onChange={e => setEditForm((p: any) => ({ ...p, coste_hora: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Min/conv</label>
                    <input type="number" className="input-field" value={editForm.minutos_por_conv} onChange={e => setEditForm((p: any) => ({ ...p, minutos_por_conv: e.target.value }))} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-[var(--muted-foreground)]">Email</span>
                  <p className="font-medium">{client.email}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--muted-foreground)]">Nombre</span>
                  <p className="font-medium">{client.nombre || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--muted-foreground)]">Empresa</span>
                  <p className="font-medium">{client.empresa || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--muted-foreground)]">Plan</span>
                  <p className="font-medium capitalize">{client.plan}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--muted-foreground)]">€/hora ahorro</span>
                  <p className="font-medium">{client.coste_hora}€</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--muted-foreground)]">Min/conversación</span>
                  <p className="font-medium">{client.minutos_por_conv} min</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--muted-foreground)]">Creado</span>
                  <p className="font-medium">{formatDate(client.created_at)}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--muted-foreground)]">Actualizado</span>
                  <p className="font-medium">{formatRelativeTime(client.updated_at)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Status & Connection */}
          <div className="space-y-4">
            <div className="card">
              <h4 className="text-sm font-semibold mb-3">Estado</h4>
              <div className="flex items-center gap-2 mb-3">
                {client.estado === "activo" ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-danger" />
                )}
                <span className={cn("text-sm font-semibold capitalize", client.estado === "activo" ? "text-success" : "text-danger")}>
                  {client.estado}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Database className={cn("w-4 h-4", client.has_credentials ? "text-success" : "text-[var(--muted-foreground)]")} />
                <span className="text-xs">{client.has_credentials ? "Supabase conectado" : "Sin conexión"}</span>
              </div>
              {client.supabase_url && (
                <p className="text-[10px] text-[var(--muted-foreground)] mt-1 font-mono truncate">{client.supabase_url}</p>
              )}
            </div>

            <div className="card">
              <h4 className="text-sm font-semibold mb-3">Configuración</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Max usuarios</span>
                  <span className="font-medium">{client.max_usuarios}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Módulos</span>
                  <span className="font-medium">{modules.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modules */}
        <ClientModulesSection clientId={clientId} modules={modules} onReload={loadClient} />

        {/* Agents Contracted */}
        <ClientAgentsSection clientId={clientId} />
      </div>
    </>
  );
}

// ── Client Modules Sub-Component ──
const MOD_TYPES = [
  { id: "leads", label: "Leads / CRM", icon: Users },
  { id: "citas", label: "Citas / Reuniones", icon: Calendar },
  { id: "conversaciones", label: "Conversaciones", icon: MessageSquare },
  { id: "webs", label: "Webs / Suscripciones", icon: Globe },
  { id: "empresas", label: "Empresas Contactadas", icon: Briefcase },
  { id: "email", label: "Email / Correo", icon: Mail },
  { id: "agente_pericial", label: "Agente Pericial IA", icon: Bot },
  { id: "clientes_pericial", label: "Clientes Pericial", icon: Users },
  { id: "informes_pericial", label: "Informes Pericial", icon: Database },
  { id: "citas_pericial", label: "Citas Pericial", icon: Calendar },
  { id: "documentacion_pericial", label: "Documentación Pericial", icon: Database },
  { id: "generico", label: "Genérico", icon: LayoutGrid },
];

const NO_TABLE_TYPES = ["email", "conversaciones", "agente_pericial", "documentacion_pericial"];

function ClientModulesSection({ clientId, modules, onReload }: { clientId: string; modules: Module[]; onReload: () => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre_display: "", tipo: "generico", tabla_origen: "", icono: "LayoutGrid", permite_crear: true, permite_editar: true, permite_eliminar: true, visible: true, webhook_url: "" });
  const [tables, setTables] = useState<{ name: string; row_count: number }[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [tablesLoaded, setTablesLoaded] = useState(false);

  const loadTables = async () => {
    if (tablesLoaded) return;
    setLoadingTables(true);
    try {
      const res = await fetch(`/api/admin/detect-tables-by-client?cliente_id=${clientId}`);
      const data = await res.json();
      if (res.ok && data.tables) { setTables(data.tables); setTablesLoaded(true); }
      else { console.error(data.error); }
    } catch (e) { console.error(e); }
    finally { setLoadingTables(false); }
  };

  const openAdd = () => {
    setEditingModule(null);
    setForm({ nombre_display: "", tipo: "generico", tabla_origen: "", icono: "LayoutGrid", permite_crear: true, permite_editar: true, permite_eliminar: true, visible: true, webhook_url: "" });
    setModalOpen(true);
    loadTables();
  };

  const openEdit = (mod: Module) => {
    setEditingModule(mod);
    setForm({ nombre_display: mod.nombre_display, tipo: mod.tipo, tabla_origen: mod.tabla_origen, icono: mod.icono, permite_crear: mod.permite_crear, permite_editar: mod.permite_editar, permite_eliminar: mod.permite_eliminar, visible: mod.visible, webhook_url: mod.config_visual?.webhook_url || "", tabla_solicitudes: mod.config_visual?.tabla_solicitudes || "", tabla_documentos: mod.config_visual?.tabla_documentos || "", columna_storage: mod.config_visual?.columna_storage || "", bucket_name: mod.config_visual?.bucket_name || "", webhook_completar: mod.config_visual?.webhook_completar || "" } as any);
    setModalOpen(true);
    loadTables();
  };

  const handleTypeChange = (tipo: string) => {
    const t = MOD_TYPES.find(m => m.id === tipo);
    setForm(p => ({ ...p, tipo, nombre_display: p.nombre_display || t?.label || "", tabla_origen: NO_TABLE_TYPES.includes(tipo) ? "" : p.tabla_origen }));
  };

  const handleSave = async () => {
    if (!form.nombre_display) { alert("El nombre es obligatorio"); return; }
    if (!NO_TABLE_TYPES.includes(form.tipo) && !form.tabla_origen) { alert("Selecciona una tabla origen"); return; }
    if (form.tipo === "agente_pericial" && !form.webhook_url) { alert("La URL del webhook de N8N es obligatoria"); return; }
    if (form.tipo === "documentacion_pericial" && !form.webhook_url) { alert("La URL del webhook de N8N es obligatoria"); return; }
    setSaving(true);
    try {
      const payload: Record<string, any> = { ...form };
      if (form.tipo === "agente_pericial") {
        payload.config_visual = { ...(editingModule?.config_visual || {}), webhook_url: form.webhook_url };
      }
      if (form.tipo === "documentacion_pericial") {
        payload.config_visual = {
          ...(editingModule?.config_visual || {}),
          webhook_url: form.webhook_url,
          webhook_completar: (form as any).webhook_completar || "",
          tabla_solicitudes: (form as any).tabla_solicitudes || "solicitudes_documentacion",
          tabla_documentos: (form as any).tabla_documentos || "documentos_recibidos",
          columna_storage: (form as any).columna_storage || "url_storage",
          bucket_name: (form as any).bucket_name || "documentos-periciales",
        };
      }
      delete payload.webhook_url;
      delete payload.webhook_completar;
      delete payload.tabla_solicitudes;
      delete payload.tabla_documentos;
      delete payload.columna_storage;
      delete payload.bucket_name;

      if (editingModule) {
        const res = await fetch("/api/admin/modules", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingModule.id, ...payload }) });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        const res = await fetch("/api/admin/modules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cliente_id: clientId, module: payload }) });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      setModalOpen(false); onReload();
    } catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async (modId: string, nombre: string) => {
    if (!confirm(`Eliminar el módulo "${nombre}"?`)) return;
    try { const res = await fetch(`/api/admin/modules?id=${modId}`, { method: "DELETE" }); if (!res.ok) throw new Error((await res.json()).error); onReload(); } catch (err: any) { alert(err.message); }
  };

  const getIcon = (tipo: string) => { const t = MOD_TYPES.find(m => m.id === tipo); const I = t?.icon || LayoutGrid; return <I className="w-4 h-4" />; };

  const needsTable = !NO_TABLE_TYPES.includes(form.tipo);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Módulos configurados ({modules.length})</h3>
        <button onClick={openAdd} className="btn-primary text-xs flex items-center gap-1"><Plus className="w-3 h-3" />Añadir módulo</button>
      </div>
      {modules.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] py-4">Sin módulos configurados</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map(mod => (
            <div key={mod.id} className="p-3 rounded-lg border border-[var(--border)] flex items-center gap-3">
              {getIcon(mod.tipo)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{mod.nombre_display}</p>
                <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
                  <span className="capitalize">{mod.tipo}</span>
                  {mod.tabla_origen && <span>← {mod.tabla_origen}</span>}
                  {mod.config_visual?.webhook_url && <span className="truncate max-w-[150px]" title={mod.config_visual.webhook_url}>🔗 webhook</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(mod)} className="p-1 rounded hover:bg-brand-purple/10 text-[var(--muted-foreground)]"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(mod.id, mod.nombre_display)} className="p-1 rounded hover:bg-danger/10 text-[var(--muted-foreground)]"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modalOpen && (<>
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setModalOpen(false)} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] sticky top-0 bg-[var(--card)] z-10">
              <h3 className="font-semibold">{editingModule ? "Editar módulo" : "Añadir módulo"}</h3>
              <button onClick={() => setModalOpen(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium mb-2">Tipo de módulo</label>
                <div className="flex flex-wrap gap-2">{MOD_TYPES.map(mt => { const Icon = mt.icon; return (
                  <button key={mt.id} onClick={() => handleTypeChange(mt.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", form.tipo === mt.id ? "border-brand-purple bg-brand-purple/10 text-brand-purple" : "border-[var(--border)] text-[var(--muted-foreground)]")}><Icon className="w-3.5 h-3.5" />{mt.label}</button>
                ); })}</div>
              </div>

              {/* Nombre */}
              <div><label className="block text-sm font-medium mb-1.5">Nombre visible *</label><input className="input-field" value={form.nombre_display} onChange={e => setForm(p => ({ ...p, nombre_display: e.target.value }))} placeholder="Ej: Citas, Email..." /></div>

              {/* Tabla origen — dropdown con tablas detectadas */}
              {needsTable && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tabla origen *</label>
                  {loadingTables ? (
                    <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] py-2"><Loader2 className="w-4 h-4 animate-spin" />Detectando tablas del cliente...</div>
                  ) : tables.length > 0 ? (
                    <select className="input-field" value={form.tabla_origen} onChange={e => setForm(p => ({ ...p, tabla_origen: e.target.value }))}>
                      <option value="">— Selecciona una tabla —</option>
                      {tables.map(t => (
                        <option key={t.name} value={t.name}>{t.name} ({t.row_count} filas)</option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <input className="input-field" value={form.tabla_origen} onChange={e => setForm(p => ({ ...p, tabla_origen: e.target.value }))} placeholder="Nombre de la tabla" />
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">No se pudieron detectar tablas. Escribe el nombre manualmente.</p>
                    </div>
                  )}
                  {tables.length > 0 && form.tabla_origen && (
                    <p className="text-[10px] text-success mt-1">✓ Tabla seleccionada: {form.tabla_origen}</p>
                  )}
                </div>
              )}

              {/* Info boxes para tipos especiales */}
              {form.tipo === "email" && <div className="p-3 rounded-lg bg-brand-purple/5 border border-brand-purple/20 text-xs text-[var(--muted-foreground)]"><Mail className="w-4 h-4 text-brand-purple inline mr-1.5" />El módulo Email no necesita tabla. El cliente conecta sus cuentas desde su portal.</div>}

              {form.tipo === "agente_pericial" && <div className="space-y-3">
                <div className="p-3 rounded-lg bg-brand-cyan/5 border border-brand-cyan/20 text-xs text-[var(--muted-foreground)]"><Bot className="w-4 h-4 text-brand-cyan inline mr-1.5" />El Agente Pericial se conecta a un workflow de N8N mediante webhook.</div>
                <div><label className="block text-sm font-medium mb-1.5">URL Webhook N8N *</label><input className="input-field" value={form.webhook_url} onChange={e => setForm(p => ({ ...p, webhook_url: e.target.value }))} placeholder="https://tu-n8n.com/webhook/agente-pericial-chat" /><p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">URL del webhook de N8N que procesa los mensajes del chat pericial</p></div>
              </div>}

              {form.tipo === "documentacion_pericial" && <div className="space-y-3">
                <div className="p-3 rounded-lg bg-brand-cyan/5 border border-brand-cyan/20 text-xs text-[var(--muted-foreground)]"><Database className="w-4 h-4 text-brand-cyan inline mr-1.5" />Documentación Pericial muestra citas completadas y permite solicitar documentación al asegurado via N8N.</div>
                <div><label className="block text-sm font-medium mb-1.5">URL Webhook N8N (Chat) *</label><input className="input-field" value={form.webhook_url} onChange={e => setForm(p => ({ ...p, webhook_url: e.target.value }))} placeholder="https://tu-n8n.com/webhook/documentacion-pericial" /></div>
                <div><label className="block text-sm font-medium mb-1.5">URL Webhook Marcar Completa</label><input className="input-field" value={(form as any).webhook_completar || ""} onChange={e => setForm(p => ({ ...p, webhook_completar: e.target.value } as any))} placeholder="https://tu-n8n.com/webhook/marcar-completa" /><p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Webhook que se llama al marcar documentación como completa</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium mb-1">Tabla solicitudes *</label><input className="input-field text-xs" value={(form as any).tabla_solicitudes || ""} onChange={e => setForm(p => ({ ...p, tabla_solicitudes: e.target.value } as any))} placeholder="solicitudes_documentacion" /><p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Tabla con los documentos solicitados</p></div>
                  <div><label className="block text-xs font-medium mb-1">Tabla documentos *</label><input className="input-field text-xs" value={(form as any).tabla_documentos || ""} onChange={e => setForm(p => ({ ...p, tabla_documentos: e.target.value } as any))} placeholder="documentos_recibidos" /><p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Tabla con los archivos recibidos</p></div>
                  <div><label className="block text-xs font-medium mb-1">Columna ruta archivo</label><input className="input-field text-xs" value={(form as any).columna_storage || ""} onChange={e => setForm(p => ({ ...p, columna_storage: e.target.value } as any))} placeholder="url_storage" /></div>
                  <div><label className="block text-xs font-medium mb-1">Nombre bucket Storage</label><input className="input-field text-xs" value={(form as any).bucket_name || ""} onChange={e => setForm(p => ({ ...p, bucket_name: e.target.value } as any))} placeholder="documentos-periciales" /></div>
                </div>
              </div>}

              {/* Permisos */}
              <div>
                <label className="block text-sm font-medium mb-2">Permisos</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.permite_crear} onChange={e => setForm(p => ({ ...p, permite_crear: e.target.checked }))} className="rounded" />Crear</label>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.permite_editar} onChange={e => setForm(p => ({ ...p, permite_editar: e.target.checked }))} className="rounded" />Editar</label>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.permite_eliminar} onChange={e => setForm(p => ({ ...p, permite_eliminar: e.target.checked }))} className="rounded" />Eliminar</label>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.visible} onChange={e => setForm(p => ({ ...p, visible: e.target.checked }))} className="rounded" />Visible</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? "Guardando..." : "Guardar"}</button>
              </div>
            </div>
          </div>
        </div>
      </>)}
    </div>
  );
}

// ── Client Agents Sub-Component ──
function ClientAgentsSection({ clientId }: { clientId: string }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [allAgentes, setAllAgentes] = useState<any[]>([]);
  const [totalMensual, setTotalMensual] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ agente_id: "", precio_custom: "", descuento: "0", fecha_inicio: "", fecha_fin: "", notas: "" });

  useEffect(() => { loadData(); }, [clientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignRes, agentRes] = await Promise.all([
        fetch(`/api/admin/client-agentes?cliente_id=${clientId}`),
        fetch("/api/admin/agentes"),
      ]);
      const assignData = await assignRes.json();
      const agentData = await agentRes.json();
      setAssignments(assignData.items || []);
      setTotalMensual(assignData.total_mensual || 0);
      setAllAgentes(Array.isArray(agentData) ? agentData : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditingAssignment(null);
    setForm({ agente_id: "", precio_custom: "", descuento: "0", fecha_inicio: new Date().toISOString().split("T")[0], fecha_fin: "", notas: "" });
    setModalOpen(true);
  };

  const openEdit = (a: any) => {
    setEditingAssignment(a);
    setForm({
      agente_id: a.agente_id,
      precio_custom: a.precio_custom !== null ? String(a.precio_custom) : "",
      descuento: String(a.descuento || 0),
      fecha_inicio: a.fecha_inicio || "",
      fecha_fin: a.fecha_fin || "",
      notas: a.notas || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editingAssignment ? "PATCH" : "POST";
      const body = editingAssignment
        ? { id: editingAssignment.id, ...form }
        : { cliente_id: clientId, ...form };
      const res = await fetch("/api/admin/client-agentes", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setModalOpen(false);
      loadData();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("¿Quitar este agente del cliente?")) return;
    await fetch(`/api/admin/client-agentes?id=${id}`, { method: "DELETE" });
    loadData();
  };

  const toggleActive = async (item: any) => {
    await fetch("/api/admin/client-agentes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, activo: !item.activo }),
    });
    loadData();
  };

  // Available agents (not yet assigned)
  const assignedAgentIds = assignments.map((a: any) => a.agente_id);
  const availableAgentes = allAgentes.filter((a: any) => !assignedAgentIds.includes(a.id) && a.activo);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-purple" />
            Agentes contratados
          </h3>
          {totalMensual > 0 && (
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              Total mensual: <span className="font-semibold text-[var(--foreground)]">{totalMensual.toFixed(2)}€/mes</span>
            </p>
          )}
        </div>
        <button onClick={openAdd} className="btn-primary text-xs flex items-center gap-1" disabled={availableAgentes.length === 0 && !editingAssignment}>
          <Plus className="w-3 h-3" />Añadir agente
        </button>
      </div>

      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-brand-purple mx-auto my-6" />
      ) : assignments.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-[var(--border)] rounded-lg">
          <Zap className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-2" />
          <p className="text-sm text-[var(--muted-foreground)]">Sin agentes asignados</p>
          {allAgentes.length === 0 && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Primero crea agentes en el <Link href="/admin/agentes" className="text-brand-purple">catálogo</Link>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((item: any) => {
            const precioBase = item.portal_agentes?.precio || 0;
            const precioFinal = item.precio_custom !== null ? item.precio_custom : precioBase;
            const descuento = item.descuento || 0;
            const precioConDescuento = precioFinal * (1 - descuento / 100);
            const hasCustomPrice = item.precio_custom !== null && item.precio_custom !== precioBase;

            return (
              <div key={item.id} className={cn("p-4 rounded-lg border border-[var(--border)] flex items-center gap-4", !item.activo && "opacity-50")}>
                <div className="p-2.5 rounded-lg bg-brand-purple/10 flex-shrink-0">
                  <Zap className="w-5 h-5 text-brand-purple" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm">{item.portal_agentes?.nombre || "Agente"}</span>
                    {!item.activo && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-danger/10 text-danger">Pausado</span>}
                    {hasCustomPrice && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning">Precio custom</span>}
                    {descuento > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success">-{descuento}%</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {hasCustomPrice && <span className="line-through">{precioBase}€</span>}
                      <span className="font-semibold text-[var(--foreground)]">{precioConDescuento.toFixed(2)}€</span>
                      <span>/{item.portal_agentes?.periodicidad === "mensual" ? "mes" : item.portal_agentes?.periodicidad}</span>
                    </span>
                    {item.fecha_inicio && <span>Desde {item.fecha_inicio}</span>}
                    {item.fecha_fin && <span>Hasta {item.fecha_fin}</span>}
                  </div>
                  {item.notas && <p className="text-[10px] text-[var(--muted-foreground)] mt-1 italic">{item.notas}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive(item)} className={cn("p-1.5 rounded-lg text-xs", item.activo ? "hover:bg-warning/10 text-[var(--muted-foreground)]" : "hover:bg-success/10 text-success")} title={item.activo ? "Pausar" : "Activar"}>
                    {item.activo ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-brand-purple/10 text-[var(--muted-foreground)] hover:text-brand-purple"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleRemove(item.id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-[var(--muted-foreground)] hover:text-danger"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-md animate-fade-in">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                <h3 className="font-semibold">{editingAssignment ? "Editar agente" : "Añadir agente"}</h3>
                <button onClick={() => setModalOpen(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                {!editingAssignment && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Agente *</label>
                    <select className="input-field" value={form.agente_id} onChange={e => setForm(p => ({ ...p, agente_id: e.target.value }))}>
                      <option value="">Seleccionar agente</option>
                      {availableAgentes.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.nombre} — {a.precio}€/{a.periodicidad}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Precio custom (€)</label>
                    <input type="number" className="input-field" value={form.precio_custom}
                      onChange={e => setForm(p => ({ ...p, precio_custom: e.target.value }))}
                      placeholder="Dejar vacío = precio catálogo" />
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Vacío = usa el precio del catálogo</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Descuento (%)</label>
                    <input type="number" className="input-field" value={form.descuento}
                      onChange={e => setForm(p => ({ ...p, descuento: e.target.value }))}
                      placeholder="0" min="0" max="100" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Fecha inicio</label>
                    <input type="date" className="input-field" value={form.fecha_inicio}
                      onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Fecha fin (opcional)</label>
                    <input type="date" className="input-field" value={form.fecha_fin}
                      onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))} />
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Para descuentos temporales</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Notas</label>
                  <textarea className="input-field min-h-[50px]" value={form.notas}
                    onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                    placeholder="Ej: Instalación incluida primer mes, descuento por 3 meses..." />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
                  <button onClick={handleSave} disabled={saving || (!editingAssignment && !form.agente_id)}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
