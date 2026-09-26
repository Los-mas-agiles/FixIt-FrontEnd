import { ref } from 'vue'
import * as usuariosApi from '@/api/usuarios'
import type { Usuario } from '@/types/models'

// Técnicos del edificio (solo admin). Se cargan una vez por sesión de página.
const tecnicos = ref<Usuario[]>([])
let pedido: Promise<void> | null = null

export function useTecnicos() {
  function cargar(forzar = false) {
    if (pedido && !forzar) return pedido
    pedido = usuariosApi
      .listar('mantenimiento')
      .then((r) => { tecnicos.value = r })
      .catch(() => { pedido = null })
    return pedido
  }
  return { tecnicos, cargar }
}
