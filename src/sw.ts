/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute, type PrecacheEntry } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (PrecacheEntry | string)[] }

// App instalable: precache del build + navegación SPA offline
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

self.addEventListener('install', () => { void self.skipWaiting() })
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()) })

interface PayloadPush {
  titulo?: string
  mensaje?: string
  url?: string
}

// Payload del contrato: { titulo, mensaje, url }
self.addEventListener('push', (event) => {
  let data: PayloadPush
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { mensaje: event.data?.text() }
  }
  event.waitUntil(
    self.registration.showNotification(data.titulo ?? 'FixIt', {
      body: data.mensaje ?? 'Hay novedades en tus incidencias.',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      data: { url: data.url ?? '/' },
      lang: 'es',
    }),
  )
})

// Al tocar la notificación: enfocar la app si está abierta, o abrirla en la incidencia
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data as { url?: string } | null)?.url ?? '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const v of ventanas) {
        if (new URL(v.url).origin === self.location.origin) {
          await v.focus()
          if ('navigate' in v) await (v as WindowClient).navigate(url)
          return
        }
      }
      await self.clients.openWindow(url)
    })(),
  )
})
