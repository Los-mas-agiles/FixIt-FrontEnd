<script setup lang="ts">
withDefaults(defineProps<{ texto?: string; cantidad?: number }>(), { texto: 'Cargando…', cantidad: 3 })
</script>

<!-- Carga: bloques pendientes (contorno punteado, como en las mini-escenas). Sin animaciones en bucle. -->
<template>
  <div class="cargando" role="status" aria-live="polite">
    <p class="eyebrow cargando-t">{{ texto }}</p>
    <div class="grid-cards three">
      <div v-for="i in cantidad" :key="i" class="bloque-fantasma" aria-hidden="true">
        <span class="stud-fantasma"></span>
        <span class="linea l1"></span>
        <span class="linea l2"></span>
        <span class="linea l3"></span>
      </div>
    </div>
  </div>
</template>
