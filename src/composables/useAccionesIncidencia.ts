import { ref } from 'vue'
import * as incidenciasApi from '@/api/incidencias'
import { ApiRequestError, mensajeDeError } from '@/api/client'
import type { Incidencia, Prioridad, TipoIncidencia } from '@/types/models'
import { siguienteEstado, textoPrioridad, textoTipo } from '@/utils/textos'
import { toast } from './useToast'

/**
 * Acciones sobre una incidencia (Kanban y detalle). El backend decide si se puede:
 * aquí solo se llama y se muestra su mensaje. Ante un 409 se recarga la lista.
 */
export function useAccionesIncidencia(recargar: () => unknown) {
  /** id de la incidencia con una acción en curso (para desactivar sus botones). */
  const ocupada = ref<string | null>(null)

  async function ejecutar(id: string, fn: () => Promise<Incidencia>, titulo: string, cuerpo: (i: Incidencia) => string) {
    if (ocupada.value) return null
    ocupada.value = id
    try {
      const r = await fn()
      toast(titulo, cuerpo(r))
      return r
    } catch (e) {
      const conflicto = e instanceof ApiRequestError && e.status === 409
      toast(e instanceof ApiRequestError && e.code === 'LIMITE_WIP' ? 'Límite de trabajo' : 'No se pudo hacer', mensajeDeError(e))
      if (conflicto || (e instanceof ApiRequestError && e.status === 403)) recargar()
      return null
    } finally {
      ocupada.value = null
    }
  }

  function avanzar(inc: Incidencia) {
    const destino = siguienteEstado[inc.estado]
    if (!destino) return Promise.resolve(null)
    return ejecutar(
      inc.id,
      () => incidenciasApi.cambiarEstado(inc.id, destino),
      destino === 'en_proceso' ? 'Incidencia tomada' : 'Marcada resuelta',
      (r) =>
        destino === 'en_proceso'
          ? `${r.asignadoA?.nombre ?? 'El técnico'} ya está en esto. Le avisamos a ${r.residente.nombre}.`
          : `Pasó a Resuelta. ${r.residente.nombre} recibe el aviso.`,
    )
  }

  function asignar(inc: Incidencia, tecnicoId: string | null) {
    return ejecutar(
      inc.id,
      () => incidenciasApi.asignar(inc.id, tecnicoId),
      tecnicoId ? 'Técnico asignado' : 'Técnico quitado',
      (r) => (r.asignadoA ? `${r.asignadoA.nombre} tiene la incidencia y recibe un aviso.` : 'La incidencia vuelve a estar libre.'),
    )
  }

  function clasificar(inc: Incidencia, cambios: { tipo?: TipoIncidencia; prioridad?: Prioridad }) {
    return ejecutar(
      inc.id,
      () => incidenciasApi.clasificar(inc.id, cambios),
      'Clasificación corregida',
      (r) => `Ahora es ${textoTipo[r.tipo]}, prioridad ${textoPrioridad[r.prioridad].toLowerCase()}. Cuenta para la precisión de la IA.`,
    )
  }

  return { ocupada, avanzar, asignar, clasificar }
}
