import type { EstadoIncidencia, Incidencia, IncidenciaDetalle, Prioridad, TipoIncidencia } from '@/types/models'
import { api, json } from './client'

export interface FiltrosIncidencias {
  estado?: EstadoIncidencia
  prioridad?: Prioridad
  asignadoA?: 'me'
}

export function listar(filtros: FiltrosIncidencias = {}) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(filtros)) if (v) q.set(k, v)
  const qs = q.toString()
  return api<Incidencia[]>(`/incidencias${qs ? `?${qs}` : ''}`)
}

export const obtener = (id: string) => api<IncidenciaDetalle>(`/incidencias/${encodeURIComponent(id)}`)

/** Tarda 1–8 s: la IA clasifica en el mismo request. */
export function crear(descripcion: string, foto?: Blob | null) {
  const form = new FormData()
  form.append('descripcion', descripcion)
  if (foto) form.append('foto', foto, foto instanceof File ? foto.name : 'foto.jpg')
  return api<Incidencia>('/incidencias', { method: 'POST', body: form })
}

export const cambiarEstado = (id: string, estado: EstadoIncidencia) =>
  api<Incidencia>(`/incidencias/${encodeURIComponent(id)}/estado`, { method: 'PATCH', body: json({ estado }) })

export const asignar = (id: string, tecnicoId: string | null) =>
  api<Incidencia>(`/incidencias/${encodeURIComponent(id)}/asignacion`, { method: 'PATCH', body: json({ tecnicoId }) })

export const clasificar = (id: string, cambios: { tipo?: TipoIncidencia; prioridad?: Prioridad }) =>
  api<Incidencia>(`/incidencias/${encodeURIComponent(id)}/clasificacion`, { method: 'PATCH', body: json(cambios) })
