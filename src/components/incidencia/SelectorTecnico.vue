<script setup lang="ts">
import { computed } from 'vue'
import type { Incidencia, Usuario } from '@/types/models'
import AppIcon from '@/components/ui/AppIcon.vue'

// Admin: elegir técnico. Emite el id elegido (o null para quitarlo, solo en pendientes).
const props = defineProps<{ incidencia: Incidencia; tecnicos: Usuario[]; deshabilitado?: boolean }>()
const emit = defineEmits<{ elegir: [tecnicoId: string | null] }>()

const idCampo = computed(() => `tec-${props.incidencia.id}`)
const valor = computed(() => props.incidencia.asignadoA?.id ?? '')

function cambiar(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  if (v !== valor.value) emit('elegir', v || null)
}
</script>

<template>
  <div class="field is-select tec-select">
    <div class="f-box">
      <select :id="idCampo" class="f-in" :value="valor" :disabled="deshabilitado" @change="cambiar">
        <option value="" :disabled="incidencia.estado !== 'pendiente'">Sin técnico</option>
        <option v-for="t in tecnicos" :key="t.id" :value="t.id">{{ t.nombre }}</option>
      </select>
      <label :for="idCampo">Técnico</label>
      <AppIcon name="down" class="caret" />
      <span class="pour" aria-hidden="true"></span>
    </div>
  </div>
</template>
