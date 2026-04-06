"use client";

import { Header } from "@/components/shared/Header";
import { CreditCard } from "lucide-react";

export default function BillingPage() {
  return (
    <>
      <Header title="Facturación" subtitle="Control de cobros a clientes" />
      <div className="p-4 lg:p-6">
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
            <CreditCard className="w-8 h-8 text-warning" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Facturación</h3>
          <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
            El módulo de facturación se implementará en la Fase 8.
          </p>
        </div>
      </div>
    </>
  );
}
