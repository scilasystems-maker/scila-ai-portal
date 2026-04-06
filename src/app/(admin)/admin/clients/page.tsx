"use client";

import { Header } from "@/components/shared/Header";
import { Users, Plus, Search } from "lucide-react";
import Link from "next/link";

export default function AdminClientsPage() {
  return (
    <>
      <Header title="Clientes" subtitle="Gestiona todos tus clientes">
        <Link href="/admin/clients/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Cliente</span>
        </Link>
      </Header>

      <div className="p-4 lg:p-6">
        {/* Search & filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Buscar por nombre, empresa o email..."
              className="input-field pl-9"
            />
          </div>
          <select className="input-field w-auto">
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="suspendido">Suspendido</option>
            <option value="trial">Trial</option>
          </select>
        </div>

        {/* Empty state */}
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-brand-purple" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Sin clientes todavía</h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-sm">
            Crea tu primer cliente para conectar su Supabase, configurar módulos y empezar a ver sus datos.
          </p>
          <Link href="/admin/clients/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Crear primer cliente
          </Link>
        </div>
      </div>
    </>
  );
}
