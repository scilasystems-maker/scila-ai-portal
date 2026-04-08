"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/shared/Header";
import {
  ArrowLeft, Loader2, Database, Users, Calendar, MessageSquare,
  LayoutGrid, Edit, Trash2, Save, X, Eye, ExternalLink, Shield,
  CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, Mail,
  Zap, Plus, DollarSign, Percent
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
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Módulos configurados ({modules.length})</h3>
            <span></span>
          </div>

          {modules.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] py-4">Sin módulos configurados</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {modules.map(mod => (
                <div key={mod.id} className="p-3 rounded-lg border border-[var(--border)] flex items-center gap-3">
                  {getModuleIcon(mod.tipo)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{mod.nombre_display}</p>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
                      <span className="capitalize">{mod.tipo}</span>
                      <span>← {mod.tabla_origen}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {mod.permite_crear && <span className="w-1.5 h-1.5 rounded-full bg-success" title="Puede crear" />}
                    {mod.permite_editar && <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan" title="Puede editar" />}
                    {mod.permite_eliminar && <span className="w-1.5 h-1.5 rounded-full bg-danger" title="Puede eliminar" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agents Contracted */}
        <ClientAgentsSection clientId={clientId} />
      </div>
    </>
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
