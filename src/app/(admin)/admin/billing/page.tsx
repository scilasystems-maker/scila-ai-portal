"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/shared/Header";
import {
  CreditCard, Plus, Loader2, Clock, CheckCircle, XCircle,
  Edit, Trash2, X, Save, Download
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface Factura {
  id: string; cliente_id: string; concepto: string; importe: number;
  estado: string; fecha_emision: string; fecha_vencimiento: string | null;
  notas: string | null; portal_clientes: { empresa: string; nombre: string; email: string } | null;
}

const FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "pendiente", label: "Pendientes" },
  { id: "pagado", label: "Pagadas" },
  { id: "vencido", label: "Vencidas" },
];

export default function BillingPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [resumen, setResumen] = useState({ pendiente: 0, pagado: 0, vencido: 0 });
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [filter, setFilter] = useState("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Factura | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ cliente_id: "", concepto: "", importe: "", estado: "pendiente", fecha_emision: "", fecha_vencimiento: "", notas: "" });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [billRes, clientRes] = await Promise.all([fetch("/api/admin/billing"), fetch("/api/admin/clients")]);
      const billData = await billRes.json();
      const clientData = await clientRes.json();
      setFacturas(billData.facturas || []);
      setResumen(billData.resumen || { pendiente: 0, pagado: 0, vencido: 0 });
      setClients(Array.isArray(clientData) ? clientData : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ cliente_id: "", concepto: "", importe: "", estado: "pendiente", fecha_emision: new Date().toISOString().split("T")[0], fecha_vencimiento: "", notas: "" });
    setModalOpen(true);
  };

  const openEdit = (f: Factura) => {
    setEditing(f);
    setForm({ cliente_id: f.cliente_id, concepto: f.concepto, importe: String(f.importe), estado: f.estado, fecha_emision: f.fecha_emision, fecha_vencimiento: f.fecha_vencimiento || "", notas: f.notas || "" });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editing ? "PATCH" : "POST";
      const body = editing ? { id: editing.id, ...form } : form;
      const res = await fetch("/api/admin/billing", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setModalOpen(false); loadData();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta factura?")) return;
    await fetch(`/api/admin/billing?id=${id}`, { method: "DELETE" }); loadData();
  };

  const exportCSV = () => {
    const headers = "Cliente,Concepto,Importe,Estado,Emisión,Vencimiento,Notas\n";
    const rows = facturas.map(f => `"${f.portal_clientes?.empresa || ""}","${f.concepto}",${f.importe},"${f.estado}","${f.fecha_emision}","${f.fecha_vencimiento || ""}","${f.notas || ""}"`).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([headers + rows], { type: "text/csv" })); a.download = `facturacion_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  };

  const estadoColor = (e: string) => e === "pagado" ? "bg-success/10 text-success" : e === "vencido" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning";
  const estadoIcon = (e: string) => e === "pagado" ? <CheckCircle className="w-4 h-4" /> : e === "vencido" ? <XCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />;

  const filtered = filter === "todas" ? facturas : facturas.filter(f => f.estado === filter);

  return (
    <>
      <Header title="Facturación" subtitle="Control de cobros a clientes">
        <button onClick={exportCSV} className="btn-ghost flex items-center gap-2"><Download className="w-4 h-4" /><span className="hidden sm:inline">CSV</span></button>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /><span className="hidden sm:inline">Nueva factura</span></button>
      </Header>

      <div className="p-4 lg:p-6 space-y-6">
        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card cursor-pointer hover:border-success/30 transition-colors" onClick={() => setFilter("pagado")}>
            <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-5 h-5 text-success" /><span className="text-sm text-[var(--muted-foreground)]">Total cobrado</span></div>
            <p className="text-2xl font-bold text-success">{resumen.pagado.toFixed(0)}€</p>
          </div>
          <div className="card cursor-pointer hover:border-warning/30 transition-colors" onClick={() => setFilter("pendiente")}>
            <div className="flex items-center gap-2 mb-2"><Clock className="w-5 h-5 text-warning" /><span className="text-sm text-[var(--muted-foreground)]">Pendiente de cobro</span></div>
            <p className="text-2xl font-bold text-warning">{resumen.pendiente.toFixed(0)}€</p>
          </div>
          <div className="card cursor-pointer hover:border-danger/30 transition-colors" onClick={() => setFilter("vencido")}>
            <div className="flex items-center gap-2 mb-2"><XCircle className="w-5 h-5 text-danger" /><span className="text-sm text-[var(--muted-foreground)]">Vencido</span></div>
            <p className="text-2xl font-bold text-danger">{resumen.vencido.toFixed(0)}€</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border border-[var(--border)] rounded-lg overflow-hidden w-fit">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={cn("px-4 py-2 text-xs font-medium transition-colors",
                filter === f.id ? "bg-brand-purple/10 text-brand-purple" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              )}>
              {f.label}
              {f.id !== "todas" && (
                <span className="ml-1.5 text-[10px]">
                  ({f.id === "pendiente" ? facturas.filter(x => x.estado === "pendiente").length :
                    f.id === "pagado" ? facturas.filter(x => x.estado === "pagado").length :
                    facturas.filter(x => x.estado === "vencido").length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Invoices */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-purple" /></div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12">
            <CreditCard className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-3" />
            <h3 className="font-semibold mb-2">{filter === "todas" ? "Sin facturas" : `Sin facturas ${filter}s`}</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              {filter === "todas" ? "Asigna agentes a clientes para generar facturas" : "No hay facturas con este estado"}
            </p>
            {filter !== "todas" && <button onClick={() => setFilter("todas")} className="btn-ghost text-sm">Ver todas</button>}
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Concepto</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Importe</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Emisión</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase">Vencimiento</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => (
                    <tr key={f.id} className={cn("border-b border-[var(--border)] hover:bg-[var(--muted)]/50",
                      f.estado === "pendiente" && "bg-warning/5"
                    )}>
                      <td className="px-4 py-3 font-medium">{f.portal_clientes?.empresa || f.portal_clientes?.nombre || "—"}</td>
                      <td className="px-4 py-3">{f.concepto}</td>
                      <td className="px-4 py-3 text-right font-semibold">{f.importe}€</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium", estadoColor(f.estado))}>
                          {estadoIcon(f.estado)}{f.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatDate(f.fecha_emision)}</td>
                      <td className="px-4 py-3">{f.fecha_vencimiento ? formatDate(f.fecha_vencimiento) : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(f)} className="p-1.5 rounded hover:bg-brand-purple/10 text-[var(--muted-foreground)] hover:text-brand-purple"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(f.id)} className="p-1.5 rounded hover:bg-danger/10 text-[var(--muted-foreground)] hover:text-danger"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {modalOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setModalOpen(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-lg animate-fade-in">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                  <h3 className="font-semibold">{editing ? "Editar factura" : "Nueva factura"}</h3>
                  <button onClick={() => setModalOpen(false)} className="btn-ghost p-1.5"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Cliente *</label>
                    <select className="input-field" value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}>
                      <option value="">Seleccionar</option>
                      {clients.map((c: any) => <option key={c.id} value={c.id}>{c.empresa || c.nombre || c.email}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Concepto *</label>
                    <input className="input-field" value={form.concepto} onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))} placeholder="HERMES — mayo 2026" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1.5">Importe (€) *</label><input type="number" className="input-field" value={form.importe} onChange={e => setForm(p => ({ ...p, importe: e.target.value }))} /></div>
                    <div><label className="block text-sm font-medium mb-1.5">Estado</label>
                      <select className="input-field" value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}>
                        <option value="pendiente">Pendiente</option><option value="pagado">Pagado</option><option value="vencido">Vencido</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1.5">Emisión</label><input type="date" className="input-field" value={form.fecha_emision} onChange={e => setForm(p => ({ ...p, fecha_emision: e.target.value }))} /></div>
                    <div><label className="block text-sm font-medium mb-1.5">Vencimiento</label><input type="date" className="input-field" value={form.fecha_vencimiento} onChange={e => setForm(p => ({ ...p, fecha_vencimiento: e.target.value }))} /></div>
                  </div>
                  <div><label className="block text-sm font-medium mb-1.5">Notas</label><textarea className="input-field min-h-[60px]" value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} /></div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
                    <button onClick={handleSave} disabled={saving || !form.cliente_id || !form.concepto} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? "Guardando..." : "Guardar"}
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
