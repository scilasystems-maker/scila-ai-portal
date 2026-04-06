// =============================================
// SCILA AI Portal — TypeScript Types
// =============================================

// ── Database Types ──
export interface PortalCliente {
  id: string;
  email: string;
  nombre: string | null;
  empresa: string | null;
  supabase_url: string | null;
  supabase_key: string | null;
  config: Record<string, any>;
  plan: "basico" | "pro" | "enterprise";
  estado: "activo" | "suspendido" | "trial";
  max_usuarios: number;
  modulos_habilitados: string[];
  coste_hora: number;
  minutos_por_conv: number;
  created_at: string;
  updated_at: string;
}

export interface PortalUsuario {
  id: string;
  auth_user_id: string | null;
  cliente_id: string | null;
  email: string;
  nombre: string | null;
  avatar_url: string | null;
  rol_global: "super_admin" | "client_owner" | "client_member";
  rol_cliente: "owner" | "manager" | "agent" | "viewer" | "custom" | null;
  permisos_custom: PermisosCustom;
  zona_horaria: string;
  preferencias: UserPreferences;
  ultimo_acceso: string | null;
  activo: boolean;
  created_at: string;
}

export interface PortalModulo {
  id: string;
  cliente_id: string;
  tipo: "leads" | "citas" | "conversaciones" | "generico";
  nombre_display: string;
  icono: string;
  tabla_origen: string;
  mapeo_campos: Record<string, string>;
  config_visual: ConfigVisual;
  metricas_config: MetricaConfig[];
  orden: number;
  visible: boolean;
  permite_crear: boolean;
  permite_editar: boolean;
  permite_eliminar: boolean;
  created_at: string;
}

export interface PortalNotificacion {
  id: string;
  usuario_id: string;
  cliente_id: string | null;
  tipo: string;
  titulo: string;
  mensaje: string | null;
  leida: boolean;
  datos_extra: Record<string, any>;
  created_at: string;
}

export interface PortalAuditLog {
  id: string;
  usuario_id: string | null;
  cliente_id: string | null;
  accion: string;
  recurso: string | null;
  detalles: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface PortalFacturacion {
  id: string;
  cliente_id: string;
  concepto: string;
  importe: number;
  estado: "pagado" | "pendiente" | "vencido";
  fecha_emision: string;
  fecha_vencimiento: string | null;
  notas: string | null;
  created_at: string;
}

export interface PortalDashboardConfig {
  id: string;
  usuario_id: string;
  cliente_id: string;
  layout: DashboardWidget[];
  created_at: string;
  updated_at: string;
}

// ── Nested Types ──
export interface PermisosCustom {
  modulos?: Record<string, ModulePermissions>;
}

export interface ModulePermissions {
  ver: boolean;
  crear?: boolean;
  editar?: boolean;
  eliminar?: boolean;
}

export interface UserPreferences {
  tema: "dark" | "light";
  notif_email: boolean;
  idioma: string;
}

export interface ConfigVisual {
  tipo_vista: "tabla" | "kanban" | "galeria" | "timeline" | "calendario";
  columnas_visibles?: string[];
  campo_imagen?: string;
  campo_estado?: string;
  estados_kanban?: string[];
}

export interface MetricaConfig {
  tipo: string;
  campo: string;
  label: string;
  formato?: string;
}

export interface DashboardWidget {
  widget_id: string;
  modulo_id?: string;
  tipo: string;
  posicion: { x: number; y: number };
  tamanio: { w: number; h: number };
  visible: boolean;
}

// ── Auth Types ──
export interface AuthUser {
  id: string;
  email: string;
  portalUser: PortalUsuario | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  nombre: string;
}

// ── UI Types ──
export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export type Theme = "dark" | "light";
