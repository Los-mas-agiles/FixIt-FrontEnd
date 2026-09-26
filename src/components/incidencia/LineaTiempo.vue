<script setup lang="ts">
import type { CambioEstado } from '@/types/models'
import { colorEstado, textoEstado } from '@/utils/textos'
import { fechaCorta, fechaFrase, hora } from '@/utils/fechas'

defineProps<{ historial: CambioEstado[] }>()

const dia = (iso: string) => fechaCorta(iso).split(' ')[0]
const mes = (iso: string) => (fechaCorta(iso).split(' ')[1] ?? '').toUpperCase()
const titulo = (c: CambioEstado) =>
  c.estadoAnterior === null ? 'Se reportó la incidencia' : c.estadoNuevo === 'resuelto' ? 'Quedó resuelta' : `Pasó a ${textoEstado[c.estadoNuevo]}`
</script>

<!-- Línea de tiempo tipo andamio con el historial de estados. -->
<template>
  <ol class="timeline" aria-label="Historial de la incidencia">
    <li v-for="c in historial" :key="c.id" class="tl-item">
      <div class="tl-date" :style="{ '--c': colorEstado[c.estadoNuevo] }" aria-hidden="true">
        <b>{{ dia(c.fecha) }}</b><span>{{ mes(c.fecha) }}</span>
      </div>
      <div class="tl-body block is-white">
        <h3>{{ titulo(c) }}</h3>
        <p class="b-meta">
          {{ c.usuario.nombre }} · <time :datetime="c.fecha">{{ fechaFrase(c.fecha) }}, {{ hora(c.fecha) }}</time>
        </p>
      </div>
    </li>
  </ol>
</template>
