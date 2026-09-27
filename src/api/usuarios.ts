import type { RolUsuario, Usuario } from '@/types/models'
import { api, json } from './client'

/** Solo activos; con `inactivos: true`, solo los desactivados (para reactivarlos). */
export function listar(filtros: { rol?: RolUsuario; inactivos?: boolean } = {}) {
  const q = new URLSearchParams()
  if (filtros.rol) q.set('rol', filtros.rol)
  if (filtros.inactivos) q.set('inactivos', 'true')
  const qs = q.toString()
  return api<Usuario[]>(`/usuarios${qs ? `?${qs}` : ''}`)
}

export interface NuevoUsuario {
  nombre: string
  email: string
  password: string
  rol: RolUsuario
}

export const crear = (datos: NuevoUsuario) => api<Usuario>('/usuarios', { method: 'POST', body: json(datos) })

/**
 * `activo: false` desactiva la cuenta (su sesión deja de valer al instante), `activo: true` la reactiva.
 * `password` asigna una contraseña temporal que la persona luego cambia en "Mi cuenta".
 */
export const actualizar = (id: string, cambios: { activo?: boolean; password?: string }) =>
  api<Usuario>(`/usuarios/${encodeURIComponent(id)}`, { method: 'PATCH', body: json(cambios) })
