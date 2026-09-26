import type { Directive } from 'vue'
import { bindTilt, unbindTilt } from '@/lib/blockCity'

/** v-tilt: bloque magnético (capa F2). Solo con mouse; en touch o reduced-motion no hace nada. */
export const vTilt: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    bindTilt(el, { amp: binding.value ?? 6 })
  },
  unmounted(el) {
    unbindTilt(el)
  },
}
