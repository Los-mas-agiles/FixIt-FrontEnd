import type { Notificacion } from '@/types/models'
import { api, json } from './client'

export const listar = () => api<Notificacion[]>('/notificaciones')

export const marcarLeida = (id: string) =>
  api<Notificacion>(`/notificaciones/${encodeURIComponent(id)}/leida`, { method: 'PATCH' })

export const leerTodas = () => api<{ ok: true }>('/notificaciones/leer-todas', { method: 'POST' })

export const vapidPublicKey = () => api<{ publicKey: string }>('/push/vapid-public-key')

export const suscribir = (sub: PushSubscriptionJSON) =>
  api<{ ok: true }>('/push/suscripciones', { method: 'POST', body: json(sub) })

export const desuscribir = (endpoint: string) =>
  api<{ ok: true }>('/push/suscripciones', { method: 'DELETE', body: json({ endpoint }) })
