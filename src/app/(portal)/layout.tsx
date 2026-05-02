"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar, type NavItem } from "@/components/shared/Sidebar";
import {
  LayoutDashboard, MessageSquare, Users2, UserCircle,
  Calendar, Users, LayoutGrid, Image, FileText, BarChart3, Mail,
  type LucideIcon
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, MessageSquare, Users2, UserCircle,
  Calendar, Users, LayoutGrid, Image, FileText, BarChart3, Mail,
};

function getIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || LayoutGrid;
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [userName, setUserName] = useState("Cliente");
  const [userEmail, setUserEmail] = useState("");
  const [empresaName, setEmpresaName] = useState("Portal");

  useEffect(() => {
    setMounted(true);
    loadPortalConfig();
  }, []);

  const loadPortalConfig = async () => {
    try {
      const res = await fetch("/api/portal/config");
      if (!res.ok) return;
      const config = await res.json();

      // Set user info
      if (config.user) {
        setUserName(config.user.nombre || config.user.email?.split("@")[0] || "Cliente");
        setUserEmail(config.user.email || "");
      }
      if (config.client) {
        setEmpresaName(config.client.empresa || config.client.nombre || "Portal");
      }

      // Build nav items from modules
      const items: NavItem[] = [
        { id: "dashboard", label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
      ];

      // Add module-based nav items
      if (config.modules && config.modules.length > 0) {
        config.modules.forEach((mod: any) => {
          if (mod.tipo === "conversaciones") {
            items.push({
              id: `mod-${mod.id}`,
              label: mod.nombre_display || "Conversaciones",
              href: "/portal/conversations",
              icon: MessageSquare,
            });
          } else if (mod.tipo === "email") {
            items.push({
              id: `mod-${mod.id}`,
              label: mod.nombre_display || "Email",
              href: "/portal/email",
              icon: Mail,
            });
          } else {
            items.push({
              id: `mod-${mod.id}`,
              label: mod.nombre_display,
              href: `/portal/modules/${mod.id}`,
              icon: getIcon(mod.icono),
            });
          }
        });
      }

      // Always add these at the end
      items.push(
        { id: "team", label: "Equipo", href: "/portal/team", icon: Users2 },
        { id: "profile", label: "Perfil", href: "/portal/profile", icon: UserCircle },
      );

      setNavItems(items);
    } catch (err) {
      console.error("Error loading portal config:", err);
      // Fallback nav
      setNavItems([
        { id: "dashboard", label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
        { id: "conversations", label: "Conversaciones", href: "/portal/conversations", icon: MessageSquare },
        { id: "team", label: "Equipo", href: "/portal/team", icon: Users2 },
        { id: "profile", label: "Perfil", href: "/portal/profile", icon: UserCircle },
      ]);
    }
  };

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
        items={navItems}
        userName={userName}
        userEmail={userEmail}
        userRole={empresaName}
        logoText="SCILA AI Portal"
        onLogout={handleLogout}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
