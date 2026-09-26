<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import * as incidenciasApi from '@/api/incidencias'
import type { EstadoIncidencia, Incidencia, Prioridad } from '@/types/models'
import { useCarga } from '@/composables/useCarga'
import { usePolling } from '@/composables/usePolling'
import { useEntrada } from '@/composables/useEntrada'
import { useAccionesIncidencia } from '@/composables/useAccionesIncidencia'
import { useTecnicos } from '@/composables/useTecnicos'
import { useSessionStore } from '@/stores/session'
import { useObraStore } from '@/stores/obra'
import { rollTo, settle } from '@/lib/blockCity'
import { colorEstado, ESTADOS, plural, primerNombre, textoEstado } from '@/utils/textos'
import { fechaCorta } from '@/utils/fechas'
import { vTilt } from '@/directives/tilt'
import AppIcon from '@/components/ui/AppIcon.vue'
import CargandoBloques from '@/components/ui/CargandoBloques.vue'
import EstadoError from '@/components/ui/EstadoError.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import IncidenciaCard from '@/components/incidencia/IncidenciaCard.vue'
import SelectorTecnico from '@/components/incidencia/SelectorTecnico.vue'

/** Límite de WIP por técnico según CONTRATO_API (lo aplica el backend; aquí solo se muestra). */
const WIP_LIMITE = 3
const RESUELTAS_VISIBLES = 6

const session = useSessionStore()
const obra = useObraStore()
const esAdmin = computed(() => session.rol === 'administrador')
const yo = computed(() => session.usuario?.id)

const { datos, cargando, error, recargar } = useCarga(() => incidenciasApi.listar())
usePolling(() => recargar(true), 20, { inmediato: true })

const { tecnicos, cargar: cargarTecnicos } = useTecnicos()
watch(esAdmin, (a) => { if (a) cargarTecnicos() }, { immediate: true })

const raiz = ref<HTMLElement | null>(null)
const { animar } = useEntrada(raiz)

// Técnico: por defecto ve las suyas + las pendientes libres (para poder tomarlas)
const soloMias = ref(true)
const columnaMovil = ref<EstadoIncidencia>('pendiente')
const verTodasResueltas = ref(false)

const todas = computed(() => datos.value ?? [])
const esMia = (i: Incidencia) => i.asignadoA?.id === yo.value
const visibles = computed(() => {
  if (esAdmin.value || !soloMias.value) return todas.value
  return todas.value.filter((i) => esMia(i) || (i.estado === 'pendiente' && !i.asignadoA))
})

const PESO: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 }
const columnas = computed(() => {
  const c: Record<EstadoIncidencia, Incidencia[]> = { pendiente: [], en_proceso: [], resuelto: [] }
  for (const i of visibles.value) c[i.estado].push(i)
  // Prioridad alta primero y luego la más antigua
  const porPrioridad = (a: Incidencia, b: Incidencia) => PESO[a.prioridad] - PESO[b.prioridad] || a.fechaCreacion.localeCompare(b.fechaCreacion)
  c.pendiente.sort(porPrioridad)
  c.en_proceso.sort(porPrioridad)
  // Resueltas: la más reciente primero
  c.resuelto.sort((a, b) => (b.fechaResolucion ?? '').localeCompare(a.fechaResolucion ?? ''))
  return c
})
const enColumna = (e: EstadoIncidencia) =>
  e === 'resuelto' && !verTodasResueltas.value ? columnas.value.resuelto.slice(0, RESUELTAS_VISIBLES) : columnas.value[e]

const cuenta = computed(() => ({
  pendiente: columnas.value.pendiente.length,
  en_proceso: columnas.value.en_proceso.length,
  resuelto: columnas.value.resuelto.length,
}))
const misEnProceso = computed(() => todas.value.filter((i) => i.estado === 'en_proceso' && esMia(i)).length)
const sinTecnico = computed(() => todas.value.filter((i) => i.estado === 'pendiente' && !i.asignadoA).length)
const altasAbiertas = computed(() => visibles.value.filter((i) => i.prioridad === 'alta' && i.estado !== 'resuelto').length)

const titular = computed(() => {
  if (!datos.value) return 'El tablero del edificio.'
  const { pendiente, en_proceso } = cuenta.value
  if (pendiente + en_proceso === 0) return 'Nada pendiente. El edificio está al día.'
  return `${plural(pendiente, 'pendiente')}, ${en_proceso} en proceso.`
})
const bajada = computed(() => {
  if (!datos.value) return ''
  const alta = altasAbiertas.value
  const base = alta ? `${plural(alta, 'es de prioridad alta', 'son de prioridad alta')}: van primero en cada columna.` : 'Ninguna abierta es de prioridad alta.'
  return esAdmin.value
    ? `${base} Asigna técnico a las pendientes y corrige la clasificación desde el detalle.`
    : `${base} Toma una pendiente cuando empieces y márcala resuelta al terminar.`
})

// Contadores que ruedan en la cabecera de cada columna
const contadores = ref<Record<string, HTMLElement | null>>({})
watch(cuenta, (c) => nextTick(() => ESTADOS.forEach((e) => rollTo(contadores.value[e] ?? null, c[e]))), { immediate: true })

watch(datos, (d) => {
  if (d) obra.set(d.filter((i) => i.estado === 'resuelto').length, d.length)
  animar()
})
watch([soloMias, columnaMovil], animar)

// ── Acciones ──
const acciones = useAccionesIncidencia(() => recargar(true))
function reemplazar(r: Incidencia | null) {
  if (!r || !datos.value) return
  datos.value = datos.value.map((i) => (i.id === r.id ? r : i))
  nextTick(() => settle(document.getElementById(`card-${r.id}`)))
  recargar(true)
}
const avanzar = async (i: Incidencia) => reemplazar(await acciones.avanzar(i))
const asignar = async (i: Incidencia, tecnicoId: string | null) => reemplazar(await acciones.asignar(i, tecnicoId))

function puedeAvanzar(i: Incidencia) {
  if (i.estado === 'resuelto') return false
  if (esAdmin.value) return i.estado === 'en_proceso' || !!i.asignadoA
  return i.estado === 'pendiente' ? !i.asignadoA || esMia(i) : esMia(i)
}
const textoBoton = (i: Incidencia) => (i.estado === 'pendiente' ? (esAdmin.value ? 'Pasar a En proceso' : 'Tomar') : 'Marcar resuelta')

const COLUMNA_TXT: Record<EstadoIncidencia, string> = {
  pendiente: 'Esperan técnico o que alguien las tome.',
  en_proceso: 'Alguien ya está trabajando en ellas.',
  resuelto: 'Terminadas, la más reciente primero.',
}
</script>

<template>
  <section ref="raiz" class="plano" data-cursor="nivel" aria-labelledby="h1">
    <div class="plano-grid" aria-hidden="true"></div>
    <div class="wrap vista">
      <div class="split">
        <div>
          <p class="eyebrow" data-enter>Tablero de mantenimiento · {{ session.usuario?.edificioNombre }}</p>
          <h1 id="h1" class="t-h1" tabindex="-1" data-enter>{{ titular }}</h1>
          <p class="lede" data-enter style="margin-top: 14px">{{ bajada }}</p>
        </div>

        <aside v-if="datos" v-tilt class="block on-dark" data-cursor="llana" data-enter style="padding: 24px">
          <div class="b-head">
            <span class="stud" aria-hidden="true"></span>
            <span class="tag">Tu parte</span>
          </div>
          <template v-if="esAdmin">
            <h2 class="t-h3" style="font-size: 24px">
              {{ sinTecnico ? `${plural(sinTecnico, 'pendiente espera', 'pendientes esperan')} técnico.` : 'Todas las pendientes tienen técnico.' }}
            </h2>
            <p style="color: var(--mbc-acc-fg-2); margin-top: 6px">
              {{ sinTecnico ? 'Elige a alguien en la tarjeta: recibe un aviso al instante.' : 'Buen trabajo repartiendo. Revisa las de prioridad alta.' }}
            </p>
          </template>
          <template v-else>
            <h2 class="t-h3" style="font-size: 24px">
              {{ primerNombre(session.usuario?.nombre ?? '') }}, tienes {{ misEnProceso }} de {{ WIP_LIMITE }} en proceso.
            </h2>
            <div class="wip" aria-hidden="true">
              <span v-for="n in WIP_LIMITE" :key="n" class="wip-b" :class="{ on: n <= misEnProceso }"></span>
            </div>
            <p style="color: var(--mbc-acc-fg-2); margin-top: 10px">
              {{ misEnProceso >= WIP_LIMITE ? 'Llegaste al límite: resuelve una antes de tomar otra.' : 'Puedes tomar una más cuando quieras.' }}
            </p>
          </template>
        </aside>
      </div>

      <div class="sec kanban-sec">
        <div class="kanban-controles" data-enter>
          <label v-if="!esAdmin" class="check">
            <input v-model="soloMias" type="checkbox" />
            <span class="box" aria-hidden="true"><AppIcon name="check" /></span>
            <span>Solo las mías y las libres</span>
          </label>
          <div class="seg kanban-tabs" role="group" aria-label="Columna a mostrar">
            <button v-for="e in ESTADOS" :key="e" type="button" :aria-pressed="columnaMovil === e" @click="columnaMovil = e">
              {{ textoEstado[e] }} <span class="n">{{ cuenta[e] }}</span>
            </button>
          </div>
        </div>

        <CargandoBloques v-if="cargando && !datos" texto="Cargando el tablero…" />
        <EstadoError v-else-if="error" :mensaje="error" @reintentar="recargar()" />
        <EmptyState
          v-else-if="todas.length === 0"
          titulo="El edificio no tiene incidencias todavía."
          texto="Cuando un residente reporte algo, aparecerá aquí como pendiente."
        />

        <div v-else class="kanban">
          <section
            v-for="e in ESTADOS"
            :key="e"
            class="kanban-col"
            :class="{ 'is-movil-activa': columnaMovil === e }"
            :aria-labelledby="`col-${e}`"
          >
            <header class="block kanban-head" :style="{ '--c': colorEstado[e] }">
              <div class="b-head">
                <span class="stud" aria-hidden="true"></span>
                <span class="tag">Paso {{ ESTADOS.indexOf(e) + 1 }} de 3</span>
              </div>
              <h2 :id="`col-${e}`" class="kanban-t">
                {{ textoEstado[e] }}
                <span :ref="(el) => { contadores[e] = el as HTMLElement | null }" class="roll kanban-n" aria-hidden="true"></span>
                <span class="sr">, {{ plural(cuenta[e], 'incidencia') }}</span>
              </h2>
              <p class="b-meta">{{ COLUMNA_TXT[e] }}</p>
            </header>

            <p v-if="columnas[e].length === 0" class="empty kanban-vacia">
              {{ e === 'pendiente' ? 'Nada esperando. Buen ritmo.' : e === 'en_proceso' ? 'Nadie está trabajando en algo ahora.' : 'Todavía no hay resueltas.' }}
            </p>
            <ul v-else class="kanban-lista">
              <li v-for="i in enColumna(e)" :id="`card-${i.id}`" :key="i.id" data-enter>
                <IncidenciaCard :incidencia="i" mostrar-residente compacta>
                  <template v-if="i.estado !== 'resuelto'">
                    <SelectorTecnico
                      v-if="esAdmin"
                      :incidencia="i"
                      :tecnicos="tecnicos"
                      :deshabilitado="acciones.ocupada.value === i.id"
                      @elegir="(t) => asignar(i, t)"
                    />
                    <button
                      v-if="puedeAvanzar(i)"
                      class="btn small"
                      type="button"
                      :disabled="acciones.ocupada.value === i.id"
                      @click="avanzar(i)"
                    >
                      <AppIcon :name="i.estado === 'pendiente' ? 'wrench' : 'check'" />{{ textoBoton(i) }}
                    </button>
                    <p v-else-if="!esAdmin && i.asignadoA" class="small muted">Asignada a {{ i.asignadoA.nombre }}</p>
                    <p v-else-if="esAdmin && !i.asignadoA" class="small muted">Elige un técnico para poder moverla.</p>
                  </template>
                  <p v-else class="done-label">
                    <AppIcon name="check" />Resuelta{{ i.fechaResolucion ? ` el ${fechaCorta(i.fechaResolucion)}` : '' }}
                  </p>
                </IncidenciaCard>
              </li>
            </ul>
            <button
              v-if="e === 'resuelto' && columnas.resuelto.length > RESUELTAS_VISIBLES"
              class="btn ghost small kanban-mas"
              type="button"
              @click="verTodasResueltas = !verTodasResueltas"
            >
              {{ verTodasResueltas ? 'Ver solo las recientes' : `Ver las ${columnas.resuelto.length} resueltas` }}
            </button>
          </section>
        </div>
      </div>
    </div>
  </section>
</template>
