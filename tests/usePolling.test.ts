import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { usePolling } from '@/composables/usePolling'

let oculta = false
Object.defineProperty(document, 'hidden', { configurable: true, get: () => oculta })

/** Monta un componente mínimo que usa el polling, como lo hacen las vistas. */
function montar(fn: () => unknown, segundos: number, opciones?: { inmediato?: boolean }) {
  let control!: ReturnType<typeof usePolling>
  const vista = mount(
    defineComponent({
      setup() {
        control = usePolling(fn, segundos, opciones)
        return () => h('div')
      },
    }),
  )
  return { vista, control }
}

const cambiarVisibilidad = (estaOculta: boolean) => {
  oculta = estaOculta
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    oculta = false
  })
  afterEach(() => vi.useRealTimers())

  it('repite la función cada N segundos', () => {
    const fn = vi.fn()
    montar(fn, 15)

    vi.advanceTimersByTime(15_000)
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(30_000)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('con inmediato la llama apenas se monta la vista', () => {
    const fn = vi.fn()
    montar(fn, 15, { inmediato: true })

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('con la pestaña oculta no consulta la API', () => {
    const fn = vi.fn()
    montar(fn, 15)
    oculta = true

    vi.advanceTimersByTime(60_000)

    expect(fn).not.toHaveBeenCalled()
  })

  it('al volver a la pestaña actualiza enseguida', () => {
    const fn = vi.fn()
    montar(fn, 15)
    cambiarVisibilidad(true)
    vi.advanceTimersByTime(60_000)

    cambiarVisibilidad(false)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('al salir de la vista deja de consultar', () => {
    const fn = vi.fn()
    const { vista } = montar(fn, 15)

    vista.unmount()
    vi.advanceTimersByTime(60_000)
    cambiarVisibilidad(false)

    expect(fn).not.toHaveBeenCalled()
  })

  it('detener e iniciar controlan el ciclo a mano', () => {
    const fn = vi.fn()
    const { control } = montar(fn, 10)

    control.detener()
    vi.advanceTimersByTime(30_000)
    expect(fn).not.toHaveBeenCalled()

    control.iniciar()
    vi.advanceTimersByTime(10_000)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
