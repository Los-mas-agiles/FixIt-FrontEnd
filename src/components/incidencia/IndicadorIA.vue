<script setup lang="ts">
import type { ClasificadoPor } from '@/types/models'
import { textoClasificadoPor } from '@/utils/textos'
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps<{ por: ClasificadoPor }>()
const icono: Record<ClasificadoPor, string> = { ia: 'spark', fallback: 'flag', manual: 'user' }
</script>

<!-- Indicador discreto de quién clasificó la incidencia (HU2). -->
<template>
  <span class="ia-ind" :class="`ia-${por}`">
    <AppIcon :name="icono[por]" />{{ textoClasificadoPor[por] }}
  </span>
</template>
