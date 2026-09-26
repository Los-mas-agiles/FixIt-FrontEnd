import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * Progreso del edificio de fondo (capa F1 de Block City).
 * Fórmula de FixIt: incidencias resueltas / incidencias visibles para el usuario.
 * Es decorativo (opacidad 16 %); cada vista lo actualiza con sus datos.
 */
export const useObraStore = defineStore('obra', () => {
  const progreso = ref(0.35)
  function set(resueltas: number, total: number) {
    progreso.value = total > 0 ? resueltas / total : 0.35
  }
  return { progreso, set }
})
