import { nextTick, onMounted, type Ref } from 'vue'
import { enter } from '@/lib/blockCity'

/**
 * Cascada de entrada de Block City para los [data-enter] de la vista.
 * Llamar a `animar()` después de que lleguen datos anima solo los elementos nuevos.
 */
export function useEntrada(raiz: Ref<HTMLElement | null>) {
  const animar = () => nextTick(() => { if (raiz.value) enter(raiz.value) })
  onMounted(animar)
  return { animar }
}
