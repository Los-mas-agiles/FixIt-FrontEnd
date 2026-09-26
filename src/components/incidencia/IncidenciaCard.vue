<script setup lang="ts">
import { computed } from 'vue'
import type { Incidencia } from '@/types/models'
import { codigoIncidencia, colorEstado, textoTipo } from '@/utils/textos'
import { fechaCorta, haceCuanto } from '@/utils/fechas'
import { vTilt } from '@/directives/tilt'
import AppIcon from '@/components/ui/AppIcon.vue'
import StepperEstado from '@/components/ui/StepperEstado.vue'
import BadgePrioridad from './BadgePrioridad.vue'

const props = withDefaults(defineProps<{ incidencia: Incidencia; mostrarResidente?: boolean; compacta?: boolean }>(), {
  mostrarResidente: false,
  compacta: false,
})

const i = computed(() => props.incidencia)
const idTitulo = computed(() => `inc-${props.incidencia.id}`)
</script>

<template>
  <article
    v-tilt
    class="block card inc-card"
    :style="{ '--c': colorEstado[i.estado] }"
    data-cursor="llana"
    :aria-labelledby="idTitulo"
  >
    <div class="b-head">
      <span class="stud" aria-hidden="true"></span>
      <span class="tag">{{ codigoIncidencia(i.id) }}</span>
      <span class="tag">{{ textoTipo[i.tipo] }}</span>
      <BadgePrioridad :prioridad="i.prioridad" />
      <time class="b-date" :datetime="i.fechaCreacion" :title="haceCuanto(i.fechaCreacion)">{{ fechaCorta(i.fechaCreacion) }}</time>
    </div>
    <h3 :id="idTitulo" class="b-title inc-title">
      <RouterLink class="inc-link" :to="{ name: 'incidencia', params: { id: i.id } }">{{ i.descripcion }}</RouterLink>
    </h3>
    <p class="b-meta">
      <template v-if="mostrarResidente">Reportó {{ i.residente.nombre }} · </template>
      <template v-if="i.asignadoA">Técnico: {{ i.asignadoA.nombre }}</template>
      <template v-else>Sin técnico asignado</template>
      <span v-if="i.fotoUrl" class="con-foto"> · <AppIcon name="camera" />con foto</span>
    </p>
    <StepperEstado v-if="!compacta" :estado="i.estado" />
    <div v-if="$slots.default" class="b-actions">
      <slot />
    </div>
  </article>
</template>
