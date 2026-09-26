<script setup lang="ts">
import type { Prioridad } from '@/types/models'
import { textoPrioridad } from '@/utils/textos'

defineProps<{ prioridad: Prioridad }>()
const nivel: Record<Prioridad, number> = { alta: 3, media: 2, baja: 1 }
</script>

<!-- Prioridad: barras de nivel + texto. La alta va en tag oscuro (atención), sin usar rojo. -->
<template>
  <span class="tag prio" :class="{ dark: prioridad === 'alta' }">
    <span class="prio-bars" aria-hidden="true">
      <i v-for="n in 3" :key="n" :class="{ on: n <= nivel[prioridad] }"></i>
    </span>
    Prioridad {{ textoPrioridad[prioridad].toLowerCase() }}
  </span>
</template>
