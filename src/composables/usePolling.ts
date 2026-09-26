import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Repite `fn` cada `segundos` mientras la vista está abierta.
 * Se pausa con la pestaña oculta y vuelve a llamar al volver.
 */
export function usePolling(fn: () => unknown, segundos: number, { inmediato = false } = {}) {
  let timer: ReturnType<typeof setInterval> | null = null

  const iniciar = () => {
    detener()
    timer = setInterval(() => { if (!document.hidden) fn() }, segundos * 1000)
  }
  const detener = () => {
    if (timer) clearInterval(timer)
    timer = null
  }
  const alVolver = () => { if (!document.hidden) fn() }

  onMounted(() => {
    if (inmediato) fn()
    iniciar()
    document.addEventListener('visibilitychange', alVolver)
  })
  onBeforeUnmount(() => {
    detener()
    document.removeEventListener('visibilitychange', alVolver)
  })

  return { iniciar, detener }
}
