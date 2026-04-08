"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/shared/Header";
import {
  Bot, Plus, Loader2, Edit, Trash2, X, Save, CheckCircle,
  DollarSign, Zap, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Agente {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  periodicidad: string;
  activo: boolean;
}

export default function AgentesPage() {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Agente | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "", precio: "", periodicidad: "mensual", activo: true });

  useEffect(() => { loadAgentes(); }, []);

  const loadAgentes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/agentes");
      const data = await res.json();
      setAgentes(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: "", descripcion: "", precio: "", periodicidad: "mensual", activo: true });
    setModalOpen(true);
  };

  const openEdit = (a: Agente) => {
    setEditing(a);
    setForm({ nombre: a.nombre, descripcion: a.descripcion || "", precio: String(a.precio), periodicidad: a.periodicidad, activo: a.activo });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.precio) return;
    setSaving(true);
    try {
      const method = editing ? "PATCH" : "POST";
      const body = editing ? { id: editing.id, ...form } : form;
      const res = await fetch("/api/admin/agentes", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setModalOpen(false);
      setMessage({ type: "success", text: editing ? "Agente actualizado" : "Agente creado correctamente" });
      loadAgentes();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) { setMessage({ type: "error", text: err.message }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este agente del catálogo?")) return;
    await fetch(`/api/admin/agentes?id=${id}`, { method: "DELETE" });
    loadAgentes();
  };

  const periodicidadLabel = (p: string) => {
    switch (p) { case "mensual": return "/mes"; case "anual": return "/año"; case "trimestral": return "/trimestre"; case "unico": return "(único)"; default: return ""; }
  };

  return (
    <>
      <Header title="Agentes" subtitle="Catálogo de agentes IA que vendes">
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Nuevo agente</span>
        </button>
      </Header>

      <div className="p-4 lg:p-6 space-y-6">
        {message && (
          <div className={cn("flex items-center gap-2 p-3 rounded-lg text-sm",
            message.type === "success" ? "bg-success/10 border border-success/20 text-success" : "bg-danger/10 border border-danger/20 text-danger")}>
            {message.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{message.text}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-purple" /></div>
        ) : agentes.length === 0 ? (
          <div className="card text-center py-16">
            <Bot className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sin agentes en el catálogo</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-sm mx-auto">
              Crea los agentes que vendes (HERMES, AFRODITA, etc.) con sus precios para poder asignarlos a clientes.
            </p>
            <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4 mr-2 inline" />Crear primer agente</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentes.map(agente => (
              <div key={agente.id} className={cn("card relative group", !agente.activo && "opacity-60")}>
                {/* Actions */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(agente)} className="p-1.5 rounded-lg hover:bg-brand-purple/10 text-[var(--muted-foreground)] hover:text-brand-purple"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(agente.id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-[var(--muted-foreground)] hover:text-danger"><Trash2 className="w-4 h-4" /></button>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-lg bg-brand-purple/10">
                    <Zap className="w-5 h-5 text-brand-purple" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{agente.nombre}</h3>
                    {!agente.activo && <span className="text-[10px] text-danger font-medium">Inactivo</span>}
                  </div>
                </div>

                {agente.descripcion && (
                  <p className="text-sm text-[var(--muted-foreground)] mb-3 line-clamp-2">{agente.descripcion}</p>
                )}

                <div className="flex items-end justify-between mt-auto pt-3 border-t border-[var(--border)]">
                  <div>
                    <span className="text-2xl font-bold">{agente.precio}€</span>
                    <span className="text-sm text-[var(--muted-foreground)] ml-1">{periodicidadLabel(agente.periodicidad)}</span>
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)] capitalize">{agente.periodicidad}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setModalOpen(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-md animate-fade-in">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                  <h3 className="font-semibold">{editing ? "Editar agente" : "Nuevo agente"}</h3>
                  <button onClick={() => setModalOpen(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Nombre del agente *</label>
                    <input className="input-field" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: HERMES WhatsApp" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Descripción</label>
                    <textarea className="input-field min-h-[60px]" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Agente de WhatsApp que responde, agenda citas..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Precio (€) *</label>
                      <input type="number" className="input-field" value={form.precio} onChange={e => setForm(p => ({ ...p, precio: e.target.value }))} placeholder="297" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Periodicidad</label>
                      <select className="input-field" value={form.periodicidad} onChange={e => setForm(p => ({ ...p, periodicidad: e.target.value }))}>
                        <option value="mensual">Mensual</option>
                        <option value="trimestral">Trimestral</option>
                        <option value="anual">Anual</option>
                        <option value="unico">Pago único</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
                    <button onClick={handleSave} disabled={saving || !form.nombre || !form.precio} className="btn-primary flex items-center gap-2 disabled:opacity-50">
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
    </>
  );
}
