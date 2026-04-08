"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/shared/Header";
import { CalendarClock, Loader2, Zap, AlertTriangle, Clock } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface UpcomingPayment {
  id: string; cliente_nombre: string; agente_nombre: string; importe: number;
  periodicidad: string; fecha_proximo_pago: string; dias_restantes: number;
  descuento: number | null; es_urgente: boolean;
}

export default function UpcomingPage() {
  const [upcoming, setUpcoming] = useState<UpcomingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/billing");
      const data = await res.json();
      setUpcoming(data.upcoming || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const totalProximo = upcoming.reduce((s, p) => s + p.importe, 0);
  const urgentes = upcoming.filter(p => p.es_urgente);

  return (
    <>
      <Header title="Próximos pagos" subtitle="Facturas futuras de agentes" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-2"><CalendarClock className="w-5 h-5 text-brand-purple" /><span className="text-sm text-[var(--muted-foreground)]">Próximos pagos</span></div>
            <p className="text-2xl font-bold">{upcoming.length}</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-2"><Zap className="w-5 h-5 text-brand-cyan" /><span className="text-sm text-[var(--muted-foreground)]">Total previsto</span></div>
            <p className="text-2xl font-bold">{totalProximo.toFixed(0)}€</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-warning" /><span className="text-sm text-[var(--muted-foreground)]">En menos de 5 días</span></div>
            <p className="text-2xl font-bold text-warning">{urgentes.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-purple" /></div>
        ) : upcoming.length === 0 ? (
          <div className="card text-center py-12">
            <CalendarClock className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Sin pagos próximos</h3>
            <p className="text-sm text-[var(--muted-foreground)]">Cuando los clientes tengan agentes activos, aquí se verán sus próximas facturas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(payment => (
              <div key={payment.id} className={cn(
                "card flex items-center justify-between",
                payment.es_urgente && "border-warning/30 bg-warning/5"
              )}>
                <div className="flex items-center gap-4">
                  {payment.es_urgente ? (
                    <div className="p-2.5 rounded-lg bg-warning/10"><AlertTriangle className="w-5 h-5 text-warning" /></div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-brand-purple/10"><Zap className="w-5 h-5 text-brand-purple" /></div>
                  )}
                  <div>
                    <p className="font-semibold">{payment.agente_nombre}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{payment.cliente_nombre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-[var(--muted-foreground)]" />
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {formatDate(payment.fecha_proximo_pago)} —{" "}
                        <span className={cn(payment.es_urgente && "text-warning font-semibold")}>
                          {payment.dias_restantes === 0 ? "Hoy" : payment.dias_restantes === 1 ? "Mañana" : `En ${payment.dias_restantes} días`}
                        </span>
                      </span>
                      {payment.descuento && <span className="text-xs text-success">(-{payment.descuento}%)</span>}
                    </div>
                    {payment.es_urgente && (
                      <p className="text-[10px] text-warning mt-1">Se generará factura pendiente automáticamente</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{payment.importe.toFixed(2)}€</p>
                  <p className="text-xs text-[var(--muted-foreground)] capitalize">{payment.periodicidad}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
