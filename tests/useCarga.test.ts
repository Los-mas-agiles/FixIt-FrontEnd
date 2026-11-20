import { describe, expect, it } from 'vitest'
import { ApiRequestError } from '@/api/client'
import { useCarga } from '@/composables/useCarga'

/** Promesa que se resuelve o rechaza cuando el test lo decide. */
function diferida<T>() {
  let resolver!: (valor: T) => void
  let rechazar!: (error: unknown) => void
  const promesa = new Promise<T>((res, rej) => {
    resolver = res
    rechazar = rej
  })
  return { promesa, resolver, rechazar }
}

describe('useCarga', () => {
  it('muestra el spinner mientras carga y guarda los datos al terminar', async () => {
    const d = diferida<string[]>()
    const { datos, cargando, error, recargar } = useCarga(() => d.promesa)

    const pendiente = recargar()
    expect(cargando.value).toBe(true)

    d.resolver(['a', 'b'])
    await pendiente

    expect(cargando.value).toBe(false)
    expect(datos.value).toEqual(['a', 'b'])
    expect(error.value).toBeNull()
  })

  it('un error de la API deja el mensaje y el status para mostrarlos', async () => {
    const { datos, error, status, recargar } = useCarga(() =>
      Promise.reject(new ApiRequestError(403, 'PROHIBIDO', 'No tienes permiso para realizar esta acción')),
    )

    await recargar()

    expect(datos.value).toBeNull()
    expect(error.value).toBe('No tienes permiso para realizar esta acción')
    expect(status.value).toBe(403)
  })

  it('un error que no es de la API muestra un mensaje genérico y sin status', async () => {
    const { error, status, recargar } = useCarga(() => Promise.reject(new Error('boom')))

    await recargar()

    expect(error.value).toBe('Ocurrió un error inesperado. Intenta de nuevo en un momento.')
    expect(status.value).toBeNull()
  })

  it('en el polling silencioso un fallo puntual no borra lo que ya se ve', async () => {
    let falla = false
    const { datos, error, cargando, recargar } = useCarga(() =>
      falla ? Promise.reject(new ApiRequestError(0, 'INTERNO', 'Sin conexión')) : Promise.resolve(['tablero']),
    )
    await recargar()

    falla = true
    const pendiente = recargar(true)
    expect(cargando.value).toBe(false) // con datos en pantalla no vuelve a aparecer el spinner
    await pendiente

    expect(datos.value).toEqual(['tablero'])
    expect(error.value).toBeNull()
  })

  it('si la primera carga silenciosa falla (no hay nada en pantalla), sí muestra el error', async () => {
    const { error, recargar } = useCarga(() => Promise.reject(new ApiRequestError(0, 'INTERNO', 'Sin conexión')))

    await recargar(true)

    expect(error.value).toBe('Sin conexión')
  })

  it('una respuesta vieja que llega tarde no pisa a la más nueva', async () => {
    const lenta = diferida<string>()
    const rapida = diferida<string>()
    const cola = [lenta, rapida]
    const { datos, cargando, recargar } = useCarga(() => cola.shift()!.promesa)

    const primera = recargar()
    const segunda = recargar()
    rapida.resolver('nueva')
    await segunda
    lenta.resolver('vieja')
    await primera

    expect(datos.value).toBe('nueva')
    expect(cargando.value).toBe(false)
  })

  it('después de un error, una recarga exitosa limpia el error', async () => {
    let falla = true
    const { error, status, recargar } = useCarga(() =>
      falla ? Promise.reject(new ApiRequestError(500, 'INTERNO', 'Falló')) : Promise.resolve('ok'),
    )
    await recargar()
    expect(error.value).toBe('Falló')

    falla = false
    await recargar()

    expect(error.value).toBeNull()
    expect(status.value).toBeNull()
  })
})
