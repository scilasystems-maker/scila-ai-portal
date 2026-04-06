"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="animate-fade-in text-center">
      <div className="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center mx-auto mb-6">
        <ShieldCheck className="w-8 h-8 text-brand-purple" />
      </div>

      <h2 className="text-2xl font-bold mb-2">Acceso restringido</h2>
      <p className="text-[var(--muted-foreground)] text-sm mb-4 max-w-sm mx-auto">
        Las cuentas de SCILA AI Portal son creadas por el administrador.
        Si necesitas acceso, contacta con tu administrador para que te cree una cuenta.
      </p>

      <div className="card mt-8 text-left">
        <h3 className="font-semibold text-sm mb-3">¿Cómo obtener acceso?</h3>
        <ol className="space-y-2 text-sm text-[var(--muted-foreground)]">
          <li className="flex gap-2">
            <span className="font-bold text-brand-purple">1.</span>
            Contacta con el administrador de SCILA AI
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-brand-purple">2.</span>
            El administrador creará tu cuenta y te enviará las credenciales
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-brand-purple">3.</span>
            Usa el email y contraseña proporcionados para iniciar sesión
          </li>
        </ol>
      </div>

      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-brand-purple hover:text-brand-purple-light font-medium transition-colors mt-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al login
      </Link>
    </div>
  );
}
