"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/shared/Header";
import {
  Users2, Plus, Loader2, AlertCircle, Shield, Eye, Edit, Trash2,
  Mail, CheckCircle, UserPlus, Crown, ShieldCheck, User, X
} from "lucide-react";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface TeamMember {
  id: string;
  email: string;
  nombre: string | null;
  rol_cliente: string;
  activo: boolean;
  ultimo_acceso: string | null;
  created_at: string;
}

const ROLES = [
  { id: "owner", label: "Owner", desc: "Control total del portal", icon: Crown, color: "text-warning" },
  { id: "manager", label: "Manager", desc: "Ve todo, no puede eliminar", icon: ShieldCheck, color: "text-brand-purple" },
  { id: "agent", label: "Agente", desc: "Solo módulos asignados", icon: Shield, color: "text-brand-cyan" },
  { id: "viewer", label: "Viewer", desc: "Solo lectura", icon: Eye, color: "text-[var(--muted-foreground)]" },
];

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNombre, setInviteNombre] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current user's client_id
      const { data: portalUser } = await supabase
        .from("portal_usuarios")
        .select("cliente_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!portalUser?.cliente_id) return;

      // Get all team members for this client
      const { data: team, error } = await supabase
        .from("portal_usuarios")
        .select("id, email, nombre, rol_cliente, activo, ultimo_acceso, created_at")
        .eq("cliente_id", portalUser.cliente_id)
        .order("created_at");

      if (error) throw error;
      setMembers(team || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const { data: portalUser } = await supabase
        .from("portal_usuarios")
        .select("cliente_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!portalUser?.cliente_id) throw new Error("Sin cliente");

      // Check max users (would need admin API, for now just create)
      const { data: newMember, error } = await supabase
        .from("portal_usuarios")
        .insert({
          email: inviteEmail,
          nombre: inviteNombre || null,
          cliente_id: portalUser.cliente_id,
          rol_global: "client_member",
          rol_cliente: inviteRole,
          activo: true,
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes("duplicate")) {
          throw new Error("Ya existe un usuario con ese email");
        }
        throw error;
      }

      setMembers(prev => [...prev, newMember]);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteNombre("");
      setInviteRole("viewer");
      setMessage({ type: "success", text: `Miembro ${inviteEmail} añadido correctamente` });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setInviting(false);
    }
  };

  const getRoleInfo = (roleId: string) => ROLES.find(r => r.id === roleId) || ROLES[3];

  if (loading) {
    return (
      <>
        <Header title="Equipo" subtitle="Gestiona tu equipo" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Equipo" subtitle={`${members.length} miembros`}>
        <button onClick={() => setInviteOpen(true)} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Añadir miembro</span>
        </button>
      </Header>

      <div className="p-4 lg:p-6 space-y-6">
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

        {/* Roles explanation */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ROLES.map(role => {
            const Icon = role.icon;
            const count = members.filter(m => m.rol_cliente === role.id).length;
            return (
              <div key={role.id} className="card p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn("w-4 h-4", role.color)} />
                  <span className="text-sm font-semibold">{role.label}</span>
                  <span className="text-xs text-[var(--muted-foreground)] ml-auto">{count}</span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">{role.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Team list */}
        <div className="space-y-2">
          {members.map(member => {
            const roleInfo = getRoleInfo(member.rol_cliente);
            const RoleIcon = roleInfo.icon;
            return (
              <div key={member.id} className="card flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-brand-purple/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-brand-purple">
                    {getInitials(member.nombre || member.email)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm truncate">{member.nombre || member.email}</span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1",
                      member.activo ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                    )}>
                      {member.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    <span>{member.email}</span>
                    <span className="flex items-center gap-1">
                      <RoleIcon className={cn("w-3 h-3", roleInfo.color)} />
                      {roleInfo.label}
                    </span>
                    {member.ultimo_acceso && (
                      <span>Último acceso: {formatRelativeTime(member.ultimo_acceso)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {members.length === 0 && (
          <div className="card text-center py-12">
            <Users2 className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Sin miembros de equipo</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Añade miembros para que puedan acceder al portal
            </p>
            <button onClick={() => setInviteOpen(true)} className="btn-primary">
              <UserPlus className="w-4 h-4 mr-2 inline" />
              Añadir primer miembro
            </button>
          </div>
        )}

        {/* Invite Modal */}
        {inviteOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setInviteOpen(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-md animate-fade-in">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                  <h3 className="font-semibold">Añadir miembro</h3>
                  <button onClick={() => setInviteOpen(false)} className="btn-ghost p-1.5">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email *</label>
                    <input type="email" className="input-field" placeholder="usuario@empresa.com"
                      value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Nombre</label>
                    <input type="text" className="input-field" placeholder="Nombre completo"
                      value={inviteNombre} onChange={e => setInviteNombre(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Rol</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLES.filter(r => r.id !== "owner").map(role => {
                        const Icon = role.icon;
                        return (
                          <button key={role.id}
                            onClick={() => setInviteRole(role.id)}
                            className={cn(
                              "p-3 rounded-lg border-2 text-left transition-all",
                              inviteRole === role.id ? "border-brand-purple bg-brand-purple/5" : "border-[var(--border)]"
                            )}>
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className={cn("w-4 h-4", role.color)} />
                              <span className="text-sm font-medium">{role.label}</span>
                            </div>
                            <p className="text-[10px] text-[var(--muted-foreground)]">{role.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setInviteOpen(false)} className="btn-secondary">Cancelar</button>
                    <button onClick={inviteMember} disabled={inviting || !inviteEmail}
                      className="btn-primary flex items-center gap-2 disabled:opacity-50">
                      {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      {inviting ? "Añadiendo..." : "Añadir"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
