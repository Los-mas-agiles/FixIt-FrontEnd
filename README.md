# FixIt — FrontEnd

Aplicación web de **FixIt**, plataforma para gestionar incidencias de mantenimiento en edificios residenciales. Pensada primero para el celular e instalable como app (PWA).

- **Residente:** reporta incidencias con foto y sigue su estado.
- **Mantenimiento:** trabaja las incidencias en un tablero Kanban.
- **Administrador:** asigna técnicos, corrige la clasificación de la IA, ve los KPIs (cycle time, lead time, WIP, throughput) y administra usuarios.

Proyecto del curso de **Ágiles (1ASI570)** — UPC, Ingeniería de Software, 2026.

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/GUIA_FRONTEND.md`](docs/GUIA_FRONTEND.md) | **Guía para el equipo de frontend**: stack, estructura, pantallas, PWA, reparto de tareas |
| [`docs/CONTRATO_API.md`](docs/CONTRATO_API.md) | Contrato con el backend: tipos, endpoints, errores y cuentas de demo. **Leer antes de programar.** |
| [`docs/PLAN_FASES.md`](docs/PLAN_FASES.md) | Fases de desarrollo, convenciones y Definition of Done |

> La copia maestra del contrato vive en el repo de backend ([FixIt-BackEnd/docs/CONTRATO_API.md](https://github.com/Los-mas-agiles/FixIt-BackEnd/blob/main/docs/CONTRATO_API.md)). Si difieren, manda la del backend.

## Stack

- **Vue 3** (Composition API, `<script setup lang="ts">`) + **TypeScript** + **Vite**
- **Vue Router 4** + **Pinia**
- **Tailwind CSS v4**
- **vite-plugin-pwa** (app instalable + notificaciones push)
- **Chart.js** + **vue-chartjs** (gráfico CFD)
- **Vitest** + **Vue Test Utils** (tests)
- Despliegue en **Vercel**

## Estilo visual: Modular Block City

La interfaz sigue la guía de estilos **Modular Block City** (la metáfora de una obra que se construye entre vecinos): bloques con radio 20 px, sombra sólida sin blur y un *stud* arriba a la izquierda; pastel sobre casi-blanco; Baloo 2 para titulares, Space Grotesk para texto y JetBrains Mono para datos; un solo easing.

| Archivo | Qué tiene |
|---|---|
| `src/styles/tokens.css`, `base.css`, `components.css`, `motion.css` | Copia de la guía (no editar a mano: si cambia la guía, se vuelven a copiar) |
| `src/styles/app.css` | Piezas propias de FixIt (tablero, campanita, detalle…) hechas solo con los tokens |
| `src/styles/main.css` | Entrada: Tailwind v4 + capas; los tokens también existen como utilidades (`bg-mint`, `font-display`…) |
| `src/lib/blockCity.ts` | Comportamientos de la guía en TypeScript: cascada de entrada, contadores, bloques magnéticos, cursor, mini-escenas y el edificio de fondo |

Colores por estado: **pendiente = durazno**, **en proceso = celeste**, **resuelta = menta**, siempre con texto y *stepper* (el color nunca es la única señal). La prioridad se muestra con barras de nivel y texto; la **alta** va en tag oscuro (la guía no usa rojo en la interfaz).

## Requisitos

- Node.js 24 (LTS) o superior
- VS Code con la extensión **Vue - Official** (recomendado)

## Puesta en marcha

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

### Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base de la API, terminada en `/api` |

No hay secretos en el frontend: toda la seguridad la aplica la API.

## Cómo conectarse al backend

El backend ya está desplegado y con datos de demo, **no hace falta correrlo en local**:

```
VITE_API_URL=https://fix-it-back-end.vercel.app/api
```

- **Estado:** listos login y roles, reporte de incidencias con foto, tablero Kanban (cambio de estado, asignación, límite de WIP), clasificación con IA y notificaciones (en la app + push). **Pendiente:** KPIs y CFD del dashboard (Fase 6).
- **Cuentas de demo** (contraseña `FixIt2026!`): `residente1@olivos.demo`, `tecnico1@olivos.demo`, `admin@olivos.demo` y el resto en [`docs/CONTRATO_API.md`](docs/CONTRATO_API.md#3-cuentas-de-demo-las-crea-el-seed-del-backend).
- **Datos:** Los Olivos ya tiene 12 incidencias en distintos estados, con historial y avisos.
- **Probar la API sin código:** abrir [`docs/PROBAR_API.http`](docs/PROBAR_API.http) con la extensión **REST Client** de VS Code y pulsar "Send Request".
- **CORS:** la API acepta `localhost:5173`, `localhost:4173` y `https://fix-it-front-end*.vercel.app`. Al crear el proyecto en Vercel, usar el nombre **`fix-it-front-end`** (o avisar a Edery si es otro).
- **Si algo del backend no calza con el contrato**, avisar a Edery antes de "arreglarlo" en el frontend.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (incluye verificación de tipos) |
| `npm run preview` | Sirve el build localmente (para probar la PWA) |
| `npm run lint` | ESLint |
| `npm test` | Tests con Vitest |

## Estructura

```
src/
  api/            # llamadas a la API (una por recurso) + cliente HTTP
  composables/    # lógica reutilizable: carga, polling, push, toasts, acciones
  directives/     # v-tilt (bloques magnéticos)
  lib/            # blockCity.ts: comportamientos de la guía de estilos
  components/     # ui/, incidencia/, layout/, kpis/
  router/         # rutas y guards por rol
  stores/         # sesión (Pinia)
  types/          # tipos del contrato de API
  utils/          # fechas, etiquetas en español
  views/          # pantallas por rol
  styles/         # guía Modular Block City + estilos de FixIt
  sw.ts           # service worker (notificaciones push)
public/icons/     # íconos de la PWA
tests/            # Vitest: utilidades, cliente HTTP y guards
docs/
```

## Cuentas de demo

Todas con la contraseña `FixIt2026!` — ver la tabla completa en [`docs/CONTRATO_API.md`](docs/CONTRATO_API.md#3-cuentas-de-demo-las-crea-el-seed-del-backend).

## Estado por fases

- [ ] Fase 0 — Cimientos (proyecto, layout, cliente HTTP, CI, deploy)
- [ ] Fase 1 — HU6 Login con roles
- [ ] Fase 2 — HU1 Reporte de incidencias con foto
- [ ] Fase 3 — HU3 Tablero Kanban
- [ ] Fase 4 — HU2 Clasificación con IA (badges y corrección manual)
- [ ] Fase 5 — HU4 Notificaciones (PWA + push)
- [ ] Fase 6 — HU5 Dashboard de KPIs y CFD
- [ ] Fase 7 — Piloto y cierre

## Cómo contribuir

1. Rama desde `main`: `feature/HU<n>-nombre-corto` o `fix/descripcion-corta`.
2. Commits con prefijo: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`.
3. Pull Request pequeño (una pantalla o funcionalidad), con **captura de pantalla** y link del **preview de Vercel**. CI en verde y 1 aprobación para hacer merge.
4. Las vistas nunca llaman a `fetch` directamente: todo pasa por `src/api/`.

## Equipo

| Integrante | Rol |
|---|---|
| George Arturo Aliaga Pimentel | Frontend · Scrum Master |
| Jefrey Martin Sanchez Ignacio | Frontend |
| Edery Renzo Abanto Vicente | Backend, IA y despliegues · Product Owner · QA |

Backend: [FixIt-BackEnd](https://github.com/Los-mas-agiles/FixIt-BackEnd)
