import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { api } from '@/api/client'
import { inicioPorRol, useSessionStore } from '@/stores/session'
import type { Usuario } from '@/types/models'

const USUARIO: Usuario = {
  id: 'u1',
  nombre: 'Ana Torres',
  email: 'admin@olivos.demo',
  rol: 'administrador',
  edificioId: 'e1',
  edificioNombre: 'Los Olivos',
}

const respuesta = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('store de sesión', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('el login guarda el token, el usuario y lo recuerda en localStorage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(200, { token: 'tok-1', usuario: USUARIO })))
    const s = useSessionStore()

    const usuario = await s.login('admin@olivos.demo', 'FixIt2026!')

    expect(usuario).toEqual(USUARIO)
    expect(s.autenticado).toBe(true)
    expect(s.rol).toBe('administrador')
    expect(localStorage.getItem('fixit.token')).toBe('tok-1')
  })

  it('un login fallido no deja sesión abierta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuesta(401, { error: { code: 'NO_AUTENTICADO', message: 'Correo o contraseña incorrectos' } })),
    )
    const s = useSessionStore()

    await expect(s.login('admin@olivos.demo', 'mala')).rejects.toThrow('Correo o contraseña incorrectos')
    expect(s.autenticado).toBe(false)
    expect(localStorage.getItem('fixit.token')).toBeNull()
  })

  it('el logout borra todo y guarda el motivo para avisarlo en el login', () => {
    localStorage.setItem('fixit.token', 'tok-1')
    const s = useSessionStore()
    s.usuario = USUARIO

    s.logout('Tu sesión venció')

    expect(s.token).toBeNull()
    expect(s.usuario).toBeNull()
    expect(s.motivoCierre).toBe('Tu sesión venció')
    expect(localStorage.getItem('fixit.token')).toBeNull()
  })

  it('al recargar la página recupera el usuario con el token guardado', async () => {
    localStorage.setItem('fixit.token', 'tok-1')
    const fetchMock = vi.fn().mockResolvedValue(respuesta(200, USUARIO))
    vi.stubGlobal('fetch', fetchMock)
    const s = useSessionStore()

    await s.restaurar()

    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/auth/me')
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer tok-1')
    expect(s.usuario).toEqual(USUARIO)
    expect(s.lista).toBe(true)
  })

  it('restaurar consulta la API una sola vez aunque lo llamen varias veces a la vez', async () => {
    localStorage.setItem('fixit.token', 'tok-1')
    const fetchMock = vi.fn().mockResolvedValue(respuesta(200, USUARIO))
    vi.stubGlobal('fetch', fetchMock)
    const s = useSessionStore()

    await Promise.all([s.restaurar(), s.restaurar(), s.restaurar()])
    await s.restaurar()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sin token guardado no llama a la API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const s = useSessionStore()

    await s.restaurar()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(s.lista).toBe(true)
    expect(s.autenticado).toBe(false)
  })

  it('si el token guardado ya no vale (401), cierra la sesión', async () => {
    localStorage.setItem('fixit.token', 'vencido')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuesta(401, { error: { code: 'NO_AUTENTICADO', message: 'Tu sesión no es válida' } })),
    )
    const s = useSessionStore()

    await s.restaurar()

    expect(s.token).toBeNull()
    expect(localStorage.getItem('fixit.token')).toBeNull()
  })

  it('sin conexión NO cierra la sesión (el token se conserva para cuando vuelva internet)', async () => {
    localStorage.setItem('fixit.token', 'tok-1')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const s = useSessionStore()

    await s.restaurar()

    expect(s.token).toBe('tok-1')
    expect(localStorage.getItem('fixit.token')).toBe('tok-1')
    expect(s.lista).toBe(true)
  })

  it('un 401 en cualquier petición con sesión abierta cierra la sesión con un aviso', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(respuesta(200, { token: 'tok-1', usuario: USUARIO })))
    const s = useSessionStore()
    await s.login('admin@olivos.demo', 'FixIt2026!')

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuesta(401, { error: { code: 'NO_AUTENTICADO', message: 'Tu sesión no es válida' } })),
    )
    await expect(api('/incidencias')).rejects.toThrow()

    expect(s.autenticado).toBe(false)
    expect(s.motivoCierre).toMatch(/Vuelve a entrar/)
  })
})

describe('inicioPorRol', () => {
  it('el residente empieza en sus incidencias y los demás en el tablero', () => {
    expect(inicioPorRol('residente')).toBe('/mis-incidencias')
    expect(inicioPorRol('mantenimiento')).toBe('/tablero')
    expect(inicioPorRol('administrador')).toBe('/tablero')
  })
})
