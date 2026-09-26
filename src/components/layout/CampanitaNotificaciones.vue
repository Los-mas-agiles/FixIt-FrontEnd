<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as notifApi from '@/api/notificaciones'
import { mensajeDeError } from '@/api/client'
import type { Notificacion } from '@/types/models'
import { usePolling } from '@/composables/usePolling'
import { usePush } from '@/composables/usePush'
import { marcaTiempo } from '@/utils/fechas'
import { plural } from '@/utils/textos'
import { rollTo } from '@/lib/blockCity'
import AppIcon from '@/components/ui/AppIcon.vue'

const router = useRouter()
const avisos = ref<Notificacion[]>([])
const abierta = ref(false)
const error = ref<string | null>(null)
const cargado = ref(false)
const raiz = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const boton = ref<HTMLButtonElement | null>(null)
const contador = ref<HTMLElement | null>(null)

const noLeidas = computed(() => avisos.value.filter((a) => !a.leida).length)
const push = usePush()

async function cargar() {
  try {
    avisos.value = await notifApi.listar()
    error.value = null
  } catch (e) {
    if (!cargado.value) error.value = mensajeDeError(e)
  } finally {
    cargado.value = true
  }
}
usePolling(cargar, 30, { inmediato: true })
watch(noLeidas, (n) => rollTo(contador.value, n))

async function abrirAviso(a: Notificacion) {
  abierta.value = false
  if (!a.leida) {
    a.leida = true
    notifApi.marcarLeida(a.id).catch(() => { a.leida = false })
  }
  await router.push({ name: 'incidencia', params: { id: a.incidenciaId } })
}

async function leerTodas() {
  const antes = avisos.value.map((a) => ({ ...a }))
  avisos.value = avisos.value.map((a) => ({ ...a, leida: true }))
  try {
    await notifApi.leerTodas()
  } catch (e) {
    avisos.value = antes
    error.value = mensajeDeError(e)
  }
}

async function alternar() {
  abierta.value = !abierta.value
  if (abierta.value) {
    push.revisar()
    await nextTick()
    panel.value?.querySelector<HTMLElement>('h2')?.focus()
  }
}
function cerrar(devolverFoco = true) {
  if (!abierta.value) return
  abierta.value = false
  if (devolverFoco) boton.value?.focus()
}
function alClicFuera(e: PointerEvent) {
  if (abierta.value && raiz.value && !raiz.value.contains(e.target as Node)) cerrar(false)
}
function alTecla(e: KeyboardEvent) {
  if (e.key === 'Escape') cerrar()
}
onMounted(() => {
  document.addEventListener('pointerdown', alClicFuera)
  document.addEventListener('keydown', alTecla)
  rollTo(contador.value, noLeidas.value)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', alClicFuera)
  document.removeEventListener('keydown', alTecla)
})
</script>

<template>
  <div ref="raiz" class="campanita">
    <button
      ref="boton"
      class="campanita-btn"
      type="button"
      :aria-expanded="abierta"
      aria-controls="panel-avisos"
      @click="alternar"
    >
      <AppIcon name="bell" />
      <span class="sr">Avisos{{ noLeidas ? `, ${noLeidas} sin leer` : '' }}</span>
      <span ref="contador" class="count roll" :class="{ 'is-zero': noLeidas === 0 }" aria-hidden="true"></span>
    </button>

    <section
      v-show="abierta"
      id="panel-avisos"
      ref="panel"
      class="block is-white avisos-panel"
      aria-labelledby="avisos-titulo"
    >
      <div class="b-head">
        <span class="stud" aria-hidden="true"></span>
        <span class="tag">Avisos</span>
        <span v-if="noLeidas" class="tag dark">{{ plural(noLeidas, 'nuevo') }}</span>
      </div>
      <h2 id="avisos-titulo" class="b-title" tabindex="-1">
        {{ noLeidas ? `Tienes ${plural(noLeidas, 'aviso nuevo', 'avisos nuevos')}.` : 'Estás al día.' }}
      </h2>

      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <p v-else-if="cargado && avisos.length === 0" class="b-meta">
        Aquí verás cuando una incidencia cambie de estado o te la asignen.
      </p>

      <ul v-if="avisos.length" class="avisos-lista">
        <li v-for="a in avisos" :key="a.id">
          <button type="button" class="aviso" :class="{ 'is-nuevo': !a.leida }" @click="abrirAviso(a)">
            <span class="aviso-t">{{ marcaTiempo(a.fecha) }}<span v-if="!a.leida" class="tag dark">Nuevo</span></span>
            <span class="aviso-m">{{ a.mensaje }}</span>
          </button>
        </li>
      </ul>

      <div v-if="noLeidas" class="b-actions">
        <button class="btn ghost small" type="button" @click="leerTodas">
          <AppIcon name="check" />Marcar todas como leídas
        </button>
      </div>

      <div class="avisos-push">
        <p v-if="push.permiso.value === 'no-soportado'" class="hint">
          Este navegador no admite avisos en el equipo. Revisa la campanita de vez en cuando.
        </p>
        <p v-else-if="push.necesitaInstalarIOS.value" class="hint">
          En iPhone, los avisos llegan solo si instalas FixIt: en Safari toca <strong>Compartir</strong> y luego
          <strong>Agregar a inicio</strong>.
        </p>
        <template v-else-if="push.activo.value">
          <p class="hint"><AppIcon name="check" /> Este equipo recibe tus avisos.</p>
          <button class="btn ghost small" type="button" :disabled="push.ocupado.value" @click="push.desactivar">
            Dejar de recibirlos aquí
          </button>
        </template>
        <template v-else>
          <p class="hint">Recibe los cambios de estado aunque tengas FixIt cerrado.</p>
          <button class="btn small" type="button" :disabled="push.ocupado.value" @click="push.activar">
            <AppIcon name="bell" />{{ push.ocupado.value ? 'Activando…' : 'Activar avisos en este equipo' }}
          </button>
        </template>
        <p v-if="push.error.value" class="err" role="alert">{{ push.error.value }}</p>
      </div>
    </section>
  </div>
</template>
