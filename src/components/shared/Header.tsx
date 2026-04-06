"use client";

import { useState } from "react";
import { Bell, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  notificationCount?: number;
}

export function Header({ title, subtitle, children, notificationCount = 0 }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 lg:px-6 py-4">
        {/* Left: Title */}
        <div className="pl-12 lg:pl-0">
          <h1 className="text-lg font-bold text-[var(--foreground)]">{title}</h1>
          {subtitle && (
            <p className="text-sm text-[var(--muted-foreground)]">{subtitle}</p>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className={cn(
            "transition-all duration-300 overflow-hidden",
            searchOpen ? "w-64" : "w-0"
          )}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Buscar..."
                className="input-field pl-9 pr-8 py-2 text-sm"
                autoFocus={searchOpen}
              />
              <button
                onClick={() => setSearchOpen(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!searchOpen && (
            <button
              onClick={() => setSearchOpen(true)}
              className="btn-ghost p-2"
              title="Buscar"
            >
              <Search className="w-5 h-5" />
            </button>
          )}

          {/* Notifications */}
          <button className="btn-ghost p-2 relative" title="Notificaciones">
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>

          {/* Extra actions */}
          {children}
        </div>
      </div>
    </header>
  );
}
