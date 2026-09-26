<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import * as incidenciasApi from '@/api/incidencias'
import type { Incidencia, Prioridad, TipoIncidencia } from '@/types/models'
import { useCarga } from '@/composables/useCarga'
import { usePolling } from '@/composables/usePolling'
import { useEntrada } from '@/composables/useEntrada'
import { useAccionesIncidencia } from '@/composables/useAccionesIncidencia'
import { useTecnicos } from '@/composables/useTecnicos'
import { useSessionStore } from '@/stores/session'
import { settle } from '@/lib/blockCity'
import { codigoIncidencia, colorEstado, PRIORIDADES, textoEstado, textoPrioridad, textoTipo, TIPOS } from '@/utils/textos'
import { duracionHoras, fechaFrase, hora } from '@/utils/fechas'
import { vTilt } from '@/directives/tilt'
import AppIcon from '@/components/ui/AppIcon.vue'
import CargandoBloques from '@/components/ui/CargandoBloques.vue'
import EstadoError from '@/components/ui/EstadoError.vue'
import StepperEstado from '@/components/ui/StepperEstado.vue'
import BadgePrioridad from '@/components/incidencia/BadgePrioridad.vue'
import IndicadorIA from '@/components/incidencia/IndicadorIA.vue'
import LineaTiempo from '@/components/incidencia/LineaTiempo.vue'
import SelectorTecnico from '@/components/incidencia/SelectorTecnico.vue'

const props = defineProps<{ id: string }>()

const session = useSessionStore()
const esAdmin = computed(() => session.rol === 'administrador')
const esTecnico = computed(() => session.rol === 'mantenimiento')

const { datos, cargando, error, status, recargar } = useCarga(() => incidenciasApi.obtener(props.id))
usePolling(() => recargar(true), 30, { inmediato: true })
watch(() => props.id, () => { datos.value = null; recargar() })
// 404: no existe o es de otra persona/edificio (el backend no distingue, y está bien)
const es404 = computed(() => status.value === 404)

const { tecnicos, cargar: cargarTecnicos } = useTecnicos()
watch(esAdmin, (a) => { if (a) cargarTecnicos() }, { immediate: true })

const raiz = ref<HTMLElement | null>(null)
const bloqueEstado = ref<HTMLElement | null>(null)
const { animar } = useEntrada(raiz)
watch(datos, animar)

const inc = computed(() => datos.value)
const volverA = computed(() => (session.rol === 'residente' ? { name: 'mis-incidencias' } : { name: 'tablero' }))
const volverTexto = computed(() => (session.rol === 'residente' ? 'Mis incidencias' : 'Tablero'))

const esMia = computed(() => !!inc.value?.asignadoA && inc.value.asignadoA.id === session.usuario?.id)

/** Aplica la respuesta del backend sin esperar al siguiente polling y recarga el historial. */
function aplicar(r: Incidencia | null) {
  if (!r || !datos.value) return
  datos.value = { ...datos.value, ...r }
  settle(bloqueEstado.value)
  recargar(true)
}

const acciones = useAccionesIncidencia(() => recargar(true))
const ocupada = computed(() => acciones.ocupada.value !== null)
const avanzar = async () => { if (inc.value) aplicar(await acciones.avanzar(inc.value)) }
const asignar = async (tecnicoId: string | null) => { if (inc.value) aplicar(await acciones.asignar(inc.value, tecnicoId)) }

// ── Corrección de la clasificación (admin, HU2) ──
const tipoElegido = ref<TipoIncidencia | null>(null)
const prioridadElegida = ref<Prioridad | null>(null)
const hayCambiosPropios = ref(false)
const hayCambios = computed(() => !!inc.value && (tipoElegido.value !== inc.value.tipo || prioridadElegida.value !== inc.value.prioridad))
// Mientras el admin no toque los chips, siguen lo que diga la API (incluido el polling)
watch(inc, (i) => {
  if (!i || hayCambiosPropios.value) return
  tipoElegido.value = i.tipo
  prioridadElegida.value = i.prioridad
}, { immediate: true })
async function guardarClasificacion() {
  if (!inc.value || !hayCambios.value) return
  const cambios: { tipo?: TipoIncidencia; prioridad?: Prioridad } = {}
  if (tipoElegido.value && tipoElegido.value !== inc.value.tipo) cambios.tipo = tipoElegido.value
  if (prioridadElegida.value && prioridadElegida.value !== inc.value.prioridad) cambios.prioridad = prioridadElegida.value
  const r = await acciones.clasificar(inc.value, cambios)
  if (r) hayCambiosPropios.value = false
  aplicar(r)
}

// ── Textos del bloque "Tu parte" ──
const parte = computed(() => {
  const i = inc.value
  if (!i) return { titulo: '', texto: '' }
  const tecnico = i.asignadoA?.nombre
  if (session.rol === 'residente') {
    if (i.estado === 'pendiente') return { titulo: 'En la fila de mantenimiento.', texto: tecnico ? `${tecnico} la tiene asignada. Te avisamos cuando empiece.` : 'Te avisamos en la campanita en cuanto alguien la tome.' }
    if (i.estado === 'en_proceso') return { titulo: `${tecnico ?? 'Un técnico'} está en esto.`, texto: 'Te avisamos cuando quede resuelta.' }
    return { titulo: 'Quedó resuelta.', texto: 'Si el problema vuelve, repórtalo de nuevo y lo vemos otra vez.' }
  }
  if (i.estado === 'resuelto') return { titulo: 'Trabajo terminado.', texto: `${tecnico ?? 'El técnico'} la marcó resuelta y ${i.residente.nombre} recibió el aviso.` }
  if (esTecnico.value) {
    if (i.estado === 'pendiente') {
      if (i.asignadoA && !esMia.value) return { titulo: `Asignada a ${tecnico}.`, texto: 'Solo esa persona o administración pueden moverla.' }
      return { titulo: esMia.value ? 'Te la asignaron.' : 'Está libre.', texto: 'Tómala cuando empieces: pasa a En proceso y el residente recibe el aviso.' }
    }
    if (esMia.value) return { titulo: 'La tienes en proceso.', texto: 'Márcala resuelta cuando termines el arreglo.' }
    return { titulo: `${tecnico} está en esto.`, texto: 'Solo esa persona o administración pueden cerrarla.' }
  }
  // administrador
  if (i.estado === 'pendiente') return { titulo: tecnico ? `Asignada a ${tecnico}.` : 'Nadie la tiene todavía.', texto: tecnico ? 'Puedes pasarla a En proceso o cambiar de técnico.' : 'Elige un técnico: recibe un aviso al instante.' }
  return { titulo: `${tecnico} está en esto.`, texto: 'Puedes reasignarla o marcarla resuelta.' }
})

const puedeAvanzar = computed(() => {
  const i = inc.value
  if (!i || i.estado === 'resuelto') return false
  if (esAdmin.value) return i.estado === 'en_proceso' || !!i.asignadoA
  if (esTecnico.value) return i.estado === 'pendiente' ? !i.asignadoA || esMia.value : esMia.value
  return false
})
const textoAvanzar = computed(() => (inc.value?.estado === 'pendiente' ? (esAdmin.value ? 'Pasar a En proceso' : 'Tomar incidencia') : 'Marcar resuelta'))

const tardo = computed(() => {
  const i = inc.value
  if (!i?.fechaResolucion) return null
  return duracionHoras((new Date(i.fechaResolucion).getTime() - new Date(i.fechaCreacion).getTime()) / 3_600_000)
})

const fotoRota = ref(false)
watch(() => inc.value?.fotoUrl, () => { fotoRota.value = false })

</script>

<template>
  <section ref="raiz" class="plano" data-cursor="nivel" aria-labelledby="h1">
    <div class="plano-grid" aria-hidden="true"></div>
    <div class="wrap vista">
      <RouterLink class="volver" :to="volverA"><AppIcon name="back" />{{ volverTexto }}</RouterLink>

      <CargandoBloques v-if="cargando && !inc" texto="Cargando la incidencia…" :cantidad="2" />

      <template v-else-if="!inc">
        <h1 id="h1" class="t-h2" tabindex="-1" style="margin-bottom: 24px">
          {{ es404 ? 'No encontramos esta incidencia.' : 'No pudimos abrir esta incidencia.' }}
        </h1>
        <EstadoError
          :titulo="es404 ? 'Puede que no exista o que no sea tuya.' : undefined"
          :mensaje="error ?? 'Intenta de nuevo en un momento.'"
          @reintentar="recargar()"
        />
      </template>

      <div v-else class="split">
        <div class="stack-main">
          <div>
            <p class="eyebrow" data-enter>{{ codigoIncidencia(inc.id) }} · {{ textoTipo[inc.tipo] }} · reportada el {{ fechaFrase(inc.fechaCreacion) }}</p>
            <h1 id="h1" class="t-h2 detalle-h1" tabindex="-1" data-enter>{{ inc.descripcion }}</h1>
          </div>

          <div ref="bloqueEstado" class="block" :style="{ '--c': colorEstado[inc.estado] }" data-enter>
            <div class="b-head">
              <span class="stud" aria-hidden="true"></span>
              <span class="tag"><AppIcon v-if="inc.estado === 'resuelto'" name="check" class="tag-ic" />{{ textoEstado[inc.estado] }}</span>
              <BadgePrioridad :prioridad="inc.prioridad" />
              <IndicadorIA :por="inc.clasificadoPor" class="b-date" />
            </div>
            <dl class="datos">
              <div><dt>Reportó</dt><dd>{{ inc.residente.nombre }} · {{ hora(inc.fechaCreacion) }}</dd></div>
              <div><dt>Técnico</dt><dd>{{ inc.asignadoA?.nombre ?? 'Sin asignar' }}</dd></div>
              <div v-if="inc.fechaInicioProceso"><dt>En proceso desde</dt><dd>{{ fechaFrase(inc.fechaInicioProceso) }}, {{ hora(inc.fechaInicioProceso) }}</dd></div>
              <div v-if="inc.fechaResolucion"><dt>Resuelta</dt><dd>{{ fechaFrase(inc.fechaResolucion) }}, {{ hora(inc.fechaResolucion) }} · tardó {{ tardo }}</dd></div>
            </dl>
            <StepperEstado :estado="inc.estado" />
          </div>

          <figure v-if="inc.fotoUrl" class="block is-white foto-bloque" data-enter>
            <div class="b-head">
              <span class="stud" aria-hidden="true"></span>
              <span class="tag">Foto del reporte</span>
            </div>
            <img v-if="!fotoRota" :src="inc.fotoUrl" :alt="`Foto enviada por ${inc.residente.nombre}`" loading="lazy" @error="fotoRota = true" />
            <p v-else class="b-meta">
              El enlace de la foto venció.
              <button class="btn ghost small" type="button" @click="recargar()">Volver a cargarla</button>
            </p>
          </figure>

          <div data-enter>
            <h2 class="t-h3" style="margin-bottom: 16px">Bitácora</h2>
            <LineaTiempo :historial="inc.historial" />
          </div>
        </div>

        <div class="stack-aside">
          <aside v-tilt class="block on-dark" data-cursor="llana" data-enter style="padding: 24px">
            <div class="b-head">
              <span class="stud" aria-hidden="true"></span>
              <span class="tag">Tu parte</span>
            </div>
            <h2 class="t-h3" style="font-size: 24px">{{ parte.titulo }}</h2>
            <p style="color: var(--mbc-acc-fg-2); margin-top: 6px">{{ parte.texto }}</p>

            <div v-if="esAdmin && inc.estado !== 'resuelto'" class="on-dark-field">
              <SelectorTecnico :incidencia="inc" :tecnicos="tecnicos" :deshabilitado="ocupada" @elegir="asignar" />
            </div>

            <div v-if="puedeAvanzar" class="b-actions">
              <button class="btn" type="button" :disabled="ocupada" @click="avanzar">
                <AppIcon :name="inc.estado === 'pendiente' ? 'wrench' : 'check'" />{{ textoAvanzar }}
              </button>
            </div>
            <p v-else-if="inc.estado === 'resuelto'" class="done-label"><AppIcon name="check" />Resuelta</p>
          </aside>

          <form
            v-if="esAdmin"
            class="block form-bloque"
            style="--c: var(--mbc-lav)"
            data-enter
            @submit.prevent="guardarClasificacion"
          >
            <div class="b-head">
              <span class="stud" aria-hidden="true"></span>
              <span class="tag">Clasificación</span>
            </div>
            <h2 class="t-h3">¿La IA acertó?</h2>
            <p class="b-meta">Si el tipo o la prioridad no calzan, corrígelos. Cuenta para medir la precisión de la IA.</p>

            <fieldset class="chips" style="margin-top: 16px">
              <legend>Tipo</legend>
              <div class="chip-row">
                <label v-for="t in TIPOS" :key="t" class="chip">
                  <input v-model="tipoElegido" type="radio" name="tipo" :value="t" @change="hayCambiosPropios = true" />
                  <span>{{ textoTipo[t] }}</span>
                </label>
              </div>
            </fieldset>
            <fieldset class="chips" style="margin-top: 14px">
              <legend>Prioridad</legend>
              <div class="chip-row">
                <label v-for="p in PRIORIDADES" :key="p" class="chip">
                  <input v-model="prioridadElegida" type="radio" name="prioridad" :value="p" @change="hayCambiosPropios = true" />
                  <span>{{ textoPrioridad[p] }}</span>
                </label>
              </div>
            </fieldset>
            <div class="b-actions">
              <button class="btn" type="submit" :disabled="!hayCambios || ocupada">Guardar corrección</button>
              <p v-if="!hayCambios" class="small" style="color: var(--mbc-ink-2)">Sin cambios.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>
