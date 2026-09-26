import type { Usuario } from '@/types/models'
import { api, json } from './client'

export const login = (email: string, password: string) =>
  api<{ token: string; usuario: Usuario }>('/auth/login', { method: 'POST', body: json({ email, password }) })

export const me = () => api<Usuario>('/auth/me')
