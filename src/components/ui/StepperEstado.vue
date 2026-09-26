<script setup lang="ts">
import type { EstadoIncidencia } from '@/types/models'
import { ESTADOS, pasoEstado, textoEstado } from '@/utils/textos'

defineProps<{ estado: EstadoIncidencia }>()
</script>

<!-- Stepper de 3 tramos: el estado nunca se comunica solo con color. -->
<template>
  <div class="stepper-wrap">
    <div class="stepper" aria-hidden="true">
      <span v-for="(e, i) in ESTADOS" :key="e" class="step" :class="{ on: i < pasoEstado[estado] }"></span>
    </div>
    <p class="step-labels" aria-hidden="true">
      <span v-for="e in ESTADOS" :key="e" :class="{ 'is-cur': e === estado }">{{ textoEstado[e] }}</span>
    </p>
    <p class="sr">Estado: {{ textoEstado[estado] }} (paso {{ pasoEstado[estado] }} de 3)</p>
  </div>
</template>
