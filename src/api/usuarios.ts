import type { RolUsuario, Usuario } from '@/types/models'
import { api, json } from './client'

export const listar = (rol?: RolUsuario) => api<Usuario[]>(`/usuarios${rol ? `?rol=${rol}` : ''}`)

export interface NuevoUsuario {
  nombre: string
  email: string
  password: string
  rol: RolUsuario
}

export const crear = (datos: NuevoUsuario) => api<Usuario>('/usuarios', { method: 'POST', body: json(datos) })
