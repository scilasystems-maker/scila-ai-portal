"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar, type NavItem } from "@/components/shared/Sidebar";
import {
  LayoutDashboard, Users, CreditCard, ShieldCheck, Zap, CalendarClock, Database
} from "lucide-react";

const adminNavItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { id: "clients", label: "Clientes", href: "/admin/clients", icon: Users },
  { id: "agentes", label: "Agentes", href: "/admin/agentes", icon: Zap },
  { id: "billing", label: "Facturación", href: "/admin/billing", icon: CreditCard },
  { id: "upcoming", label: "Próximos pagos", href: "/admin/upcoming", icon: CalendarClock },
  { id: "templates", label: "Plantillas", href: "/admin/templates", icon: Database },
  { id: "audit", label: "Auditoría", href: "/admin/audit", icon: ShieldCheck },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (!mounted) {
    return <div className="flex min-h-screen"><main className="flex-1">{children}</main></div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        items={adminNavItems}
        userName="Admin"
        userEmail="Scilasystems@gmail.com"
        userRole="Super Admin"
        logoText="SCILA AI Admin"
        onLogout={handleLogout}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
