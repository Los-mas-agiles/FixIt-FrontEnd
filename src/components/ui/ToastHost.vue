<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import AppIcon from './AppIcon.vue'

const { toasts, cerrar } = useToast()
</script>

<!-- Toast-viga: entra desde su borde, sale por el mismo. Región viva para lectores de pantalla. -->
<template>
  <div class="toasts" role="region" aria-label="Avisos rápidos" aria-live="polite">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="{ out: t.saliendo }">
      <span class="toast-block" aria-hidden="true"></span>
      <div>
        <p class="toast-t">{{ t.titulo }}</p>
        <p v-if="t.cuerpo" class="toast-b">{{ t.cuerpo }}</p>
      </div>
      <button class="toast-x" type="button" aria-label="Cerrar aviso" @click="cerrar(t.id)">
        <AppIcon name="x" />
      </button>
    </div>
  </div>
</template>
