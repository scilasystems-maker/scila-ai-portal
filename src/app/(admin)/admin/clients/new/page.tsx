"use client";

import { Header } from "@/components/shared/Header";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewClientPage() {
  return (
    <>
      <Header title="Nuevo Cliente" subtitle="Wizard de creación de cliente" />

      <div className="p-4 lg:p-6">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a clientes
        </Link>

        <div className="card max-w-2xl">
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Wizard de Creación</h3>
            <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
              El wizard completo de 7 pasos se implementará en la Fase 2.
              Por ahora la estructura está preparada.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
