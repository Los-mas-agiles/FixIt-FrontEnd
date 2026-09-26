<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { scene } from '@/lib/blockCity'

// Mini-escena F3: 12 bloques que se llenan de abajo arriba + trabajador sobre el último.
const props = withDefaults(defineProps<{ hechos: number; total: number; etiqueta: string }>(), {})

const host = ref<HTMLElement | null>(null)
let escena: ReturnType<typeof scene> | null = null

onMounted(() => {
  if (!host.value) return
  escena = scene(host.value, { label: props.etiqueta })
  escena.set(props.hechos, props.total, 'all')
})
watch(() => [props.hechos, props.total] as const, ([h, t]) => escena?.set(h, t, 'diff'))
</script>

<template>
  <div ref="host"></div>
</template>
