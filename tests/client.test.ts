import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiRequestError, configurarCliente } from '@/api/client'

/** Espera que la promesa falle y devuelve el error tipado. */
const fallo = (p: Promise<unknown>) =>
  p.then(
    () => { throw new Error('se esperaba un error') },
    (e: ApiRequestError) => e,
  )

const respuesta = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('cliente HTTP', () => {
  const onNoAutenticado = vi.fn()
  let token: string | null = 'abc'

  beforeEach(() => {
    token = 'abc'
    onNoAutenticado.mockReset()
    configurarCliente({ getToken: () => token, onNoAutenticado })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('manda el token y usa la base de VITE_API_URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    await api('/health')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://api.test/api/health')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer abc')
  })

  it('no fija Content-Type cuando el cuerpo es FormData (multipart)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(201, {}))
    vi.stubGlobal('fetch', fetchMock)
    await api('/incidencias', { method: 'POST', body: new FormData() })
    expect(new Headers(fetchMock.mock.calls[0][1].headers).has('Content-Type')).toBe(false)
  })

  it('convierte el error del contrato en ApiRequestError con su mensaje', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(409, { error: { code: 'LIMITE_WIP', message: 'Ya tienes 3 incidencias en proceso.' } })))
    const e = await fallo(api('/x'))
    expect(e).toBeInstanceOf(ApiRequestError)
    expect(e.code).toBe('LIMITE_WIP')
    expect(e.status).toBe(409)
    expect(e.message).toBe('Ya tienes 3 incidencias en proceso.')
  })

  it('cierra la sesión ante un 401 si había token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(401, { error: { code: 'NO_AUTENTICADO', message: 'Sesión vencida' } })))
    await api('/auth/me').catch(() => {})
    expect(onNoAutenticado).toHaveBeenCalledOnce()
  })

  it('no cierra sesión en un login fallido (sin token)', async () => {
    token = null
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(401, { error: { code: 'NO_AUTENTICADO', message: 'Correo o contraseña incorrectos' } })))
    const e = await fallo(api('/auth/login', { method: 'POST' }))
    expect(e.message).toBe('Correo o contraseña incorrectos')
    expect(onNoAutenticado).not.toHaveBeenCalled()
  })

  it('sin conexión da un mensaje en español', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const e = await fallo(api('/x'))
    expect(e.status).toBe(0)
    expect(e.message).toMatch(/No hay conexión/)
  })
})
