"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/shared/Header";
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, Database,
  User, Key, Search, Puzzle, Eye, Rocket, ChevronDown, ChevronUp,
  Users, Calendar, MessageSquare, LayoutGrid, Image, Table2, Kanban,
  Zap, Plus, Trash2, DollarSign, Percent, X, Globe, Briefcase
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Datos", icon: User, desc: "Info + Agentes" },
  { id: 2, label: "Credenciales", icon: Key, desc: "Conexión Supabase" },
  { id: 3, label: "Tablas", icon: Database, desc: "Detección automática" },
  { id: 4, label: "Módulos", icon: Puzzle, desc: "Mapeo de tablas" },
  { id: 5, label: "Configurar", icon: Table2, desc: "Mapeo de campos" },
  { id: 6, label: "Preview", icon: Eye, desc: "Vista previa" },
  { id: 7, label: "Activar", icon: Rocket, desc: "Finalizar" },
];

const MODULE_TYPES = [
  { id: "leads", label: "Leads / CRM", icon: Users, color: "text-brand-purple", bg: "bg-brand-purple/10" },
  { id: "citas", label: "Citas / Reuniones", icon: Calendar, color: "text-brand-cyan", bg: "bg-brand-cyan/10" },
  { id: "conversaciones", label: "Conversaciones", icon: MessageSquare, color: "text-success", bg: "bg-success/10" },
  { id: "webs", label: "Webs / Suscripciones", icon: Globe, color: "text-warning", bg: "bg-warning/10" },
  { id: "empresas", label: "Empresas Contactadas", icon: Briefcase, color: "text-brand-cyan", bg: "bg-brand-cyan/10" },
  { id: "generico", label: "Genérico", icon: LayoutGrid, color: "text-[var(--muted-foreground)]", bg: "bg-[var(--muted)]" },
];

const VISTA_TYPES = [
  { id: "tabla", label: "Tabla", icon: Table2 },
  { id: "kanban", label: "Kanban", icon: Kanban },
  { id: "galeria", label: "Galería", icon: Image },
];

interface DetectedTable {
  name: string;
  columns: { column_name: string; data_type: string; is_nullable: string }[];
  row_count: number;
  preview: any[];
}

interface ModuleConfig {
  tabla_origen: string;
  tipo: string;
  nombre_display: string;
  icono: string;
  mapeo_campos: Record<string, string>;
  config_visual: { tipo_vista: string };
  permite_crear: boolean;
  permite_editar: boolean;
  permite_eliminar: boolean;
}

interface Agente {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  periodicidad: string;
  activo: boolean;
}

interface SelectedAgent {
  agente_id: string;
  nombre: string;
  precio_base: number;
  precio_custom: string;
  descuento: string;
  periodicidad: string;
  notas: string;
}

interface ExtraConcept {
  concepto: string;
  importe: string;
  notas: string;
}

export default function NewClientWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Client data
  const [clientData, setClientData] = useState({
    email: "", nombre: "", empresa: "", coste_hora: "15", minutos_por_conv: "5",
  });

  // Step 1: Agents
  const [allAgentes, setAllAgentes] = useState<Agente[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<SelectedAgent[]>([]);
  const [extraConcepts, setExtraConcepts] = useState<ExtraConcept[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  // Step 2: Supabase credentials
  const [credentials, setCredentials] = useState({ supabase_url: "", supabase_key: "" });

  // Step 3: Detected tables
  const [tables, setTables] = useState<DetectedTable[]>([]);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);

  // Step 4: Selected tables and module types
  const [selectedTables, setSelectedTables] = useState<Record<string, string>>({});

  // Step 5: Module configurations
  const [moduleConfigs, setModuleConfigs] = useState<Record<string, ModuleConfig>>({});

  // Step 7: Result
  const [result, setResult] = useState<any>(null);

  // Load agents catalog on mount
  useEffect(() => {
    loadAgentes();
  }, []);

  const loadAgentes = async () => {
    setLoadingAgents(true);
    try {
      const res = await fetch("/api/admin/agentes");
      const data = await res.json();
      setAllAgentes(Array.isArray(data) ? data.filter((a: Agente) => a.activo) : []);
    } catch (err) { console.error(err); }
    finally { setLoadingAgents(false); }
  };

  // ── Agent Management ──
  const addAgent = (agente: Agente) => {
    if (selectedAgents.find(a => a.agente_id === agente.id)) return;
    setSelectedAgents(prev => [...prev, {
      agente_id: agente.id,
      nombre: agente.nombre,
      precio_base: agente.precio,
      precio_custom: "",
      descuento: "0",
      periodicidad: agente.periodicidad,
      notas: "",
    }]);
  };

  const removeAgent = (agenteId: string) => {
    setSelectedAgents(prev => prev.filter(a => a.agente_id !== agenteId));
  };

  const updateAgent = (agenteId: string, field: string, value: string) => {
    setSelectedAgents(prev => prev.map(a =>
      a.agente_id === agenteId ? { ...a, [field]: value } : a
    ));
  };

  const addExtraConcept = () => {
    setExtraConcepts(prev => [...prev, { concepto: "", importe: "", notas: "" }]);
  };

  const removeExtraConcept = (index: number) => {
    setExtraConcepts(prev => prev.filter((_, i) => i !== index));
  };

  const updateExtraConcept = (index: number, field: string, value: string) => {
    setExtraConcepts(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  // Calculate total
  const calculateTotal = () => {
    let monthly = 0;
    let oneTime = 0;

    selectedAgents.forEach(agent => {
      const price = agent.precio_custom ? parseFloat(agent.precio_custom) : agent.precio_base;
      const discount = parseFloat(agent.descuento) || 0;
      const final = price * (1 - discount / 100);
      if (agent.periodicidad === "mensual") monthly += final;
      else if (agent.periodicidad === "unico") oneTime += final;
      else monthly += final; // treat others as recurring
    });

    extraConcepts.forEach(ec => {
      oneTime += parseFloat(ec.importe) || 0;
    });

    return { monthly, oneTime, total: monthly + oneTime };
  };

  // ── Step Navigation ──
  const canGoNext = () => {
    switch (step) {
      case 1: return !!clientData.email;
      case 2: return !!credentials.supabase_url && !!credentials.supabase_key;
      case 3: return tables.length > 0;
      case 4: return Object.keys(selectedTables).length > 0;
      case 5: return Object.keys(moduleConfigs).length > 0;
      case 6: return true;
      default: return false;
    }
  };

  // ── Step 3: Detect Tables ──
  const detectTables = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/detect-tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const detected = data.tables || data || [];
      setTables(detected);
      if (detected.length === 0) setError("No se encontraron tablas.");
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  // ── Step 4: Toggle table ──
  const toggleTable = (tableName: string, moduleType: string) => {
    setSelectedTables(prev => {
      const next = { ...prev };
      if (next[tableName] === moduleType) {
        delete next[tableName];
        setModuleConfigs(prev2 => { const n = { ...prev2 }; delete n[tableName]; return n; });
      } else {
        next[tableName] = moduleType;
        const table = tables.find(t => t.name === tableName);
        const columns = table?.columns || [];
        const autoMap = autoMapColumns(columns, moduleType);
        setModuleConfigs(prev2 => ({
          ...prev2,
          [tableName]: {
            tabla_origen: tableName, tipo: moduleType,
            nombre_display: formatTableName(tableName),
            icono: getModuleIcon(moduleType),
            mapeo_campos: autoMap,
            config_visual: { tipo_vista: "tabla" },
            permite_crear: true, permite_editar: true, permite_eliminar: false,
          },
        }));
      }
      return next;
    });
  };

  // ── Step 7: Create Client ──
  const createClient = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Create client (plan based on agents)
      const totals = calculateTotal();
      const plan = totals.monthly >= 400 ? "enterprise" : totals.monthly >= 200 ? "pro" : "basico";

      const clientRes = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...clientData,
          ...credentials,
          plan,
          coste_hora: parseFloat(clientData.coste_hora),
          minutos_por_conv: parseInt(clientData.minutos_por_conv),
        }),
      });
      const client = await clientRes.json();
      if (!clientRes.ok) throw new Error(client.error);

      // 2. Save modules
      const modulesArray = Object.values(moduleConfigs);
      if (modulesArray.length > 0) {
        const modRes = await fetch("/api/admin/modules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cliente_id: client.id, modules: modulesArray }),
        });
        const modData = await modRes.json();
        if (!modRes.ok) throw new Error(modData.error);
      }

      // 3. Assign agents
      for (const agent of selectedAgents) {
        await fetch("/api/admin/client-agentes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cliente_id: client.id,
            agente_id: agent.agente_id,
            precio_custom: agent.precio_custom || null,
            descuento: agent.descuento || "0",
            fecha_inicio: new Date().toISOString().split("T")[0],
            notas: agent.notas || null,
          }),
        });
      }

      // 4. Create billing entries for extra concepts
      for (const ec of extraConcepts) {
        if (ec.concepto && ec.importe) {
          await fetch("/api/admin/billing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cliente_id: client.id,
              concepto: ec.concepto,
              importe: ec.importe,
              estado: "pendiente",
              notas: ec.notas || null,
            }),
          });
        }
      }

      setResult({ ...client, totals: calculateTotal() });
      setStep(7);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const totals = calculateTotal();
  const availableAgents = allAgentes.filter(a => !selectedAgents.find(sa => sa.agente_id === a.id));

  const periodicidadLabel = (p: string) => {
    switch (p) { case "mensual": return "/mes"; case "anual": return "/año"; case "trimestral": return "/trim"; case "unico": return "(único)"; default: return ""; }
  };

  return (
    <>
      <Header title="Nuevo Cliente" subtitle="Wizard de creación" />

      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />Volver a clientes
        </Link>

        {/* Step Progress */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center">
                <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  isActive && "bg-brand-purple/10 text-brand-purple border border-brand-purple/30",
                  isDone && "bg-success/10 text-success",
                  !isActive && !isDone && "text-[var(--muted-foreground)]"
                )}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={cn("w-4 h-px mx-1", isDone ? "bg-success" : "bg-[var(--border)]")} />}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 mb-6 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><div>{error}</div>
          </div>
        )}

        {/* ══════ STEP 1: Client Data + Agents ══════ */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            {/* Basic info */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-1">Datos del cliente</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">Información básica de la empresa o persona</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email *</label>
                  <input type="email" className="input-field" placeholder="cliente@empresa.com" value={clientData.email} onChange={e => setClientData(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Nombre de contacto</label>
                    <input type="text" className="input-field" placeholder="Juan García" value={clientData.nombre} onChange={e => setClientData(p => ({ ...p, nombre: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Empresa</label>
                    <input type="text" className="input-field" placeholder="Peluquería Ana" value={clientData.empresa} onChange={e => setClientData(p => ({ ...p, empresa: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">€/hora (cálculo ahorro)</label>
                    <input type="number" className="input-field" value={clientData.coste_hora} onChange={e => setClientData(p => ({ ...p, coste_hora: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Min/conversación</label>
                    <input type="number" className="input-field" value={clientData.minutos_por_conv} onChange={e => setClientData(p => ({ ...p, minutos_por_conv: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Selection */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-brand-purple" />
                    Agentes contratados
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)]">Selecciona los agentes que contrata este cliente</p>
                </div>
              </div>

              {loadingAgents ? (
                <Loader2 className="w-6 h-6 animate-spin text-brand-purple mx-auto my-4" />
              ) : allAgentes.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-[var(--border)] rounded-lg">
                  <Zap className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--muted-foreground)]">No hay agentes en el catálogo</p>
                  <Link href="/admin/agentes" className="text-xs text-brand-purple mt-1 inline-block">Crear agentes primero →</Link>
                </div>
              ) : (
                <>
                  {/* Available agents to add */}
                  {availableAgents.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">Añadir agente:</p>
                      <div className="flex flex-wrap gap-2">
                        {availableAgents.map(agente => (
                          <button key={agente.id} onClick={() => addAgent(agente)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:border-brand-purple/50 hover:bg-brand-purple/5 transition-all text-sm">
                            <Plus className="w-3.5 h-3.5 text-brand-purple" />
                            <span>{agente.nombre}</span>
                            <span className="text-xs text-[var(--muted-foreground)]">{agente.precio}€{periodicidadLabel(agente.periodicidad)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected agents */}
                  {selectedAgents.length > 0 && (
                    <div className="space-y-3">
                      {selectedAgents.map(agent => {
                        const price = agent.precio_custom ? parseFloat(agent.precio_custom) : agent.precio_base;
                        const discount = parseFloat(agent.descuento) || 0;
                        const finalPrice = price * (1 - discount / 100);

                        return (
                          <div key={agent.agente_id} className="p-4 rounded-lg border border-brand-purple/20 bg-brand-purple/5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-brand-purple" />
                                <span className="font-semibold text-sm">{agent.nombre}</span>
                                <span className="text-xs text-[var(--muted-foreground)]">({agent.precio_base}€{periodicidadLabel(agent.periodicidad)})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-brand-purple">{finalPrice.toFixed(2)}€{periodicidadLabel(agent.periodicidad)}</span>
                                <button onClick={() => removeAgent(agent.agente_id)} className="p-1 rounded hover:bg-danger/10 text-[var(--muted-foreground)] hover:text-danger">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] font-medium text-[var(--muted-foreground)] mb-1">Precio custom (€)</label>
                                <input type="number" className="input-field text-xs py-1.5" placeholder={`Catálogo: ${agent.precio_base}€`}
                                  value={agent.precio_custom} onChange={e => updateAgent(agent.agente_id, "precio_custom", e.target.value)} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-medium text-[var(--muted-foreground)] mb-1">Descuento (%)</label>
                                <input type="number" className="input-field text-xs py-1.5" placeholder="0" min="0" max="100"
                                  value={agent.descuento} onChange={e => updateAgent(agent.agente_id, "descuento", e.target.value)} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-medium text-[var(--muted-foreground)] mb-1">Notas</label>
                                <input type="text" className="input-field text-xs py-1.5" placeholder="Ej: Dto 3 meses"
                                  value={agent.notas} onChange={e => updateAgent(agent.agente_id, "notas", e.target.value)} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Extra Concepts */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-warning" />
                    Conceptos extra (opcional)
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)]">Instalación, configuración inicial, etc.</p>
                </div>
                <button onClick={addExtraConcept} className="btn-ghost text-xs flex items-center gap-1">
                  <Plus className="w-3 h-3" />Añadir concepto
                </button>
              </div>

              {extraConcepts.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)] text-center py-3">Sin conceptos extra</p>
              ) : (
                <div className="space-y-3">
                  {extraConcepts.map((ec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)]">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-medium text-[var(--muted-foreground)] mb-1">Concepto *</label>
                          <input className="input-field text-xs py-1.5" placeholder="Instalación HERMES"
                            value={ec.concepto} onChange={e => updateExtraConcept(i, "concepto", e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-[var(--muted-foreground)] mb-1">Importe (€) *</label>
                          <input type="number" className="input-field text-xs py-1.5" placeholder="150"
                            value={ec.importe} onChange={e => updateExtraConcept(i, "importe", e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-[var(--muted-foreground)] mb-1">Notas</label>
                          <input className="input-field text-xs py-1.5" placeholder="Pago único primer mes"
                            value={ec.notas} onChange={e => updateExtraConcept(i, "notas", e.target.value)} />
                        </div>
                      </div>
                      <button onClick={() => removeExtraConcept(i)} className="p-1.5 rounded hover:bg-danger/10 text-[var(--muted-foreground)] hover:text-danger mt-4">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Summary */}
            {(selectedAgents.length > 0 || extraConcepts.length > 0) && (
              <div className="card border-brand-purple/20">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-brand-purple" />
                  Resumen económico
                </h3>
                <div className="space-y-2 text-sm">
                  {selectedAgents.map(agent => {
                    const price = agent.precio_custom ? parseFloat(agent.precio_custom) : agent.precio_base;
                    const discount = parseFloat(agent.descuento) || 0;
                    const final1 = price * (1 - discount / 100);
                    return (
                      <div key={agent.agente_id} className="flex justify-between">
                        <span className="text-[var(--muted-foreground)]">
                          {agent.nombre}
                          {discount > 0 && <span className="text-success text-xs ml-1">(-{discount}%)</span>}
                        </span>
                        <span className="font-medium">{final1.toFixed(2)}€{periodicidadLabel(agent.periodicidad)}</span>
                      </div>
                    );
                  })}
                  {extraConcepts.filter(ec => ec.importe).map((ec, i) => (
                    <div key={`ec-${i}`} className="flex justify-between">
                      <span className="text-[var(--muted-foreground)]">{ec.concepto || "Concepto extra"} <span className="text-xs">(único)</span></span>
                      <span className="font-medium">{parseFloat(ec.importe).toFixed(2)}€</span>
                    </div>
                  ))}
                  <div className="border-t border-[var(--border)] pt-2 mt-2">
                    {totals.monthly > 0 && (
                      <div className="flex justify-between font-bold">
                        <span>Total mensual recurrente</span>
                        <span className="text-brand-purple">{totals.monthly.toFixed(2)}€/mes</span>
                      </div>
                    )}
                    {totals.oneTime > 0 && (
                      <div className="flex justify-between font-bold">
                        <span>Pagos únicos</span>
                        <span className="text-warning">{totals.oneTime.toFixed(2)}€</span>
                      </div>
                    )}
                    {(totals.monthly > 0 || totals.oneTime > 0) && (
                      <div className="flex justify-between font-bold text-lg pt-2 mt-2 border-t border-[var(--border)]">
                        <span>Total primer mes</span>
                        <span className="gradient-text">{totals.total.toFixed(2)}€</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════ STEP 2: Supabase Credentials ══════ */}
        {step === 2 && (
          <div className="card animate-fade-in">
            <h3 className="text-lg font-semibold mb-1">Credenciales de Supabase</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              Introduce la URL y la Service Role Key del proyecto Supabase del cliente. La key se cifrará con AES-256.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">URL del proyecto Supabase</label>
                <input type="url" className="input-field" placeholder="https://xxxxx.supabase.co" value={credentials.supabase_url} onChange={e => setCredentials(p => ({ ...p, supabase_url: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Service Role Key (secret)</label>
                <input type="password" className="input-field font-mono text-xs" placeholder="eyJhbGciOiJIUzI1NiIs..." value={credentials.supabase_key} onChange={e => setCredentials(p => ({ ...p, supabase_key: e.target.value }))} />
                <p className="text-xs text-[var(--muted-foreground)] mt-1">Settings → API → service_role (secret)</p>
              </div>
            </div>
          </div>
        )}

        {/* ══════ STEP 3: Detect Tables ══════ */}
        {step === 3 && (
          <div className="card animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-1">Tablas detectadas</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {tables.length > 0 ? `${tables.length} tablas encontradas` : "Pulsa escanear para detectar tablas"}
                </p>
              </div>
              <button onClick={detectTables} disabled={loading} className="btn-primary flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {loading ? "Escaneando..." : tables.length > 0 ? "Re-escanear" : "Escanear tablas"}
              </button>
            </div>
            {tables.length > 0 && (
              <div className="space-y-2">
                {tables.map(table => (
                  <div key={table.name} className="border border-[var(--border)] rounded-lg overflow-hidden">
                    <button onClick={() => setExpandedTable(expandedTable === table.name ? null : table.name)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--muted)]/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Database className="w-4 h-4 text-brand-purple" />
                        <span className="font-mono text-sm font-medium">{table.name}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">{table.columns.length} cols · {table.row_count} filas</span>
                      </div>
                      {expandedTable === table.name ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedTable === table.name && (
                      <div className="px-4 pb-3 border-t border-[var(--border)]">
                        <div className="mt-3 space-y-1">
                          {table.columns.map(col => (
                            <div key={col.column_name} className="flex items-center gap-3 text-xs py-1">
                              <span className="font-mono text-brand-purple-light w-40 truncate">{col.column_name}</span>
                              <span className="text-[var(--muted-foreground)] w-24">{col.data_type}</span>
                            </div>
                          ))}
                        </div>
                        {table.preview.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[var(--border)]">
                            <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">Preview:</p>
                            <pre className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] p-2 rounded overflow-x-auto">
                              {JSON.stringify(table.preview[0], null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════ STEP 4: Assign Module Types ══════ */}
        {step === 4 && (
          <div className="card animate-fade-in">
            <h3 className="text-lg font-semibold mb-1">Asignar módulos</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">Selecciona las tablas y asígnales un tipo</p>
            <div className="space-y-3">
              {tables.map(table => (
                <div key={table.name} className="border border-[var(--border)] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Database className="w-4 h-4 text-[var(--muted-foreground)]" />
                    <span className="font-mono text-sm font-medium">{table.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">{table.row_count} filas</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MODULE_TYPES.map(mt => {
                      const Icon = mt.icon;
                      const isSelected = selectedTables[table.name] === mt.id;
                      return (
                        <button key={mt.id} onClick={() => toggleTable(table.name, mt.id)}
                          className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                            isSelected ? "border-brand-purple bg-brand-purple/10 text-brand-purple" : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-brand-purple/50"
                          )}>
                          <Icon className="w-3.5 h-3.5" />{mt.label}{isSelected && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════ STEP 5: Configure Modules ══════ */}
        {step === 5 && (
          <div className="space-y-4 animate-fade-in">
            <div className="card"><h3 className="text-lg font-semibold mb-1">Configurar módulos</h3><p className="text-sm text-[var(--muted-foreground)]">Ajusta nombre, mapeo y permisos</p></div>
            {Object.entries(moduleConfigs).map(([tableName, config]) => {
              const table = tables.find(t => t.name === tableName);
              const columns = table?.columns || [];
              return (
                <div key={tableName} className="card">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-brand-purple/10"><Database className="w-4 h-4 text-brand-purple" /></div>
                    <div><span className="font-mono text-sm">{tableName}</span><span className="text-xs text-[var(--muted-foreground)] ml-2">→ {config.tipo}</span></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium mb-1">Nombre visible</label>
                      <input type="text" className="input-field text-sm" value={config.nombre_display}
                        onChange={e => setModuleConfigs(p => ({ ...p, [tableName]: { ...p[tableName], nombre_display: e.target.value } }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Tipo de vista</label>
                      <div className="flex gap-2">
                        {VISTA_TYPES.map(vt => {
                          const VIcon = vt.icon;
                          return (
                            <button key={vt.id} onClick={() => setModuleConfigs(p => ({ ...p, [tableName]: { ...p[tableName], config_visual: { tipo_vista: vt.id } } }))}
                              className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-all",
                                config.config_visual.tipo_vista === vt.id ? "border-brand-purple bg-brand-purple/10 text-brand-purple" : "border-[var(--border)] text-[var(--muted-foreground)]"
                              )}><VIcon className="w-3.5 h-3.5" />{vt.label}</button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {config.tipo !== "generico" && (
                    <div className="mb-4">
                      <label className="block text-xs font-medium mb-2">Mapeo de campos</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {getRequiredFields(config.tipo).map(field => (
                          <div key={field.key} className="flex items-center gap-2">
                            <span className="text-xs text-[var(--muted-foreground)] w-24 flex-shrink-0">{field.label}:</span>
                            <select className="input-field text-xs py-1.5" value={config.mapeo_campos[field.key] || ""}
                              onChange={e => setModuleConfigs(p => ({ ...p, [tableName]: { ...p[tableName], mapeo_campos: { ...p[tableName].mapeo_campos, [field.key]: e.target.value } } }))}>
                              <option value="">— Sin asignar —</option>
                              {columns.map(col => <option key={col.column_name} value={col.column_name}>{col.column_name}</option>)}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 pt-3 border-t border-[var(--border)]">
                    {[{ key: "permite_crear", label: "Puede crear" }, { key: "permite_editar", label: "Puede editar" }, { key: "permite_eliminar", label: "Puede eliminar" }].map(perm => (
                      <label key={perm.key} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={(config as any)[perm.key]}
                          onChange={e => setModuleConfigs(p => ({ ...p, [tableName]: { ...p[tableName], [perm.key]: e.target.checked } }))}
                          className="rounded border-[var(--border)]" />{perm.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════ STEP 6: Preview ══════ */}
        {step === 6 && (
          <div className="card animate-fade-in">
            <h3 className="text-lg font-semibold mb-1">Vista previa</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">Revisa todo antes de crear el cliente</p>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[var(--muted)]">
                <h4 className="text-sm font-semibold mb-2">Datos del cliente</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-[var(--muted-foreground)]">Email:</span><span>{clientData.email}</span>
                  <span className="text-[var(--muted-foreground)]">Nombre:</span><span>{clientData.nombre || "—"}</span>
                  <span className="text-[var(--muted-foreground)]">Empresa:</span><span>{clientData.empresa || "—"}</span>
                  <span className="text-[var(--muted-foreground)]">Supabase:</span><span className="font-mono text-xs truncate">{credentials.supabase_url}</span>
                </div>
              </div>

              {selectedAgents.length > 0 && (
                <div className="p-4 rounded-lg bg-[var(--muted)]">
                  <h4 className="text-sm font-semibold mb-2">Agentes contratados ({selectedAgents.length})</h4>
                  <div className="space-y-1">
                    {selectedAgents.map(agent => {
                      const price = agent.precio_custom ? parseFloat(agent.precio_custom) : agent.precio_base;
                      const discount = parseFloat(agent.descuento) || 0;
                      const final1 = price * (1 - discount / 100);
                      return (
                        <div key={agent.agente_id} className="flex justify-between text-sm">
                          <span>{agent.nombre} {discount > 0 && <span className="text-success text-xs">(-{discount}%)</span>}</span>
                          <span className="font-medium">{final1.toFixed(2)}€{periodicidadLabel(agent.periodicidad)}</span>
                        </div>
                      );
                    })}
                    {totals.monthly > 0 && (
                      <div className="flex justify-between text-sm font-bold pt-2 border-t border-[var(--border)]">
                        <span>Total mensual</span><span className="text-brand-purple">{totals.monthly.toFixed(2)}€/mes</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-lg bg-[var(--muted)]">
                <h4 className="text-sm font-semibold mb-2">Módulos ({Object.keys(moduleConfigs).length})</h4>
                <div className="space-y-2">
                  {Object.entries(moduleConfigs).map(([tableName, config]) => (
                    <div key={tableName} className="flex items-center gap-3 text-sm">
                      <span className="w-2 h-2 rounded-full bg-brand-purple" />
                      <span className="font-medium">{config.nombre_display}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">({config.tipo}) ← {tableName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════ STEP 7: Success ══════ */}
        {step === 7 && result && (
          <div className="card animate-fade-in text-center py-12">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-xl font-bold mb-2">¡Cliente creado con éxito!</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">Cuenta creada, módulos configurados y agentes asignados.</p>

            <div className="card max-w-sm mx-auto text-left mb-6">
              <h4 className="text-sm font-semibold mb-2">Credenciales del cliente</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Email:</span><span className="font-mono">{result.email}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Contraseña:</span><span className="font-mono text-brand-purple">{result.temp_password}</span></div>
                {result.totals?.monthly > 0 && (
                  <div className="flex justify-between pt-2 border-t border-[var(--border)]"><span className="text-[var(--muted-foreground)]">Mensualidad:</span><span className="font-bold">{result.totals.monthly.toFixed(2)}€/mes</span></div>
                )}
              </div>
              <p className="text-xs text-warning mt-3">⚠ Guarda esta contraseña, no se puede recuperar después.</p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Link href="/admin/clients" className="btn-secondary">Ver todos los clientes</Link>
              <button onClick={() => { setStep(1); setResult(null); resetForm(); }} className="btn-primary">Crear otro cliente</button>
            </div>
          </div>
        )}

        {/* ══════ Navigation ══════ */}
        {step < 7 && (
          <div className="flex items-center justify-between mt-6">
            <button onClick={() => { setStep(s => s - 1); setError(null); }} disabled={step === 1} className="btn-ghost flex items-center gap-2 disabled:opacity-30">
              <ArrowLeft className="w-4 h-4" />Anterior
            </button>
            {step === 3 && tables.length === 0 ? <div /> : step === 6 ? (
              <button onClick={createClient} disabled={loading} className="btn-primary flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                {loading ? "Creando..." : "Crear cliente"}
              </button>
            ) : (
              <button onClick={() => { setStep(s => s + 1); setError(null); }} disabled={!canGoNext()} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                Siguiente<ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );

  function resetForm() {
    setClientData({ email: "", nombre: "", empresa: "", coste_hora: "15", minutos_por_conv: "5" });
    setCredentials({ supabase_url: "", supabase_key: "" });
    setTables([]); setSelectedTables({}); setModuleConfigs({});
    setSelectedAgents([]); setExtraConcepts([]); setResult(null); setError(null);
  }
}

// ── Helpers ──
function autoMapColumns(columns: any[], moduleType: string): Record<string, string> {
  const map: Record<string, string> = {};
  const colNames = columns.map((c: any) => c.column_name.toLowerCase());
  if (moduleType === "leads") {
    map.nombre = findColumn(colNames, ["nombre", "name", "paciente_nombre"]) || "";
    map.telefono = findColumn(colNames, ["telefono", "phone", "tel"]) || "";
    map.email = findColumn(colNames, ["email", "correo"]) || "";
    map.estado = findColumn(colNames, ["estado", "status"]) || "";
    map.fecha = findColumn(colNames, ["fecha_registro", "created_at", "fecha"]) || "";
    map.notas = findColumn(colNames, ["notas", "notes"]) || "";
  } else if (moduleType === "citas") {
    map.nombre_paciente = findColumn(colNames, ["paciente_nombre", "nombre"]) || "";
    map.telefono = findColumn(colNames, ["paciente_telefono", "telefono"]) || "";
    map.fecha = findColumn(colNames, ["fecha_cita", "fecha"]) || "";
    map.hora = findColumn(colNames, ["hora_cita", "hora"]) || "";
    map.estado = findColumn(colNames, ["estado", "status"]) || "";
    map.tipo = findColumn(colNames, ["tipo_cita", "tipo"]) || "";
    map.notas = findColumn(colNames, ["notas", "notes"]) || "";
  } else if (moduleType === "conversaciones") {
    map.mensaje = findColumn(colNames, ["mensaje", "message"]) || "";
    map.rol = findColumn(colNames, ["rol", "role"]) || "";
    map.telefono = findColumn(colNames, ["telefono", "phone"]) || "";
    map.nombre_cliente = findColumn(colNames, ["nombre_cliente", "nombre"]) || "";
    map.session_id = findColumn(colNames, ["session_id", "conversation_id"]) || "";
    map.created_at = findColumn(colNames, ["created_at", "fecha"]) || "";
  } else if (moduleType === "webs") {
    map.url = findColumn(colNames, ["url", "enlace", "web"]) || "";
    map.nombre_web = findColumn(colNames, ["nombre_web", "nombre", "name"]) || "";
    map.descripcion = findColumn(colNames, ["descripcion", "description"]) || "";
    map.usuario = findColumn(colNames, ["usuario", "username", "user"]) || "";
    map.password = findColumn(colNames, ["password", "contraseña", "pass"]) || "";
    map.precio = findColumn(colNames, ["precio", "price", "coste"]) || "";
    map.plan = findColumn(colNames, ["plan", "tipo"]) || "";
    map.estado = findColumn(colNames, ["estado", "status"]) || "";
    map.notas = findColumn(colNames, ["notas", "notes"]) || "";
  } else if (moduleType === "empresas") {
    map.nombre_empresa = findColumn(colNames, ["nombre_empresa", "empresa", "nombre"]) || "";
    map.persona_contacto = findColumn(colNames, ["persona_contacto", "contacto", "persona"]) || "";
    map.medio_contacto = findColumn(colNames, ["medio_contacto", "medio", "canal"]) || "";
    map.dato_contacto = findColumn(colNames, ["dato_contacto", "email", "telefono"]) || "";
    map.estado = findColumn(colNames, ["estado", "status"]) || "";
    map.mensaje_enviado = findColumn(colNames, ["mensaje_enviado", "mensaje"]) || "";
    map.fecha_contacto = findColumn(colNames, ["fecha_contacto", "fecha", "created_at"]) || "";
    map.fecha_seguimiento = findColumn(colNames, ["fecha_seguimiento", "seguimiento"]) || "";
    map.notas = findColumn(colNames, ["notas", "notes"]) || "";
  }
  return map;
}

function findColumn(colNames: string[], options: string[]): string | undefined {
  for (const opt of options) { const found = colNames.find(c => c === opt || c.includes(opt)); if (found) return found; }
  return undefined;
}

function formatTableName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function getModuleIcon(tipo: string): string {
  switch (tipo) { case "leads": return "Users"; case "citas": return "Calendar"; case "conversaciones": return "MessageSquare"; case "webs": return "Globe"; case "empresas": return "Briefcase"; default: return "LayoutGrid"; }
}

function getRequiredFields(tipo: string): { key: string; label: string }[] {
  switch (tipo) {
    case "leads": return [{ key: "nombre", label: "Nombre" }, { key: "telefono", label: "Teléfono" }, { key: "email", label: "Email" }, { key: "estado", label: "Estado" }, { key: "fecha", label: "Fecha" }, { key: "notas", label: "Notas" }];
    case "citas": return [{ key: "nombre_paciente", label: "Nombre" }, { key: "telefono", label: "Teléfono" }, { key: "fecha", label: "Fecha" }, { key: "hora", label: "Hora" }, { key: "estado", label: "Estado" }, { key: "tipo", label: "Tipo" }, { key: "notas", label: "Notas" }];
    case "conversaciones": return [{ key: "mensaje", label: "Mensaje" }, { key: "rol", label: "Rol" }, { key: "telefono", label: "Teléfono" }, { key: "nombre_cliente", label: "Nombre" }, { key: "session_id", label: "Session ID" }, { key: "created_at", label: "Fecha" }];
    case "webs": return [{ key: "url", label: "URL" }, { key: "nombre_web", label: "Nombre" }, { key: "descripcion", label: "Descripción" }, { key: "usuario", label: "Usuario" }, { key: "password", label: "Contraseña" }, { key: "precio", label: "Precio" }, { key: "plan", label: "Plan" }, { key: "estado", label: "Estado" }, { key: "notas", label: "Notas" }];
    case "empresas": return [{ key: "nombre_empresa", label: "Empresa" }, { key: "persona_contacto", label: "Persona" }, { key: "medio_contacto", label: "Medio" }, { key: "dato_contacto", label: "Contacto" }, { key: "estado", label: "Estado" }, { key: "mensaje_enviado", label: "Mensaje" }, { key: "fecha_contacto", label: "Fecha contacto" }, { key: "fecha_seguimiento", label: "Seguimiento" }, { key: "notas", label: "Notas" }];
    default: return [];
  }
}
