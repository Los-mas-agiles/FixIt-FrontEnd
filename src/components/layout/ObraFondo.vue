<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { obra } from '@/lib/blockCity'
import { useObraStore } from '@/stores/obra'

// Capa F1: edificio en construcción detrás de todo (16 % de opacidad, decorativo).
// Sube un bloque por cada incidencia resuelta en proporción al total visible.
const svg = ref<SVGSVGElement | null>(null)
const store = useObraStore()
let edificio: ReturnType<typeof obra> | null = null

onMounted(() => {
  if (!svg.value) return
  edificio = obra(svg.value, { cols: 8, rows: 10 })
  edificio.set(store.progreso)
})
watch(() => store.progreso, (p) => edificio?.set(p))
onBeforeUnmount(() => edificio?.destroy())
</script>

<template>
  <svg ref="svg" class="obra-bg" aria-hidden="true" focusable="false"></svg>
</template>
