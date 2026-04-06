"use client";

import { Header } from "@/components/shared/Header";
import { UserCircle } from "lucide-react";

export default function ProfilePage() {
  return (
    <>
      <Header title="Perfil" subtitle="Configura tu cuenta y preferencias" />
      <div className="p-4 lg:p-6">
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-magenta/10 flex items-center justify-center mb-4">
            <UserCircle className="w-8 h-8 text-brand-magenta" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Perfil y Configuración</h3>
          <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
            El perfil completo con preferencias se implementará en la Fase 7.
          </p>
        </div>
      </div>
    </>
  );
}
