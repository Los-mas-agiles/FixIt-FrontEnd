<script setup lang="ts">
import { onMounted } from 'vue'
import { usePush } from '@/composables/usePush'
import AppIcon from '@/components/ui/AppIcon.vue'

// Avisos push en este equipo (HU4). El permiso se pide solo al tocar el botón.
const push = usePush()
onMounted(() => push.revisar())
</script>

<template>
  <div class="avisos-push">
    <p v-if="push.permiso.value === 'no-soportado'" class="hint">
      Este navegador no admite avisos en el equipo. Revisa la campanita de vez en cuando.
    </p>
    <p v-else-if="push.necesitaInstalarIOS.value" class="hint">
      En iPhone, los avisos llegan solo si instalas FixIt: en Safari toca <strong>Compartir</strong> y luego
      <strong>Agregar a inicio</strong>.
    </p>
    <template v-else-if="push.activo.value">
      <p class="hint"><AppIcon name="check" /> Este equipo recibe tus avisos.</p>
      <button class="btn ghost small" type="button" :disabled="push.ocupado.value" @click="push.desactivar">
        Dejar de recibirlos aquí
      </button>
    </template>
    <template v-else>
      <p class="hint">Recibe los cambios de estado aunque tengas FixIt cerrado.</p>
      <button class="btn small" type="button" :disabled="push.ocupado.value" @click="push.activar">
        <AppIcon name="bell" />{{ push.ocupado.value ? 'Activando…' : 'Activar avisos en este equipo' }}
      </button>
    </template>
    <p v-if="push.error.value" class="err" role="alert">{{ push.error.value }}</p>
  </div>
</template>
