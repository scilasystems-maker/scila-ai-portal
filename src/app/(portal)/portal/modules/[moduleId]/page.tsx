"use client";

import { Header } from "@/components/shared/Header";
import { LayoutGrid } from "lucide-react";

export default function ModulePage({ params }: { params: { moduleId: string } }) {
  return (
    <>
      <Header title="Módulo" subtitle={`ID: ${params.moduleId}`} />
      <div className="p-4 lg:p-6">
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-cyan/10 flex items-center justify-center mb-4">
            <LayoutGrid className="w-8 h-8 text-brand-cyan" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Módulo Dinámico</h3>
          <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
            Los módulos dinámicos (leads, citas, genéricos) se implementarán en la Fase 4.
          </p>
        </div>
      </div>
    </>
  );
}
