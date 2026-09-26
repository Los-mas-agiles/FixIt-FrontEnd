import type { KPIs, Prioridad, PuntoCFD } from '@/types/models'
import { api } from './client'

export interface FiltrosKpis {
  desde?: string
  hasta?: string
  prioridad?: Prioridad
}

function query(f: Record<string, string | undefined>) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(f)) if (v) q.set(k, v)
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const obtener = (f: FiltrosKpis = {}) => api<KPIs>(`/kpis${query({ ...f })}`)

export const cfd = (f: { desde?: string; hasta?: string } = {}) => api<PuntoCFD[]>(`/kpis/cfd${query(f)}`)
