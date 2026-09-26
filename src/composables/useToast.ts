import { reactive } from 'vue'

export interface Toast {
  id: number
  titulo: string
  cuerpo: string
  saliendo: boolean
}

// Toast-viga de Block City: título en pasado de 2–3 palabras + consecuencia. 5,2 s, máximo 3.
const estado = reactive({ toasts: [] as Toast[] })
let siguienteId = 1

export function cerrarToast(id: number) {
  const t = estado.toasts.find((x) => x.id === id)
  if (!t || t.saliendo) return
  t.saliendo = true
  setTimeout(() => {
    const i = estado.toasts.findIndex((x) => x.id === id)
    if (i >= 0) estado.toasts.splice(i, 1)
  }, 420)
}

export function toast(titulo: string, cuerpo = '', ms = 5200) {
  const id = siguienteId++
  estado.toasts.push({ id, titulo, cuerpo, saliendo: false })
  while (estado.toasts.length > 3) estado.toasts.shift()
  setTimeout(() => cerrarToast(id), ms)
  return id
}

export function useToast() {
  return { toasts: estado.toasts, toast, cerrar: cerrarToast }
}
