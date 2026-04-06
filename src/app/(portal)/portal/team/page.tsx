"use client";

import { Header } from "@/components/shared/Header";
import { Users2 } from "lucide-react";

export default function TeamPage() {
  return (
    <>
      <Header title="Equipo" subtitle="Gestiona los miembros de tu equipo" />
      <div className="p-4 lg:p-6">
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center mb-4">
            <Users2 className="w-8 h-8 text-brand-blue" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Gestión de Equipo</h3>
          <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
            La gestión de equipo con roles y permisos se implementará en la Fase 7.
          </p>
        </div>
      </div>
    </>
  );
}
