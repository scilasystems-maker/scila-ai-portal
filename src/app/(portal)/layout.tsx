"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar, type NavItem } from "@/components/shared/Sidebar";
import {
  LayoutDashboard, MessageSquare, Users2, Calendar, UserCircle
} from "lucide-react";

const portalNavItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
  { id: "conversations", label: "Conversaciones", href: "/portal/conversations", icon: MessageSquare },
  { id: "team", label: "Equipo", href: "/portal/team", icon: Users2 },
  { id: "profile", label: "Perfil", href: "/portal/profile", icon: UserCircle },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
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
        items={portalNavItems}
        userName="Cliente"
        userEmail="cliente@email.com"
        userRole="Portal"
        logoText="SCILA AI Portal"
        onLogout={handleLogout}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
