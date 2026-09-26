import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/api/auth'
import { ApiRequestError, configurarCliente } from '@/api/client'
import type { RolUsuario, Usuario } from '@/types/models'

const CLAVE_TOKEN = 'fixit.token'

function leerToken() {
  try { return localStorage.getItem(CLAVE_TOKEN) } catch { return null }
}
function guardarToken(t: string | null) {
  try {
    if (t) localStorage.setItem(CLAVE_TOKEN, t)
    else localStorage.removeItem(CLAVE_TOKEN)
  } catch { /* modo privado: la sesión dura lo que dure la pestaña */ }
}

/** Pantalla de inicio según el rol. */
export function inicioPorRol(rol: RolUsuario) {
  return rol === 'residente' ? '/mis-incidencias' : '/tablero'
}

export const useSessionStore = defineStore('session', () => {
  const token = ref<string | null>(leerToken())
  const usuario = ref<Usuario | null>(null)
  /** true cuando ya se intentó recuperar la sesión guardada (al recargar la página). */
  const lista = ref(false)
  /** Motivo del último cierre automático (token vencido), para avisarlo en el login. */
  const motivoCierre = ref<string | null>(null)

  const rol = computed(() => usuario.value?.rol ?? null)
  const autenticado = computed(() => !!token.value && !!usuario.value)

  async function login(email: string, password: string) {
    const r = await authApi.login(email, password)
    token.value = r.token
    usuario.value = r.usuario
    motivoCierre.value = null
    guardarToken(r.token)
    return r.usuario
  }

  function logout(motivo: string | null = null) {
    token.value = null
    usuario.value = null
    motivoCierre.value = motivo
    guardarToken(null)
  }

  let restaurando: Promise<void> | null = null
  /** Si hay token guardado, recupera el usuario con GET /auth/me. Se llama una sola vez. */
  function restaurar() {
    if (lista.value) return Promise.resolve()
    restaurando ??= (async () => {
      if (token.value) {
        try {
          usuario.value = await authApi.me()
        } catch (e) {
          // Sin conexión no cerramos la sesión; con 401 el cliente ya la cerró.
          if (!(e instanceof ApiRequestError) || e.status !== 0) logout()
        }
      }
      lista.value = true
    })()
    return restaurando
  }

  configurarCliente({
    getToken: () => token.value,
    onNoAutenticado: () => logout('Tu sesión venció. Vuelve a entrar para continuar.'),
  })

  return { token, usuario, lista, motivoCierre, rol, autenticado, login, logout, restaurar }
})
