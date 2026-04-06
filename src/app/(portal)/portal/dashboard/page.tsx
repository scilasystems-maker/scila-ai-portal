"use client";

import { Header } from "@/components/shared/Header";
import {
  MessageSquare, Calendar, Users, TrendingUp, Clock, DollarSign,
  ArrowUpRight, ArrowDownRight, Zap
} from "lucide-react";

export default function PortalDashboard() {
  return (
    <>
      <Header title="Dashboard" subtitle="Resumen de tu actividad" />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Welcome */}
        <div className="card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-purple/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Tu agente IA está activo</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Respondiendo automáticamente a tus clientes 24/7
              </p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-brand-purple/10">
                <MessageSquare className="w-5 h-5 text-brand-purple" />
              </div>
            </div>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Conversaciones</p>
          </div>

          <div className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-brand-cyan/10">
                <Calendar className="w-5 h-5 text-brand-cyan" />
              </div>
            </div>
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Citas Este Mes</p>
          </div>

          <div className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-success/10">
                <Clock className="w-5 h-5 text-success" />
              </div>
            </div>
            <p className="text-2xl font-bold">0h</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Horas Ahorradas</p>
          </div>

          <div className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-warning/10">
                <DollarSign className="w-5 h-5 text-warning" />
              </div>
            </div>
            <p className="text-2xl font-bold">0€</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Coste Ahorrado</p>
          </div>
        </div>

        {/* Placeholder charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-4">Conversaciones por día</h3>
            <div className="flex items-center justify-center h-48 text-[var(--muted-foreground)]">
              <p className="text-sm">Las gráficas se activarán con datos reales (Fase 6)</p>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4">Leads por estado</h3>
            <div className="flex items-center justify-center h-48 text-[var(--muted-foreground)]">
              <p className="text-sm">Las gráficas se activarán con datos reales (Fase 6)</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
