"use client";

import { Header } from "@/components/shared/Header";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  return (
    <>
      <Header title="Detalle de Cliente" subtitle={`ID: ${params.id}`} />
      <div className="p-4 lg:p-6">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a clientes
        </Link>
        <div className="card">
          <p className="text-sm text-[var(--muted-foreground)]">
            El detalle del cliente se implementará en la Fase 2.
          </p>
        </div>
      </div>
    </>
  );
}
