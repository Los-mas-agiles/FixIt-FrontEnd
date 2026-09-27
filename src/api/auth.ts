import type { Usuario } from '@/types/models'
import { api, json } from './client'

export const login = (email: string, password: string) =>
  api<{ token: string; usuario: Usuario }>('/auth/login', { method: 'POST', body: json({ email, password }) })

export const me = () => api<Usuario>('/auth/me')

/** Cambia la contraseña propia. Si `actual` no coincide responde 400 VALIDACION (no 401): la sesión sigue abierta. */
export const cambiarPassword = (actual: string, nueva: string) =>
  api<{ ok: true }>('/auth/password', { method: 'PATCH', body: json({ actual, nueva }) })
