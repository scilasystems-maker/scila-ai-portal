"use client";

import { Header } from "@/components/shared/Header";
import { ShieldCheck } from "lucide-react";

export default function AuditPage() {
  return (
    <>
      <Header title="Auditoría" subtitle="Registro de actividad del sistema" />
      <div className="p-4 lg:p-6">
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-cyan/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-brand-cyan" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Logs de Auditoría</h3>
          <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
            El módulo de auditoría se implementará en la Fase 8.
          </p>
        </div>
      </div>
    </>
  );
}
