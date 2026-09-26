import type { ClasificadoPor, EstadoIncidencia, Prioridad, RolUsuario, TipoIncidencia } from '@/types/models'

// Etiquetas legibles: nunca mostrar 'en_proceso' o 'plomeria' crudos.

export const ESTADOS: EstadoIncidencia[] = ['pendiente', 'en_proceso', 'resuelto']
export const TIPOS: TipoIncidencia[] = ['plomeria', 'electricidad', 'ascensor', 'limpieza', 'seguridad', 'otros']
export const PRIORIDADES: Prioridad[] = ['alta', 'media', 'baja']

export const textoEstado: Record<EstadoIncidencia, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  resuelto: 'Resuelta',
}

export const textoTipo: Record<TipoIncidencia, string> = {
  plomeria: 'Plomería',
  electricidad: 'Electricidad',
  ascensor: 'Ascensor',
  limpieza: 'Limpieza',
  seguridad: 'Seguridad',
  otros: 'Otros',
}

export const textoPrioridad: Record<Prioridad, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

export const textoRol: Record<RolUsuario, string> = {
  residente: 'Residente',
  mantenimiento: 'Mantenimiento',
  administrador: 'Administración',
}

export const textoClasificadoPor: Record<ClasificadoPor, string> = {
  ia: 'Clasificó la IA',
  fallback: 'IA no disponible: revisar',
  manual: 'Corregida a mano',
}

/** Bloque pastel de cada estado (Modular Block City: durazno → celeste → menta). */
export const colorEstado: Record<EstadoIncidencia, string> = {
  pendiente: 'var(--mbc-peach)',
  en_proceso: 'var(--mbc-sky)',
  resuelto: 'var(--mbc-mint)',
}

/** Paso del stepper (1/3, 2/3, 3/3). */
export const pasoEstado: Record<EstadoIncidencia, number> = { pendiente: 1, en_proceso: 2, resuelto: 3 }

/** Siguiente estado permitido (solo hacia adelante). */
export const siguienteEstado: Record<EstadoIncidencia, EstadoIncidencia | null> = {
  pendiente: 'en_proceso',
  en_proceso: 'resuelto',
  resuelto: null,
}

/** Código corto para mostrar en tags: INC-0012. No es un ID real, solo ayuda a nombrarla. */
export function codigoIncidencia(id: string) {
  return `INC-${id.replace(/-/g, '').slice(-4).toUpperCase()}`
}

/** Primer nombre ("María Rojas" → "María"). */
export const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0] ?? nombre

/** "1 incidencia" / "3 incidencias". */
export function plural(n: number, singular: string, pluralTxt = `${singular}s`) {
  return `${n} ${n === 1 ? singular : pluralTxt}`
}
