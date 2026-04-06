"use client";

import { Header } from "@/components/shared/Header";
import { MessageSquare } from "lucide-react";

export default function ConversationsPage() {
  return (
    <>
      <Header title="Conversaciones" subtitle="Chat en tiempo real con tus clientes" />
      <div className="p-4 lg:p-6">
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-brand-purple" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Conversaciones de WhatsApp</h3>
          <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
            La interfaz de chat estilo WhatsApp Web se implementará en la Fase 5.
          </p>
        </div>
      </div>
    </>
  );
}
