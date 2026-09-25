# Guía de desarrollo — Frontend de FixIt

Guía para quienes construyen la web de FixIt: **George Aliaga y Jefrey Sanchez**. Repositorio: [FixIt-FrontEnd](https://github.com/Los-mas-agiles/FixIt-FrontEnd).
Plan general: [`PLAN_FASES.md`](PLAN_FASES.md) · Contrato con el backend: [`CONTRATO_API.md`](CONTRATO_API.md) — **léanlo antes de programar**.

## 0. Qué vamos a construir

FixIt es una **web pensada primero para el celular** que además se puede **instalar como app (PWA)**. Hay 3 tipos de usuario:

| Rol | Qué hace | Pantallas |
|---|---|---|
| **Residente** | Reporta incidencias con foto y sigue su estado | Mis incidencias, Nueva incidencia, Detalle |
| **Mantenimiento** | Toma incidencias, las trabaja y las marca resueltas | Tablero Kanban ("mis incidencias" + pendientes) |
| **Administrador** | Ve todo, asigna técnicos, corrige la clasificación, ve KPIs, crea usuarios | Tablero Kanban, Dashboard, Usuarios |

**Regla de oro:** el frontend **muestra y captura datos, pero no decide nada**. No calcula la prioridad, no valida transiciones de estado, no calcula KPIs, no pone fechas. Todo eso lo hace el backend y el frontend muestra el resultado (o el error).

El frontend **solo habla con nuestra API** (`VITE_API_URL`). Nunca con Supabase ni con la base de datos directamente.

## 1. Antes de empezar

- Node.js 24 LTS o superior (`node -v`)
- VS Code con la extensión **Vue - Official**
- Acceso de escritura al repo FixIt-FrontEnd

## 2. Crear el proyecto (Fase 0, lo hace una sola persona)

```bash
npm create vite@latest . -- --template vue-ts
npm install
npm install vue-router@4 pinia
npm install tailwindcss @tailwindcss/vite
npm install -D vitest @vue/test-utils jsdom
npm install -D vite-plugin-pwa
npm install browser-image-compression
npm install chart.js vue-chartjs
```

**Tailwind v4** ya no usa `npx tailwindcss init` ni `tailwind.config.js`. Se configura así:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
})
```

```css
/* src/style.css */
@import "tailwindcss";
```

Confirmar que `npm run dev` abre en `http://localhost:5173` antes de seguir.

Usamos **TypeScript en todo el proyecto** (no mezclar con JS).

## 3. Stack

| Herramienta | Para qué |
|---|---|
| Vue 3 (Composition API, `<script setup lang="ts">`) | Framework |
| Vite | Servidor de desarrollo y build |
| Vue Router 4 | Navegación y protección de rutas por rol |
| Pinia | Estado global: sesión (usuario + token) |
| Tailwind CSS v4 | Estilos |
| vite-plugin-pwa | App instalable + service worker para las notificaciones push |
| browser-image-compression | Comprimir la foto antes de subirla |
| Chart.js + vue-chartjs | Gráfico CFD del dashboard |
| Vitest + Vue Test Utils | Pruebas |

## 4. Estructura de carpetas

```
src/
  api/
    client.ts           # fetch con token, base URL y manejo de errores del contrato
    auth.ts             # login(), me()
    incidencias.ts      # listar(), obtener(), crear(), cambiarEstado(), asignar(), clasificar()
    usuarios.ts
    kpis.ts
    notificaciones.ts
  composables/
    useIncidencias.ts   # carga + polling + estados de carga/error
    usePolling.ts       # repetir una función cada N segundos mientras la vista está abierta
    usePush.ts          # pedir permiso y registrar la suscripción push
  components/
    ui/                 # AppButton, AppInput, AppBadge, AppSpinner, AppAlert, EmptyState
    incidencia/         # IncidenciaCard, BadgePrioridad, BadgeEstado, KanbanColumna, FotoPreview
    layout/             # AppHeader, NavegacionRol, CampanitaNotificaciones
    kpis/               # KpiCard, GraficoCFD
  router/
    index.ts
    guards.ts           # requiere sesión + requiere rol
  stores/
    session.ts          # usuario, token, login(), logout()
  types/
    models.ts           # COPIA EXACTA de los tipos de CONTRATO_API.md
  utils/
    fechas.ts           # formatear ISO → "05/10/2026 09:30" hora de Lima
    textos.ts           # etiquetas: 'en_proceso' → "En proceso", 'plomeria' → "Plomería"
  views/
    LoginView.vue
    residente/MisIncidenciasView.vue
    residente/NuevaIncidenciaView.vue
    IncidenciaDetalleView.vue       # compartida por los 3 roles
    KanbanView.vue                  # mantenimiento y administrador
    admin/DashboardView.vue
    admin/UsuariosView.vue
    NotFoundView.vue
public/
  icons/                # íconos de la PWA (192 y 512 px)
src/sw.ts               # service worker propio (para manejar los push)
```

**Regla práctica:** ninguna vista (`.vue`) llama a `fetch` directamente. Las llamadas van en `src/api/`, y la lógica de carga/polling en `composables/`. Si algo falla, se sabe dónde buscar.

## 5. Configuración

`.env` (no se sube a git) y `.env.example` (sí se sube):

```
VITE_API_URL=http://localhost:3000/api
```

En Vercel: `VITE_API_URL=https://<api-de-produccion>/api`.

## 6. El cliente HTTP (`src/api/client.ts`)

Es la pieza más importante: todas las llamadas pasan por aquí.

```ts
import type { ApiError, CodigoError } from '@/types/models'
import { useSessionStore } from '@/stores/session'

export class ApiRequestError extends Error {
  constructor(public status: number, public code: CodigoError, message: string, public details?: unknown) {
    super(message)
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = useSessionStore()
  const headers = new Headers(options.headers)
  if (session.token) headers.set('Authorization', `Bearer ${session.token}`)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  let res: Response
  try {
    res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, { ...options, headers })
  } catch {
    throw new ApiRequestError(0, 'INTERNO', 'No hay conexión con el servidor. Revisa tu internet.')
  }

  if (res.status === 401) session.logout()   // token vencido o inválido → al login
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null
    throw new ApiRequestError(res.status, body?.error.code ?? 'INTERNO', body?.error.message ?? 'Ocurrió un error inesperado.', body?.error.details)
  }
  return res.json() as Promise<T>
}
```

Los mensajes de error del backend ya vienen en español y se pueden mostrar tal cual al usuario.

## 7. Las pantallas

### LoginView (Fase 1)
Email + contraseña. Al entrar, guarda `token` y `usuario` en el store (y el token en `localStorage`) y redirige según el rol:
residente → `/mis-incidencias` · mantenimiento → `/tablero` · administrador → `/tablero`.
Mostrar el error del backend si las credenciales son incorrectas. Al recargar la página, si hay token, llamar a `GET /auth/me` para recuperar la sesión.

### NuevaIncidenciaView — residente (Fase 2)
- Descripción (obligatoria, 10–1000 caracteres, con contador).
- Foto opcional: `<input type="file" accept="image/*">` (en el celular deja elegir entre cámara y galería; no usar `capture`, porque en algunos Android obliga a usar la cámara). Vista previa antes de enviar.
- Comprimir con `browser-image-compression` (máx. 1 MB, 1600 px) y enviar como `FormData` a `POST /incidencias`.
- El envío tarda unos segundos porque la IA clasifica: mostrar "Enviando y clasificando…" y **desactivar el botón** para evitar doble envío.
- Al terminar, ir al detalle de la incidencia creada (ya viene con tipo y prioridad).

### MisIncidenciasView — residente (Fase 2)
Lista de sus incidencias (tarjetas) con estado, tipo, prioridad y fecha. Polling cada 30 s. Estado vacío amigable ("Aún no has reportado incidencias") con botón a "Nueva incidencia". Botón flotante "+" en el celular.

### IncidenciaDetalleView — todos (Fase 2, se amplía en 3 y 4)
Foto, descripción, badges, técnico asignado y **línea de tiempo** con el `historial`. Según el rol:
- Mantenimiento/Admin: botón para avanzar de estado (Fase 3).
- Admin: asignar técnico (Fase 3) y corregir tipo/prioridad (Fase 4).

### KanbanView — mantenimiento y administrador (Fase 3)
- 3 columnas: **Pendiente / En proceso / Resuelto**. En el celular, pestañas en vez de columnas.
- Tarjetas ordenadas por prioridad (alta primero) y luego por antigüedad. Color del borde según la prioridad.
- Botón en cada tarjeta: "Tomar" (pendiente → en proceso) y "Marcar resuelta" (en proceso → resuelto). **No hace falta arrastrar y soltar.**
- Técnico: filtro "Solo mis incidencias" activado por defecto.
- Admin: selector de técnico en las pendientes (`GET /usuarios?rol=mantenimiento`).
- Si el backend responde `LIMITE_WIP` o `TRANSICION_INVALIDA`, mostrar su mensaje en un aviso.
- Polling cada 20 s.

### DashboardView — administrador (Fase 6)
- Filtros: periodo (7 días / 14 días / 30 días) y prioridad (todas / alta / media / baja).
- Tarjetas: **Cycle time**, **Lead time**, **WIP**, **Throughput**, **Precisión IA**. Si el valor es `null`, mostrar "Sin datos" (no "0").
- Tarjeta destacada del **Objetivo 2**: cycle time de prioridad alta vs. meta de 48 h (verde si cumple, rojo si no).
- **Gráfico CFD** (áreas apiladas por estado, un punto por día) con `GET /kpis/cfd`.

### UsuariosView — administrador (Fase 1 o al final)
Tabla con los usuarios del edificio y formulario para crear uno (nombre, email, contraseña, rol).

### Campanita de notificaciones (Fase 5)
En el header: contador de no leídas (polling cada 30 s), lista desplegable, "marcar todas como leídas", y al tocar una se abre la incidencia.

## 8. PWA y notificaciones push (Fase 5)

- `vite-plugin-pwa` con estrategia **`injectManifest`** (necesitamos un service worker propio, `src/sw.ts`, para escuchar el evento `push`).
- Manifest: nombre "FixIt", íconos 192/512, `display: standalone`, color del tema.
- En el service worker:
  - `push` → `self.registration.showNotification(data.titulo, { body: data.mensaje, data: { url: data.url } })`
  - `notificationclick` → abrir/enfocar la app en `data.url`.
- `usePush.ts`: pedir permiso **solo cuando el usuario toque "Activar notificaciones"** (nunca al cargar la página), obtener la clave con `GET /push/vapid-public-key`, suscribirse con `registration.pushManager.subscribe(...)` y mandar `subscription.toJSON()` a `POST /push/suscripciones`.
- **iPhone:** el push solo funciona si la app está **instalada en la pantalla de inicio** (Safari → Compartir → "Agregar a inicio"). Mostrar esa indicación a usuarios de iOS.

## 9. Diseño

- **Primero el celular** (375 px), luego escritorio. Botones de al menos 44 px de alto.
- Colores de prioridad consistentes en toda la app: alta = rojo, media = ámbar, baja = verde. Estados: pendiente = gris, en proceso = azul, resuelto = verde.
- Siempre mostrar el estado de **carga**, de **error** (con botón "Reintentar") y de **lista vacía**.
- Textos en español, etiquetas legibles (usar `utils/textos.ts`, nunca mostrar `en_proceso` crudo).

## 10. Cómo repartirse el trabajo (George + Jefrey)

Propuesta para no pisarse:

| Fase | George | Jefrey |
|---|---|---|
| 0 | Setup del proyecto, Tailwind, router, CI, deploy | Componentes `ui/`, layout, `client.ts`, tipos |
| 1 | LoginView + guards | Store de sesión + UsuariosView |
| 2 | NuevaIncidenciaView (foto + compresión) | MisIncidenciasView + IncidenciaDetalleView |
| 3 | KanbanView | Acciones de estado, asignación, avisos de error |
| 4 | Badges + edición de clasificación | Pulido del detalle + indicador IA/manual |
| 5 | PWA + service worker + push | Campanita de notificaciones |
| 6 | DashboardView (tarjetas + filtros) | Gráfico CFD |
| 7 | Pulido responsive | Accesibilidad y pruebas en celulares reales |

## 11. Git

```bash
git checkout main && git pull
git checkout -b feature/HU1-formulario-reporte
# ... commits ...
git commit -m "feat: agrega formulario de reporte de incidencia"
git push -u origin feature/HU1-formulario-reporte
```

Abrir un Pull Request pequeño (una pantalla o funcionalidad), con **captura de pantalla** y el link del **preview de Vercel**. El otro compañero lo revisa antes del merge. Cada tarjeta de Trello tiene su rama y su PR.

## 12. Cómo correr en local

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

Para usar la API: apuntar `VITE_API_URL` a la API desplegada de desarrollo (la pasa Edery) o a `http://localhost:3000/api` si tienen el backend corriendo. Las cuentas de demo están en [`CONTRATO_API.md`](CONTRATO_API.md#3-cuentas-de-demo-las-crea-el-seed-del-backend).

## 13. Definition of Done (frontend)

Una pantalla está terminada cuando:
1. Compila sin errores y pasa lint, typecheck y tests en CI.
2. Maneja carga, error y vacío (no asume que el dato ya llegó).
3. Se probó en escritorio **y** en un celular real (o modo responsive a 375 px).
4. Entrando con un usuario de **otro edificio** no se ve nada ajeno.
5. El compañero revisó el PR y el preview de Vercel funciona.
