import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { RouteLocationNormalized } from 'vue-router'
import { guardSesionYRol } from '@/router/guards'
import { useSessionStore } from '@/stores/session'
import type { RolUsuario } from '@/types/models'

const ruta = (r: Partial<RouteLocationNormalized>) => ({ fullPath: '/x', meta: {}, ...r }) as RouteLocationNormalized

function conSesion(rol: RolUsuario | null) {
  const s = useSessionStore()
  s.lista = true
  if (rol) {
    s.token = 't'
    s.usuario = { id: 'u1', nombre: 'Ana Torres', email: 'a@b.c', rol, edificioId: 'e1', edificioNombre: 'Los Olivos' }
  }
}

describe('guards del router', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('sin sesión manda al login recordando a dónde iba', async () => {
    conSesion(null)
    expect(await guardSesionYRol(ruta({ name: 'tablero', fullPath: '/tablero', meta: { roles: ['administrador'] } }))).toEqual({
      name: 'login',
      query: { redirigir: '/tablero' },
    })
  })

  it('un residente que escribe la URL de admin vuelve a su inicio', async () => {
    conSesion('residente')
    expect(await guardSesionYRol(ruta({ name: 'panel', meta: { roles: ['administrador'] } }))).toBe('/mis-incidencias')
  })

  it('el técnico entra al tablero', async () => {
    conSesion('mantenimiento')
    expect(await guardSesionYRol(ruta({ name: 'tablero', meta: { roles: ['mantenimiento', 'administrador'] } }))).toBe(true)
  })

  it('con sesión, el login redirige según el rol', async () => {
    conSesion('administrador')
    expect(await guardSesionYRol(ruta({ name: 'login', meta: { publica: true } }))).toBe('/tablero')
  })
})
