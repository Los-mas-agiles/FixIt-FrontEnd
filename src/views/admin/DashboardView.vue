<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import * as kpisApi from '@/api/kpis'
import type { KPIs, Prioridad, PuntoCFD } from '@/types/models'
import { useCarga } from '@/composables/useCarga'
import { useEntrada } from '@/composables/useEntrada'
import { useSessionStore } from '@/stores/session'
import { duracionHoras, fechaCorta, formatoNumero } from '@/utils/fechas'
import { plural } from '@/utils/textos'
import { vTilt } from '@/directives/tilt'
import AppIcon from '@/components/ui/AppIcon.vue'
import CargandoBloques from '@/components/ui/CargandoBloques.vue'
import EstadoError from '@/components/ui/EstadoError.vue'
import EscenaProgreso from '@/components/kpis/EscenaProgreso.vue'
import GraficoCFD from '@/components/kpis/GraficoCFD.vue'

/** Meta del Objetivo 2 del TF: cycle time de prioridad alta menor a 48 h. */
const META_HORAS = 48
/** Meta del Objetivo 4: el 100 % de las incidencias nuevas sale clasificado por la IA. */
const META_IA = 100

const session = useSessionStore()
const dias = ref<7 | 14 | 30>(7)
const prioridad = ref<Prioridad | null>(null)

function rango() {
  const hasta = new Date()
  const desde = new Date(hasta.getTime() - dias.value * 86_400_000)
  return { desde: desde.toISOString(), hasta: hasta.toISOString() }
}

interface Panel {
  kpis: KPIs
  alta: KPIs
  /** Sin filtro de prioridad: el Objetivo 4 se mide sobre todas las reportadas */
  todas: KPIs
  cfd: PuntoCFD[]
}
const { datos, cargando, error, recargar } = useCarga<Panel>(async () => {
  const r = rango()
  const [kpis, alta, cfd, todasFiltradas] = await Promise.all([
    kpisApi.obtener({ ...r, prioridad: prioridad.value ?? undefined }),
    kpisApi.obtener({ ...r, prioridad: 'alta' }),
    kpisApi.cfd(r),
    prioridad.value ? kpisApi.obtener(r) : Promise.resolve(null),
  ])
  return { kpis, alta, cfd, todas: todasFiltradas ?? kpis }
})
recargar()
watch([dias, prioridad], () => recargar(true))

const raiz = ref<HTMLElement | null>(null)
const { animar } = useEntrada(raiz)
watch(datos, animar)

const k = computed(() => datos.value?.kpis ?? null)
const cicloAlta = computed(() => datos.value?.alta.cycleTimeHoras ?? null)
const cumple = computed(() => cicloAlta.value !== null && cicloAlta.value < META_HORAS)
const porIA = computed(() => datos.value?.todas.clasificadasPorIA ?? null)
const cumple4 = computed(() => porIA.value !== null && porIA.value >= META_IA)

const titular = computed(() => {
  if (!k.value) return 'Cómo avanza el mantenimiento.'
  return `${plural(k.value.throughput, 'incidencia resuelta', 'incidencias resueltas')} en ${dias.value} días.`
})

const horas = (h: number | null) => (h === null ? null : duracionHoras(h))

const PERIODOS = [7, 14, 30] as const
const PRIORIDADES: { v: Prioridad | null; t: string }[] = [
  { v: null, t: 'Todas' },
  { v: 'alta', t: 'Alta' },
  { v: 'media', t: 'Media' },
  { v: 'baja', t: 'Baja' },
]
</script>

<template>
  <section ref="raiz" class="plano" aria-labelledby="h1">
    <div class="plano-grid" aria-hidden="true"></div>
    <div class="wrap vista">
      <p class="eyebrow" data-enter>Panel de indicadores · {{ session.usuario?.edificioNombre }}</p>
      <h1 id="h1" class="t-h1" tabindex="-1" data-enter>{{ titular }}</h1>

      <div class="filtros" data-enter>
        <div class="seg" role="group" aria-label="Periodo">
          <button v-for="d in PERIODOS" :key="d" type="button" :aria-pressed="dias === d" @click="dias = d">{{ d }} días</button>
        </div>
        <div class="seg" role="group" aria-label="Prioridad">
          <button v-for="p in PRIORIDADES" :key="p.t" type="button" :aria-pressed="prioridad === p.v" @click="prioridad = p.v">{{ p.t }}</button>
        </div>
      </div>

      <CargandoBloques v-if="cargando && !datos" texto="Calculando los indicadores…" />
      <EstadoError v-else-if="error && !datos" :mensaje="error" @reintentar="recargar()" />

      <template v-else-if="datos && k">
        <p class="lede" style="margin-top: 18px">
          Del {{ fechaCorta(k.desde) }} al {{ fechaCorta(k.hasta) }}
          · {{ plural(k.totalReportadas, 'reporte nuevo', 'reportes nuevos') }}
          <template v-if="prioridad"> · solo prioridad {{ prioridad }}</template>
        </p>

        <div class="objetivos">
          <!-- Objetivo 2: el evento principal de la vista va en el bloque oscuro -->
          <aside v-tilt="3" class="block on-dark objetivo" data-enter>
            <div class="b-head">
              <span class="stud" aria-hidden="true"></span>
              <span class="tag">Objetivo 2</span>
              <span class="tag objetivo-estado">
                <AppIcon :name="cumple ? 'check' : 'flag'" />{{ cicloAlta === null ? 'Sin datos' : cumple ? 'Cumple' : 'No cumple' }}
              </span>
            </div>
            <div class="objetivo-cuerpo">
              <p class="objetivo-num">
                <b>{{ cicloAlta === null ? '—' : horas(cicloAlta) }}</b>
                <span class="mono">/ meta {{ META_HORAS }} h</span>
              </p>
              <p style="color: var(--mbc-acc-fg-2)">
                <template v-if="cicloAlta === null">Aún no hay incidencias de prioridad alta resueltas en este periodo.</template>
                <template v-else-if="cumple">Las de prioridad alta se resuelven en {{ horas(cicloAlta) }} desde que alguien las toma. Estamos dentro de la meta.</template>
                <template v-else>Las de prioridad alta tardan {{ horas(cicloAlta) }} desde que alguien las toma: {{ horas(cicloAlta - META_HORAS) }} por encima de la meta.</template>
              </p>
            </div>
          </aside>

          <!-- Objetivo 4: siempre sobre todas las prioridades -->
          <aside v-tilt="3" class="block is-white objetivo objetivo-4" data-enter>
            <div class="b-head">
              <span class="stud" aria-hidden="true"></span>
              <span class="tag">Objetivo 4</span>
              <span class="tag objetivo-estado">
                <AppIcon :name="cumple4 ? 'check' : 'flag'" />{{ porIA === null ? 'Sin datos' : cumple4 ? 'Cumple' : 'No cumple' }}
              </span>
            </div>
            <div class="escena-fila">
              <EscenaProgreso v-if="porIA !== null" :hechos="Math.round(porIA)" :total="100" etiqueta="Reportes que la IA clasificó sola" style="--c: var(--mbc-lav)" />
              <div>
                <p class="m-num"><b class="nowrap">{{ porIA === null ? '—' : `${formatoNumero(porIA, 1)}%` }}</b><span class="m-of mono">/ meta {{ META_IA }}%</span></p>
                <p class="m-label">
                  <template v-if="porIA === null">No hubo reportes nuevos en este periodo.</template>
                  <template v-else-if="cumple4">de los reportes nuevos los clasificó la IA sola, sin caer al respaldo.</template>
                  <template v-else>los clasificó la IA sola. Los que cayeron al respaldo cuentan cuando se reclasifican.</template>
                </p>
              </div>
            </div>
          </aside>
        </div>

        <ul class="metricas escalera">
          <li v-tilt class="block" style="--c: var(--mbc-sky)" data-enter>
            <div class="b-head"><span class="stud" aria-hidden="true"></span><span class="tag">Cycle time</span></div>
            <p class="m-num"><b>{{ horas(k.cycleTimeHoras) ?? 'Sin datos' }}</b></p>
            <p class="m-label">promedio desde que se toma hasta que se resuelve</p>
            <p class="formula"><span class="f-pill">resuelta</span><span class="f-op">−</span><span class="f-pill">en proceso</span></p>
          </li>
          <li v-tilt class="block" style="--c: var(--mbc-peach)" data-enter>
            <div class="b-head"><span class="stud" aria-hidden="true"></span><span class="tag">Lead time</span></div>
            <p class="m-num"><b>{{ horas(k.leadTimeHoras) ?? 'Sin datos' }}</b></p>
            <p class="m-label">promedio desde el reporte hasta que se resuelve</p>
            <p class="formula"><span class="f-pill">resuelta</span><span class="f-op">−</span><span class="f-pill">reporte</span></p>
          </li>
          <li v-tilt class="block" style="--c: var(--mbc-brick)" data-enter>
            <div class="b-head"><span class="stud" aria-hidden="true"></span><span class="tag">WIP</span><span class="b-date">ahora</span></div>
            <p class="m-num"><b>{{ k.wip }}</b><span class="m-of mono">en proceso</span></p>
            <p class="m-label">incidencias que alguien está trabajando en este momento</p>
          </li>
          <li v-tilt class="block" style="--c: var(--mbc-mint)" data-enter>
            <div class="b-head"><span class="stud" aria-hidden="true"></span><span class="tag">Throughput</span></div>
            <EscenaProgreso :hechos="Math.min(k.throughput, k.totalReportadas || k.throughput)" :total="k.totalReportadas || k.throughput" etiqueta="Resueltas frente a reportadas" />
            <p class="m-num"><b>{{ k.throughput }}</b><span class="m-of mono">/ {{ k.totalReportadas }} reportadas</span></p>
            <p class="m-label">resueltas en el periodo</p>
          </li>
          <li v-tilt class="block" style="--c: var(--mbc-lav)" data-enter>
            <div class="b-head"><span class="stud" aria-hidden="true"></span><span class="tag">Precisión IA</span></div>
            <EscenaProgreso v-if="k.precisionIA !== null" :hechos="Math.round(k.precisionIA)" :total="100" etiqueta="Clasificaciones de la IA sin corregir" />
            <p class="m-num"><b class="nowrap">{{ k.precisionIA === null ? 'Sin datos' : `${formatoNumero(k.precisionIA, 1)}%` }}</b></p>
            <p class="m-label">de lo que clasificó la IA no hubo que corregirlo</p>
          </li>
        </ul>

        <div class="sec">
          <div class="sec-head" data-enter>
            <h2 class="t-h2">Flujo acumulado</h2>
            <p>Cada franja es un estado. Si la de pendientes se ensancha, entra más de lo que se resuelve.</p>
          </div>
          <div class="block is-white" data-enter>
            <div class="b-head"><span class="stud" aria-hidden="true"></span><span class="tag">CFD · {{ dias }} días</span></div>
            <GraficoCFD v-if="datos.cfd.length" :puntos="datos.cfd" />
            <p v-else class="b-meta">No hay movimientos en este periodo.</p>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
