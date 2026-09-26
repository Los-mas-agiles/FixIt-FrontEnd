import { ref, shallowRef } from 'vue'
import { ApiRequestError, mensajeDeError } from '@/api/client'

/**
 * Estado de carga/error de una petición. `recargar(silencioso)` no vuelve a mostrar
 * el spinner si ya hay datos (útil para el polling).
 */
export function useCarga<T>(fn: () => Promise<T>) {
  const datos = shallowRef<T | null>(null)
  const cargando = ref(false)
  const error = ref<string | null>(null)
  /** Status HTTP del último error (0 = sin conexión). */
  const status = ref<number | null>(null)
  let ultima = 0

  async function recargar(silencioso = false) {
    const n = ++ultima
    if (!silencioso || datos.value === null) cargando.value = true
    try {
      const r = await fn()
      if (n !== ultima) return // llegó una respuesta más nueva
      datos.value = r
      error.value = null
      status.value = null
    } catch (e) {
      if (n !== ultima) return
      // En polling silencioso, un fallo puntual no borra lo que ya se ve
      if (!silencioso || datos.value === null) {
        error.value = mensajeDeError(e)
        status.value = e instanceof ApiRequestError ? e.status : null
      }
    } finally {
      if (n === ultima) cargando.value = false
    }
  }

  return { datos, cargando, error, status, recargar }
}
