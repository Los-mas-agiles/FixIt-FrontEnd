import type { RouteLocationNormalized } from 'vue-router'
import type { RolUsuario } from '@/types/models'
import { inicioPorRol, useSessionStore } from '@/stores/session'

declare module 'vue-router' {
  interface RouteMeta {
    /** Accesible sin sesión (login, 404). */
    publica?: boolean
    /** Roles que pueden entrar. Sin `roles` = cualquier usuario con sesión. */
    roles?: RolUsuario[]
    titulo?: string
  }
}

/** Requiere sesión + requiere rol. Devuelve true o la ruta a la que redirigir. */
export async function guardSesionYRol(to: RouteLocationNormalized) {
  const session = useSessionStore()
  await session.restaurar()

  if (to.name === 'login') {
    return session.autenticado ? inicioPorRol(session.rol!) : true
  }
  if (to.meta.publica) return true
  if (!session.autenticado) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirigir: to.fullPath } : {} }
  }
  if (to.meta.roles && !to.meta.roles.includes(session.rol!)) {
    return inicioPorRol(session.rol!)
  }
  return true
}
