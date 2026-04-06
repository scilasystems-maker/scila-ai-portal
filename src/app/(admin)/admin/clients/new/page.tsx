"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/shared/Header";
import {
  ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, Database,
  User, Key, Search, Puzzle, Eye, Rocket, ChevronDown, ChevronUp,
  Users, Calendar, MessageSquare, LayoutGrid, Image, Table2, Kanban
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Datos", icon: User, desc: "Información del cliente" },
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
  { id: "generico", label: "Genérico", icon: LayoutGrid, color: "text-warning", bg: "bg-warning/10" },
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

export default function NewClientWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Client data
  const [clientData, setClientData] = useState({
    email: "", nombre: "", empresa: "", plan: "basico", coste_hora: "15", minutos_por_conv: "5",
  });

  // Step 2: Supabase credentials
  const [credentials, setCredentials] = useState({ supabase_url: "", supabase_key: "" });

  // Step 3: Detected tables
  const [tables, setTables] = useState<DetectedTable[]>([]);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);

  // Step 4: Selected tables and their module types
  const [selectedTables, setSelectedTables] = useState<Record<string, string>>({});

  // Step 5: Module configurations
  const [moduleConfigs, setModuleConfigs] = useState<Record<string, ModuleConfig>>({});

  // Step 7: Result
  const [result, setResult] = useState<any>(null);

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
      if (detected.length === 0) {
        setError("No se encontraron tablas en este proyecto de Supabase.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4: Toggle table selection ──
  const toggleTable = (tableName: string, moduleType: string) => {
    setSelectedTables(prev => {
      const next = { ...prev };
      if (next[tableName] === moduleType) {
        delete next[tableName];
        // Also remove config
        setModuleConfigs(prev2 => {
          const next2 = { ...prev2 };
          delete next2[tableName];
          return next2;
        });
      } else {
        next[tableName] = moduleType;
        // Auto-create config
        const table = tables.find(t => t.name === tableName);
        const columns = table?.columns || [];
        const autoMap = autoMapColumns(columns, moduleType);
        setModuleConfigs(prev2 => ({
          ...prev2,
          [tableName]: {
            tabla_origen: tableName,
            tipo: moduleType,
            nombre_display: formatTableName(tableName),
            icono: getModuleIcon(moduleType),
            mapeo_campos: autoMap,
            config_visual: { tipo_vista: moduleType === "conversaciones" ? "tabla" : "tabla" },
            permite_crear: true,
            permite_editar: true,
            permite_eliminar: false,
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
      // 1. Create client
      const clientRes = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...clientData,
          ...credentials,
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

      setResult(client);
      setStep(7);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="Nuevo Cliente" subtitle="Wizard de creación" />

      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a clientes
        </Link>

        {/* Step Progress */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                    isActive && "bg-brand-purple/10 text-brand-purple border border-brand-purple/30",
                    isDone && "bg-success/10 text-success",
                    !isActive && !isDone && "text-[var(--muted-foreground)]"
                  )}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn("w-4 h-px mx-1", isDone ? "bg-success" : "bg-[var(--border)]")} />
                )}
              </div>
            );
          })}
        </div>

        {/* Error display */}
        {error && (
          <div className="flex items-start gap-2 p-3 mb-6 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* ══════ STEP 1: Client Data ══════ */}
        {step === 1 && (
          <div className="card animate-fade-in">
            <h3 className="text-lg font-semibold mb-1">Datos del cliente</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">Información básica de la empresa o persona</p>

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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Plan</label>
                  <select className="input-field" value={clientData.plan} onChange={e => setClientData(p => ({ ...p, plan: e.target.value }))}>
                    <option value="basico">Básico</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">€/hora (ahorro)</label>
                  <input type="number" className="input-field" value={clientData.coste_hora} onChange={e => setClientData(p => ({ ...p, coste_hora: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Min/conversación</label>
                  <input type="number" className="input-field" value={clientData.minutos_por_conv} onChange={e => setClientData(p => ({ ...p, minutos_por_conv: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════ STEP 2: Supabase Credentials ══════ */}
        {step === 2 && (
          <div className="card animate-fade-in">
            <h3 className="text-lg font-semibold mb-1">Credenciales de Supabase</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              Introduce la URL y la Service Role Key del proyecto Supabase del cliente.
              La key se cifrará con AES-256 antes de guardarse.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">URL del proyecto Supabase</label>
                <input type="url" className="input-field" placeholder="https://xxxxx.supabase.co" value={credentials.supabase_url} onChange={e => setCredentials(p => ({ ...p, supabase_url: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Service Role Key (secret)</label>
                <input type="password" className="input-field font-mono text-xs" placeholder="eyJhbGciOiJIUzI1NiIs..." value={credentials.supabase_key} onChange={e => setCredentials(p => ({ ...p, supabase_key: e.target.value }))} />
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Se encuentra en Settings → API → service_role (secret) en el dashboard de Supabase
                </p>
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
                  {tables.length > 0
                    ? `Se encontraron ${tables.length} tablas en el Supabase del cliente`
                    : "Pulsa el botón para escanear las tablas del cliente"}
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
                    <button
                      onClick={() => setExpandedTable(expandedTable === table.name ? null : table.name)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--muted)]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Database className="w-4 h-4 text-brand-purple" />
                        <span className="font-mono text-sm font-medium">{table.name}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {table.columns.length} columnas · {table.row_count} filas
                        </span>
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
                              <span className="text-[var(--muted-foreground)]">{col.is_nullable === "YES" ? "nullable" : "required"}</span>
                            </div>
                          ))}
                        </div>
                        {table.preview.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[var(--border)]">
                            <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">Preview ({table.preview.length} filas):</p>
                            <div className="overflow-x-auto">
                              <pre className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] p-2 rounded">
                                {JSON.stringify(table.preview[0], null, 2)}
                              </pre>
                            </div>
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
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              Selecciona las tablas que quieres mostrar en el portal y asígnales un tipo de módulo
            </p>

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
                        <button
                          key={mt.id}
                          onClick={() => toggleTable(table.name, mt.id)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                            isSelected
                              ? "border-brand-purple bg-brand-purple/10 text-brand-purple"
                              : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-brand-purple/50"
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {mt.label}
                          {isSelected && <Check className="w-3 h-3" />}
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
            <div className="card">
              <h3 className="text-lg font-semibold mb-1">Configurar módulos</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Ajusta el nombre, mapeo de campos y permisos de cada módulo
              </p>
            </div>

            {Object.entries(moduleConfigs).map(([tableName, config]) => {
              const table = tables.find(t => t.name === tableName);
              const columns = table?.columns || [];
              return (
                <div key={tableName} className="card">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-brand-purple/10">
                      <Database className="w-4 h-4 text-brand-purple" />
                    </div>
                    <div>
                      <span className="font-mono text-sm">{tableName}</span>
                      <span className="text-xs text-[var(--muted-foreground)] ml-2">→ {config.tipo}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium mb-1">Nombre visible</label>
                      <input
                        type="text" className="input-field text-sm"
                        value={config.nombre_display}
                        onChange={e => setModuleConfigs(p => ({
                          ...p, [tableName]: { ...p[tableName], nombre_display: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Tipo de vista</label>
                      <div className="flex gap-2">
                        {VISTA_TYPES.map(vt => {
                          const VIcon = vt.icon;
                          return (
                            <button
                              key={vt.id}
                              onClick={() => setModuleConfigs(p => ({
                                ...p, [tableName]: { ...p[tableName], config_visual: { tipo_vista: vt.id } }
                              }))}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-all",
                                config.config_visual.tipo_vista === vt.id
                                  ? "border-brand-purple bg-brand-purple/10 text-brand-purple"
                                  : "border-[var(--border)] text-[var(--muted-foreground)]"
                              )}
                            >
                              <VIcon className="w-3.5 h-3.5" />
                              {vt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Field mapping */}
                  {config.tipo !== "generico" && (
                    <div className="mb-4">
                      <label className="block text-xs font-medium mb-2">Mapeo de campos</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {getRequiredFields(config.tipo).map(field => (
                          <div key={field.key} className="flex items-center gap-2">
                            <span className="text-xs text-[var(--muted-foreground)] w-24 flex-shrink-0">{field.label}:</span>
                            <select
                              className="input-field text-xs py-1.5"
                              value={config.mapeo_campos[field.key] || ""}
                              onChange={e => setModuleConfigs(p => ({
                                ...p, [tableName]: {
                                  ...p[tableName],
                                  mapeo_campos: { ...p[tableName].mapeo_campos, [field.key]: e.target.value }
                                }
                              }))}
                            >
                              <option value="">— Sin asignar —</option>
                              {columns.map(col => (
                                <option key={col.column_name} value={col.column_name}>{col.column_name}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Permissions */}
                  <div className="flex flex-wrap gap-4 pt-3 border-t border-[var(--border)]">
                    {[
                      { key: "permite_crear", label: "Puede crear" },
                      { key: "permite_editar", label: "Puede editar" },
                      { key: "permite_eliminar", label: "Puede eliminar" },
                    ].map(perm => (
                      <label key={perm.key} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(config as any)[perm.key]}
                          onChange={e => setModuleConfigs(p => ({
                            ...p, [tableName]: { ...p[tableName], [perm.key]: e.target.checked }
                          }))}
                          className="rounded border-[var(--border)]"
                        />
                        {perm.label}
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
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              Revisa la configuración antes de crear el cliente
            </p>

            <div className="space-y-4">
              {/* Client info */}
              <div className="p-4 rounded-lg bg-[var(--muted)]">
                <h4 className="text-sm font-semibold mb-2">Datos del cliente</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-[var(--muted-foreground)]">Email:</span>
                  <span>{clientData.email}</span>
                  <span className="text-[var(--muted-foreground)]">Nombre:</span>
                  <span>{clientData.nombre || "—"}</span>
                  <span className="text-[var(--muted-foreground)]">Empresa:</span>
                  <span>{clientData.empresa || "—"}</span>
                  <span className="text-[var(--muted-foreground)]">Plan:</span>
                  <span className="capitalize">{clientData.plan}</span>
                  <span className="text-[var(--muted-foreground)]">Supabase:</span>
                  <span className="font-mono text-xs truncate">{credentials.supabase_url}</span>
                </div>
              </div>

              {/* Modules */}
              <div className="p-4 rounded-lg bg-[var(--muted)]">
                <h4 className="text-sm font-semibold mb-2">Módulos ({Object.keys(moduleConfigs).length})</h4>
                <div className="space-y-2">
                  {Object.entries(moduleConfigs).map(([tableName, config]) => (
                    <div key={tableName} className="flex items-center gap-3 text-sm">
                      <span className="w-2 h-2 rounded-full bg-brand-purple" />
                      <span className="font-medium">{config.nombre_display}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">({config.tipo})</span>
                      <span className="text-xs text-[var(--muted-foreground)]">← {tableName}</span>
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
            <p className="text-sm text-[var(--muted-foreground)] mb-6">
              Se ha creado la cuenta y configurado los módulos.
            </p>

            <div className="card max-w-sm mx-auto text-left mb-6">
              <h4 className="text-sm font-semibold mb-2">Credenciales del cliente</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Email:</span>
                  <span className="font-mono">{result.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Contraseña temporal:</span>
                  <span className="font-mono text-brand-purple">{result.temp_password}</span>
                </div>
              </div>
              <p className="text-xs text-warning mt-3">
                ⚠ Guarda esta contraseña, no se puede recuperar después.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Link href="/admin/clients" className="btn-secondary">
                Ver todos los clientes
              </Link>
              <button onClick={() => { setStep(1); setResult(null); resetForm(); }} className="btn-primary">
                Crear otro cliente
              </button>
            </div>
          </div>
        )}

        {/* ══════ Navigation Buttons ══════ */}
        {step < 7 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => { setStep(s => s - 1); setError(null); }}
              disabled={step === 1}
              className="btn-ghost flex items-center gap-2 disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4" />
              Anterior
            </button>

            {step === 3 && tables.length === 0 ? (
              <div />
            ) : step === 6 ? (
              <button onClick={createClient} disabled={loading} className="btn-primary flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                {loading ? "Creando..." : "Crear cliente"}
              </button>
            ) : (
              <button
                onClick={() => { setStep(s => s + 1); setError(null); }}
                disabled={!canGoNext()}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );

  function resetForm() {
    setClientData({ email: "", nombre: "", empresa: "", plan: "basico", coste_hora: "15", minutos_por_conv: "5" });
    setCredentials({ supabase_url: "", supabase_key: "" });
    setTables([]);
    setSelectedTables({});
    setModuleConfigs({});
    setResult(null);
    setError(null);
  }
}

// ── Helper Functions ──

function autoMapColumns(columns: any[], moduleType: string): Record<string, string> {
  const map: Record<string, string> = {};
  const colNames = columns.map((c: any) => c.column_name.toLowerCase());

  if (moduleType === "leads") {
    map.nombre = findColumn(colNames, ["nombre", "name", "paciente_nombre", "cliente_nombre"]) || "";
    map.telefono = findColumn(colNames, ["telefono", "phone", "tel", "paciente_telefono"]) || "";
    map.email = findColumn(colNames, ["email", "correo", "mail"]) || "";
    map.estado = findColumn(colNames, ["estado", "status", "state"]) || "";
    map.fecha = findColumn(colNames, ["fecha_registro", "created_at", "fecha", "date"]) || "";
    map.notas = findColumn(colNames, ["notas", "notes", "nota", "observaciones"]) || "";
  } else if (moduleType === "citas") {
    map.nombre_paciente = findColumn(colNames, ["paciente_nombre", "nombre", "name", "cliente"]) || "";
    map.telefono = findColumn(colNames, ["paciente_telefono", "telefono", "phone"]) || "";
    map.fecha = findColumn(colNames, ["fecha_cita", "fecha", "date"]) || "";
    map.hora = findColumn(colNames, ["hora_cita", "hora", "time"]) || "";
    map.estado = findColumn(colNames, ["estado", "status"]) || "";
    map.tipo = findColumn(colNames, ["tipo_cita", "tipo", "type"]) || "";
    map.notas = findColumn(colNames, ["notas", "notes"]) || "";
  } else if (moduleType === "conversaciones") {
    map.mensaje = findColumn(colNames, ["mensaje", "message", "text", "contenido"]) || "";
    map.rol = findColumn(colNames, ["rol", "role", "sender"]) || "";
    map.telefono = findColumn(colNames, ["telefono", "phone"]) || "";
    map.nombre_cliente = findColumn(colNames, ["nombre_cliente", "nombre", "name"]) || "";
    map.session_id = findColumn(colNames, ["session_id", "conversation_id", "chat_id"]) || "";
    map.created_at = findColumn(colNames, ["created_at", "fecha", "timestamp"]) || "";
  }

  return map;
}

function findColumn(colNames: string[], options: string[]): string | undefined {
  for (const opt of options) {
    const found = colNames.find(c => c === opt || c.includes(opt));
    if (found) return found;
  }
  return undefined;
}

function formatTableName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase());
}

function getModuleIcon(tipo: string): string {
  switch (tipo) {
    case "leads": return "Users";
    case "citas": return "Calendar";
    case "conversaciones": return "MessageSquare";
    default: return "LayoutGrid";
  }
}

function getRequiredFields(tipo: string): { key: string; label: string }[] {
  switch (tipo) {
    case "leads":
      return [
        { key: "nombre", label: "Nombre" },
        { key: "telefono", label: "Teléfono" },
        { key: "email", label: "Email" },
        { key: "estado", label: "Estado" },
        { key: "fecha", label: "Fecha" },
        { key: "notas", label: "Notas" },
      ];
    case "citas":
      return [
        { key: "nombre_paciente", label: "Nombre" },
        { key: "telefono", label: "Teléfono" },
        { key: "fecha", label: "Fecha" },
        { key: "hora", label: "Hora" },
        { key: "estado", label: "Estado" },
        { key: "tipo", label: "Tipo" },
        { key: "notas", label: "Notas" },
      ];
    case "conversaciones":
      return [
        { key: "mensaje", label: "Mensaje" },
        { key: "rol", label: "Rol" },
        { key: "telefono", label: "Teléfono" },
        { key: "nombre_cliente", label: "Nombre" },
        { key: "session_id", label: "Session ID" },
        { key: "created_at", label: "Fecha" },
      ];
    default:
      return [];
  }
}
