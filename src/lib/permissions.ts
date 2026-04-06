import { PortalUsuario, PermisosCustom } from "@/types";

/**
 * Check if user is super admin
 */
export function isSuperAdmin(user: PortalUsuario): boolean {
  return user.rol_global === "super_admin";
}

/**
 * Check if user is the owner of their client portal
 */
export function isClientOwner(user: PortalUsuario): boolean {
  return user.rol_cliente === "owner" || user.rol_global === "client_owner";
}

/**
 * Check if user can access a specific module
 */
export function canAccessModule(user: PortalUsuario, moduleId: string): boolean {
  if (isSuperAdmin(user)) return true;
  if (isClientOwner(user)) return true;
  if (user.rol_cliente === "manager") return true;

  // For agent/viewer/custom, check permisos_custom
  if (user.rol_cliente === "custom" && user.permisos_custom?.modulos) {
    return user.permisos_custom.modulos[moduleId]?.ver === true;
  }

  // Default agent/viewer: check if module is in their permissions
  if (user.permisos_custom?.modulos) {
    return user.permisos_custom.modulos[moduleId]?.ver === true;
  }

  return false;
}

/**
 * Check if user can perform a specific action on a module
 */
export function canPerformAction(
  user: PortalUsuario,
  moduleId: string,
  action: "ver" | "crear" | "editar" | "eliminar"
): boolean {
  if (isSuperAdmin(user)) return true;
  if (isClientOwner(user)) return true;

  if (user.rol_cliente === "manager") {
    return action !== "eliminar"; // Managers can't delete
  }

  if (user.rol_cliente === "viewer") {
    return action === "ver";
  }

  // Agent or custom: check specific permissions
  if (user.permisos_custom?.modulos) {
    const modulePerms = user.permisos_custom.modulos[moduleId];
    if (!modulePerms) return false;
    return modulePerms[action] === true;
  }

  return false;
}

/**
 * Check if user can manage team members
 */
export function canManageTeam(user: PortalUsuario): boolean {
  return isSuperAdmin(user) || isClientOwner(user);
}

/**
 * Check if user can access admin panel
 */
export function canAccessAdmin(user: PortalUsuario): boolean {
  return isSuperAdmin(user);
}
