"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Settings, CreditCard, Shield, FileText,
  ChevronLeft, ChevronRight, LogOut, Sun, Moon, Menu, X, Bell,
  type LucideIcon
} from "lucide-react";
import { useTheme } from "@/components/shared/ThemeProvider";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

interface SidebarProps {
  items: NavItem[];
  userName: string;
  userEmail: string;
  userRole: string;
  logoText?: string;
  onLogout: () => void;
}

export function Sidebar({ items, userName, userEmail, userRole, logoText = "SCILA AI", onLogout }: SidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin/dashboard" || href === "/portal/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--sidebar-border)]">
        <img src="/logo.png" alt="SCILA AI" className="w-8 h-8 flex-shrink-0" />
        {!collapsed && (
          <div className="overflow-hidden">
            <span className="font-bold text-sm text-[var(--foreground)] block truncate">{logoText}</span>
            <span className="text-xs text-[var(--muted-foreground)] block truncate">{userRole}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "sidebar-item group",
                active && "active",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", active && "text-brand-purple")} />
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto bg-brand-purple text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[var(--sidebar-border)] px-3 py-3 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={cn("sidebar-item w-full", collapsed && "justify-center px-2")}
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {!collapsed && <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>}
        </button>

        {/* Collapse toggle - desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn("sidebar-item w-full hidden lg:flex", collapsed && "justify-center px-2")}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span>Colapsar</span>}
        </button>

        {/* User info & logout */}
        <div className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg",
          collapsed && "justify-center px-2"
        )}>
          <div className="w-8 h-8 rounded-full bg-brand-purple/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-brand-purple">
              {userName?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-[var(--foreground)]">{userName || "Usuario"}</p>
              <p className="text-xs truncate text-[var(--muted-foreground)]">{userEmail}</p>
            </div>
          )}
          <button
            onClick={onLogout}
            className="text-[var(--muted-foreground)] hover:text-danger transition-colors flex-shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--card)] border shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 h-full w-64 z-50 transition-transform duration-300",
          "bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-[var(--muted-foreground)]"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-300",
          "bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)]",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
