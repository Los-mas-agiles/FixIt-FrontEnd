<script setup lang="ts">
import AppIcon from './AppIcon.vue'

defineProps<{ mensaje: string; titulo?: string }>()
defineEmits<{ reintentar: [] }>()
</script>

<template>
  <div class="block is-white error-bloque" role="alert">
    <div class="b-head">
      <span class="stud" aria-hidden="true"></span>
      <span class="tag dark">Algo falló</span>
    </div>
    <h2 class="b-title">{{ titulo ?? 'No pudimos cargar esto.' }}</h2>
    <p class="b-meta">{{ mensaje }}</p>
    <div class="b-actions">
      <button class="btn small" type="button" @click="$emit('reintentar')">
        <AppIcon name="refresh" />Reintentar
      </button>
    </div>
  </div>
</template>
