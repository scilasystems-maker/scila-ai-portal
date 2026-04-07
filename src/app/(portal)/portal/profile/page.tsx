"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/shared/Header";
import { useTheme } from "@/components/shared/ThemeProvider";
import {
  User, Mail, Clock, Globe, Bell, BellOff, Sun, Moon, Save,
  Loader2, AlertCircle, CheckCircle, Lock, Eye, EyeOff
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <>
        <Header title="Perfil" subtitle="Configuración de tu cuenta" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
        </div>
      </>
    );
  }

  return <ProfileContent />;
}

function ProfileContent() {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [profile, setProfile] = useState({
    nombre: "",
    email: "",
    zona_horaria: "Europe/Madrid",
    notif_email: true,
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/portal/config");
      if (!res.ok) return;
      const data = await res.json();
      if (data.user) {
        setProfile({
          nombre: data.user.nombre || "",
          email: data.user.email || "",
          zona_horaria: data.user.zona_horaria || "Europe/Madrid",
          notif_email: data.user.preferencias?.notif_email !== false,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { error } = await supabase
        .from("portal_usuarios")
        .update({
          nombre: profile.nombre,
          zona_horaria: profile.zona_horaria,
          preferencias: { tema: theme, notif_email: profile.notif_email, idioma: "es" },
        })
        .eq("auth_user_id", user.id);

      if (error) throw error;
      setMessage({ type: "success", text: "Perfil actualizado correctamente" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: "error", text: "Las contraseñas no coinciden" });
      return;
    }
    if (passwords.new.length < 6) {
      setMessage({ type: "error", text: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    setSavingPassword(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: passwords.new });
      if (error) throw error;
      setPasswords({ current: "", new: "", confirm: "" });
      setMessage({ type: "success", text: "Contraseña actualizada correctamente" });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingPassword(false);
    }
  };

  const timezones = [
    "Europe/Madrid", "Europe/London", "Europe/Paris", "Europe/Berlin",
    "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "America/Mexico_City", "America/Bogota", "America/Buenos_Aires", "America/Sao_Paulo",
  ];

  if (loading) {
    return (
      <>
        <Header title="Perfil" subtitle="Configuración de tu cuenta" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Perfil" subtitle="Configuración de tu cuenta" />

      <div className="p-4 lg:p-6 max-w-2xl space-y-6">
        {/* Messages */}
        {message && (
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg text-sm",
            message.type === "success" ? "bg-success/10 border border-success/20 text-success" : "bg-danger/10 border border-danger/20 text-danger"
          )}>
            {message.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* Profile info */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-brand-purple" />
            Información personal
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nombre</label>
              <input type="text" className="input-field" value={profile.nombre}
                onChange={e => setProfile(p => ({ ...p, nombre: e.target.value }))} placeholder="Tu nombre" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <div className="relative">
                <input type="email" className="input-field bg-[var(--muted)] cursor-not-allowed" value={profile.email} disabled />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">El email no se puede cambiar</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Zona horaria</label>
              <select className="input-field" value={profile.zona_horaria}
                onChange={e => setProfile(p => ({ ...p, zona_horaria: e.target.value }))}>
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <button onClick={saveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

        {/* Theme */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            {theme === "dark" ? <Moon className="w-4 h-4 text-brand-purple" /> : <Sun className="w-4 h-4 text-warning" />}
            Apariencia
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "p-4 rounded-lg border-2 transition-all text-center",
                theme === "dark" ? "border-brand-purple bg-brand-purple/5" : "border-[var(--border)]"
              )}
            >
              <Moon className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-medium">Oscuro</span>
            </button>
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "p-4 rounded-lg border-2 transition-all text-center",
                theme === "light" ? "border-brand-purple bg-brand-purple/5" : "border-[var(--border)]"
              )}
            >
              <Sun className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm font-medium">Claro</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-brand-cyan" />
            Notificaciones
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notificaciones por email</p>
              <p className="text-xs text-[var(--muted-foreground)]">Recibir alertas de nuevos leads, citas y eventos</p>
            </div>
            <button
              onClick={() => setProfile(p => ({ ...p, notif_email: !p.notif_email }))}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                profile.notif_email ? "bg-brand-purple" : "bg-[var(--muted)]"
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow",
                profile.notif_email ? "left-6" : "left-0.5"
              )} />
            </button>
          </div>
          <button onClick={saveProfile} disabled={saving} className="btn-primary flex items-center gap-2 mt-4">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar preferencias
          </button>
        </div>

        {/* Change password */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-warning" />
            Cambiar contraseña
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nueva contraseña</label>
              <div className="relative">
                <input type={showPasswords ? "text" : "password"} className="input-field pr-10"
                  value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))}
                  placeholder="Mínimo 6 caracteres" />
                <button type="button" onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Confirmar contraseña</label>
              <input type={showPasswords ? "text" : "password"} className="input-field"
                value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Repite la contraseña" />
            </div>
            <button onClick={changePassword} disabled={savingPassword || !passwords.new}
              className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {savingPassword ? "Cambiando..." : "Cambiar contraseña"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
