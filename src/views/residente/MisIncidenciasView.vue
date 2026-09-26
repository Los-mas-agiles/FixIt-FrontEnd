<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import * as incidenciasApi from '@/api/incidencias'
import type { EstadoIncidencia } from '@/types/models'
import { useCarga } from '@/composables/useCarga'
import { usePolling } from '@/composables/usePolling'
import { useEntrada } from '@/composables/useEntrada'
import { useSessionStore } from '@/stores/session'
import { useObraStore } from '@/stores/obra'
import { primerNombre, plural } from '@/utils/textos'
import { vTilt } from '@/directives/tilt'
import AppIcon from '@/components/ui/AppIcon.vue'
import CargandoBloques from '@/components/ui/CargandoBloques.vue'
import EstadoError from '@/components/ui/EstadoError.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import IncidenciaCard from '@/components/incidencia/IncidenciaCard.vue'
import EscenaProgreso from '@/components/kpis/EscenaProgreso.vue'

const session = useSessionStore()
const obra = useObraStore()
const { datos, cargando, error, recargar } = useCarga(() => incidenciasApi.listar())
usePolling(() => recargar(true), 30, { inmediato: true })

const raiz = ref<HTMLElement | null>(null)
const { animar } = useEntrada(raiz)

type Filtro = 'todas' | EstadoIncidencia
const filtro = ref<Filtro>('todas')

const lista = computed(() => datos.value ?? [])
const cuenta = computed(() => {
  const c = { todas: lista.value.length, pendiente: 0, en_proceso: 0, resuelto: 0 }
  for (const i of lista.value) c[i.estado]++
  return c
})
const abiertas = computed(() => cuenta.value.pendiente + cuenta.value.en_proceso)
const visibles = computed(() => (filtro.value === 'todas' ? lista.value : lista.value.filter((i) => i.estado === filtro.value)))

const titular = computed(() => {
  if (!datos.value) return 'Tus reportes en el edificio.'
  if (lista.value.length === 0) return 'Todavía no has reportado nada.'
  if (abiertas.value === 0) return 'Todo lo que reportaste está resuelto.'
  return `Tienes ${plural(abiertas.value, 'arreglo', 'arreglos')} en marcha.`
})
const bajada = computed(() => {
  const c = cuenta.value
  if (!datos.value || lista.value.length === 0) return 'Cuando algo se malogre en tu depto o en las áreas comunes, repórtalo aquí y sigue cada paso.'
  const partes = []
  if (c.pendiente) partes.push(`${plural(c.pendiente, 'espera', 'esperan')} que mantenimiento la${c.pendiente === 1 ? '' : 's'} tome`)
  if (c.en_proceso) partes.push(`${c.en_proceso} ya ${c.en_proceso === 1 ? 'está' : 'están'} en proceso`)
  if (partes.length === 0) return `Las ${plural(c.resuelto, 'incidencia')} que reportaste quedaron resueltas. Gracias por avisar.`
  return partes.join(' y ') + '. Te avisamos en la campanita cuando cambien.'
})

const FILTROS: { v: Filtro; t: string }[] = [
  { v: 'todas', t: 'Todas' },
  { v: 'pendiente', t: 'Pendientes' },
  { v: 'en_proceso', t: 'En proceso' },
  { v: 'resuelto', t: 'Resueltas' },
]

watch(datos, (d) => {
  if (d) obra.set(cuenta.value.resuelto, d.length)
  animar()
})
watch(filtro, animar)
</script>

<template>
  <section ref="raiz" class="plano" data-cursor="nivel" aria-labelledby="h1">
    <div class="plano-grid" aria-hidden="true"></div>
    <div class="wrap vista">
      <div class="split">
        <div>
          <p class="eyebrow" data-enter>Hola, {{ primerNombre(session.usuario?.nombre ?? '') }} · tus reportes</p>
          <h1 id="h1" class="t-h1" tabindex="-1" data-enter>{{ titular }}</h1>
          <p class="lede" data-enter style="margin-top: 14px">{{ bajada }}</p>
        </div>

        <div class="stack-aside">
          <aside v-tilt class="block on-dark" data-cursor="llana" data-enter style="padding: 24px">
            <div class="b-head">
              <span class="stud" aria-hidden="true"></span>
              <span class="tag">Tu parte</span>
            </div>
            <h2 class="t-h3" style="font-size: 26px">¿Algo no funciona?</h2>
            <p style="color: var(--mbc-acc-fg-2); margin-top: 6px">
              Descríbelo y agrega una foto. La IA lo clasifica y mantenimiento lo ve al instante.
            </p>
            <div class="b-actions">
              <RouterLink class="btn small" :to="{ name: 'nueva' }"><AppIcon name="plus" />Reportar incidencia</RouterLink>
            </div>
          </aside>

          <div v-if="datos && lista.length" v-tilt class="block" style="--c: var(--mbc-mint)" data-cursor="llana" data-enter>
            <div class="b-head">
              <span class="stud" aria-hidden="true"></span>
              <span class="tag">Resueltas</span>
            </div>
            <div class="escena-fila">
              <EscenaProgreso :hechos="cuenta.resuelto" :total="lista.length" etiqueta="Incidencias resueltas" />
              <div>
                <p class="m-num"><b>{{ cuenta.resuelto }}</b><span class="m-of mono">/ {{ lista.length }}</span></p>
                <p class="m-label">de tus reportes ya quedaron resueltos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="sec">
        <div class="sec-head" data-enter>
          <h2 class="t-h2">Tus incidencias</h2>
          <div v-if="datos && lista.length" class="seg" role="group" aria-label="Filtrar por estado">
            <button
              v-for="f in FILTROS"
              :key="f.v"
              type="button"
              :aria-pressed="filtro === f.v"
              @click="filtro = f.v"
            >
              {{ f.t }} <span class="n">{{ cuenta[f.v] }}</span>
            </button>
          </div>
        </div>

        <CargandoBloques v-if="cargando && !datos" texto="Cargando tus incidencias…" />
        <EstadoError v-else-if="error" :mensaje="error" @reintentar="recargar()" />
        <EmptyState
          v-else-if="lista.length === 0"
          titulo="Aún no has reportado incidencias."
          texto="Si ves una fuga, una luz quemada o algo roto en el edificio, cuéntanos."
        >
          <RouterLink class="btn" :to="{ name: 'nueva' }"><AppIcon name="plus" />Reportar la primera</RouterLink>
        </EmptyState>
        <EmptyState
          v-else-if="visibles.length === 0"
          titulo="Nada por aquí con ese filtro."
          texto="Prueba con otro estado o mira todas."
        />
        <ul v-else class="grid-cards three">
          <li v-for="i in visibles" :key="i.id" data-enter>
            <IncidenciaCard :incidencia="i" />
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
