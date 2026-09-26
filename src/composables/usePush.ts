import { computed, ref } from 'vue'
import * as notifApi from '@/api/notificaciones'
import { mensajeDeError } from '@/api/client'

function base64UrlABytes(base64: string) {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const bytes = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const instalada = () => matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

// Estado compartido entre todos los que usen el composable
const activo = ref(false)
const ocupado = ref(false)
const error = ref<string | null>(null)
const permiso = ref<NotificationPermission | 'no-soportado'>('default')

/**
 * Notificaciones push (HU4). El permiso se pide SOLO cuando el usuario toca
 * "Activar avisos", nunca al cargar la página.
 */
export function usePush() {
  const soportado = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  /** iPhone sin instalar: el push solo funciona desde la pantalla de inicio. */
  const necesitaInstalarIOS = computed(() => typeof window !== 'undefined' && esIOS() && !instalada())

  async function registro() {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) throw new Error('sin-sw')
    return navigator.serviceWorker.ready
  }

  async function revisar() {
    if (!soportado) { permiso.value = 'no-soportado'; return }
    permiso.value = Notification.permission
    try {
      const reg = await registro()
      activo.value = !!(await reg.pushManager.getSubscription()) && Notification.permission === 'granted'
    } catch {
      activo.value = false
    }
  }

  async function activar() {
    if (!soportado || ocupado.value) return
    ocupado.value = true
    error.value = null
    try {
      const p = await Notification.requestPermission()
      permiso.value = p
      if (p !== 'granted') {
        error.value = 'No diste permiso. Puedes activarlo después desde la configuración del navegador.'
        return
      }
      let reg: ServiceWorkerRegistration
      try {
        reg = await registro()
      } catch {
        error.value = 'Los avisos en el equipo funcionan en la app publicada (no en modo desarrollo).'
        return
      }
      const { publicKey } = await notifApi.vapidPublicKey()
      const sub = (await reg.pushManager.getSubscription())
        ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlABytes(publicKey) }))
      await notifApi.suscribir(sub.toJSON())
      activo.value = true
    } catch (e) {
      error.value = mensajeDeError(e)
    } finally {
      ocupado.value = false
    }
  }

  async function desactivar() {
    if (!soportado || ocupado.value) return
    ocupado.value = true
    error.value = null
    try {
      const reg = await registro()
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await notifApi.desuscribir(sub.endpoint).catch(() => {})
        await sub.unsubscribe()
      }
      activo.value = false
    } catch (e) {
      error.value = mensajeDeError(e)
    } finally {
      ocupado.value = false
    }
  }

  return { soportado, necesitaInstalarIOS, activo, ocupado, error, permiso, revisar, activar, desactivar }
}
