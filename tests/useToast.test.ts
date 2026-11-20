import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from '@/composables/useToast'

const { toasts, toast, cerrar } = useToast()

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    toasts.splice(0) // el estado es compartido por toda la app: se limpia entre tests
  })
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('agrega el aviso con su título y cuerpo', () => {
    toast('Incidencia reportada', 'Mantenimiento ya la ve en el tablero')

    expect(toasts).toHaveLength(1)
    expect(toasts[0]).toMatchObject({ titulo: 'Incidencia reportada', cuerpo: 'Mantenimiento ya la ve en el tablero', saliendo: false })
  })

  it('muestra como máximo 3 avisos: el más antiguo sale primero', () => {
    toast('Uno')
    toast('Dos')
    toast('Tres')
    toast('Cuatro')

    expect(toasts.map((t) => t.titulo)).toEqual(['Dos', 'Tres', 'Cuatro'])
  })

  it('se cierra solo después de 5,2 s (más la animación de salida)', () => {
    toast('Incidencia tomada')

    vi.advanceTimersByTime(5199)
    expect(toasts[0]!.saliendo).toBe(false)

    vi.advanceTimersByTime(1)
    expect(toasts[0]!.saliendo).toBe(true)

    vi.advanceTimersByTime(420)
    expect(toasts).toHaveLength(0)
  })

  it('cerrar a mano marca la salida y luego lo quita', () => {
    const id = toast('Clasificación corregida')

    cerrar(id)
    expect(toasts[0]!.saliendo).toBe(true)

    vi.advanceTimersByTime(420)
    expect(toasts).toHaveLength(0)
  })

  it('cerrar dos veces o un id que no existe no rompe nada', () => {
    const id = toast('Aviso')
    cerrar(id)
    cerrar(id)
    cerrar(9999)

    vi.advanceTimersByTime(420)
    expect(toasts).toHaveLength(0)
  })

  it('cada aviso tiene un id distinto', () => {
    const a = toast('A')
    const b = toast('B')

    expect(a).not.toBe(b)
  })
})
