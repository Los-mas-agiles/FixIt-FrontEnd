<script setup lang="ts">
defineProps<{ titulo: string; texto?: string }>()
</script>

<!-- Vacío: frase amable y específica, nunca "No hay datos". -->
<template>
  <div class="empty">
    <p class="empty-t">{{ titulo }}</p>
    <p v-if="texto" class="small" style="margin-top: 4px">{{ texto }}</p>
    <div v-if="$slots.default" class="empty-acc"><slot /></div>
  </div>
</template>
