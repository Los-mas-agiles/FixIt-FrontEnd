<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import * as usuariosApi from '@/api/usuarios'
import * as incidenciasApi from '@/api/incidencias'
import { mensajeDeError } from '@/api/client'
import type { RolUsuario, Usuario } from '@/types/models'
import { toast } from '@/composables/useToast'
import { plural, textoRol } from '@/utils/textos'
import { generarClave } from '@/utils/claves'
import AppIcon from '@/components/ui/AppIcon.vue'

const props = defineProps<{ usuario: Usuario; activo: boolean; esYo: boolean; color: string }>()
const emit = defineEmits<{ cambio: [rol: RolUsuario] }>()

type Modo = 'cerrado' | 'menu' | 'clave' | 'desactivar'
const modo = ref<Modo>('cerrado')
const ocupado = ref(false)
const error = ref('')
const clave = ref('')
const claveAsignada = ref<string | null>(null)
const enProceso = ref<number | null>(null)
const panel = ref<HTMLElement | null>(null)

const idPanel = computed(() => `gestion-${props.usuario.id}`)
const primerNombre = computed(() => props.usuario.nombre.split(' ')[0])

async function abrir(m: Modo) {
  error.value = ''
  modo.value = m
  if (m === 'clave') {
    clave.value = generarClave()
    claveAsignada.value = null
  }
  if (m === 'desactivar' && props.usuario.rol === 'mantenimiento') {
    enProceso.value = null
    incidenciasApi
      .listar({ estado: 'en_proceso' })
      .then((l) => { enProceso.value = l.filter((i) => i.asignadoA?.id === props.usuario.id).length })
      .catch(() => { enProceso.value = null })
  }
  await nextTick()
  panel.value?.querySelector<HTMLElement>('[data-foco]')?.focus()
}

async function ejecutar(cambios: { activo?: boolean; password?: string }, titulo: string, cuerpo: string) {
  if (ocupado.value) return false
  ocupado.value = true
  error.value = ''
  try {
    await usuariosApi.actualizar(props.usuario.id, cambios)
    toast(titulo, cuerpo)
    return true
  } catch (e) {
    error.value = mensajeDeError(e)
    return false
  } finally {
    ocupado.value = false
  }
}

async function asignarClave() {
  if (clave.value.length < 8) {
    error.value = 'Mínimo 8 caracteres.'
    return
  }
  const ok = await ejecutar({ password: clave.value }, 'Contraseña asignada', `Pásasela a ${primerNombre.value} por un canal privado.`)
  if (ok) claveAsignada.value = clave.value
}

async function copiar() {
  if (!claveAsignada.value) return
  try {
    await navigator.clipboard.writeText(claveAsignada.value)
    toast('Contraseña copiada', 'Pégala en un mensaje privado, no en el grupo del edificio.')
  } catch {
    error.value = 'No se pudo copiar: selecciónala y cópiala a mano.'
  }
}

async function desactivar() {
  const ok = await ejecutar({ activo: false }, 'Cuenta desactivada', `${props.usuario.nombre} ya no puede entrar.`)
  if (ok) { modo.value = 'cerrado'; emit('cambio', props.usuario.rol) }
}

async function reactivar() {
  const ok = await ejecutar({ activo: true }, 'Cuenta reactivada', `${props.usuario.nombre} puede volver a entrar con su contraseña.`)
  if (ok) emit('cambio', props.usuario.rol)
}
</script>

<template>
  <li class="usuario" :class="{ 'is-abierto': modo !== 'cerrado' }">
    <div class="usuario-fila">
      <span class="usuario-rol" :style="{ '--c': color }" aria-hidden="true"></span>
      <span class="usuario-n">
        <span>{{ usuario.nombre }}<span v-if="esYo" class="muted"> (tú)</span></span>
        <span class="usuario-e mono">{{ usuario.email }}</span>
      </span>
      <span class="tag" :style="{ background: color }">{{ textoRol[usuario.rol] }}</span>
      <button
        v-if="activo && !esYo"
        class="btn ghost small usuario-btn"
        type="button"
        :aria-expanded="modo !== 'cerrado'"
        :aria-controls="idPanel"
        @click="modo === 'cerrado' ? abrir('menu') : (modo = 'cerrado')"
      >
        {{ modo === 'cerrado' ? 'Gestionar' : 'Cerrar' }}<span class="sr"> la cuenta de {{ usuario.nombre }}</span>
      </button>
      <button v-else-if="!activo" class="btn small usuario-btn" type="button" :disabled="ocupado" @click="reactivar">
        Reactivar<span class="sr"> a {{ usuario.nombre }}</span>
      </button>
    </div>
    <p v-if="!activo && error" class="err" role="alert">{{ error }}</p>

    <div v-if="activo && modo !== 'cerrado'" :id="idPanel" ref="panel" class="usuario-panel">
      <div v-if="modo === 'menu'" class="cluster">
        <button class="btn ghost small" type="button" data-foco @click="abrir('clave')">Darle una contraseña temporal</button>
        <button class="btn ghost small" type="button" @click="abrir('desactivar')">Desactivar la cuenta</button>
      </div>

      <template v-else-if="modo === 'clave'">
        <template v-if="claveAsignada">
          <p class="small">Listo. Pásale esta contraseña a {{ primerNombre }} <strong>por un canal privado</strong>; al entrar la cambia en "Mi cuenta".</p>
          <p class="clave-lista mono" data-foco tabindex="-1">{{ claveAsignada }}</p>
          <div class="cluster">
            <button class="btn small" type="button" @click="copiar"><AppIcon name="check" />Copiar</button>
            <button class="btn ghost small" type="button" @click="modo = 'cerrado'">Terminar</button>
          </div>
        </template>
        <template v-else>
          <p class="small">Si {{ primerNombre }} olvidó su contraseña, asígnale una temporal. Ya te sugerimos una; puedes cambiarla.</p>
          <div class="field">
            <div class="f-box">
              <input :id="`clave-${usuario.id}`" v-model="clave" class="f-in mono" type="text" autocomplete="off" spellcheck="false" placeholder=" " data-foco />
              <label :for="`clave-${usuario.id}`">Contraseña temporal</label>
              <span class="pour" aria-hidden="true"></span>
            </div>
          </div>
          <div class="cluster">
            <button class="btn small" type="button" :disabled="ocupado" @click="asignarClave">{{ ocupado ? 'Asignando…' : 'Asignar' }}</button>
            <button class="btn ghost small" type="button" @click="abrir('menu')">Volver</button>
          </div>
        </template>
      </template>

      <template v-else-if="modo === 'desactivar'">
        <p class="small" data-foco tabindex="-1">
          <strong>¿Desactivar a {{ usuario.nombre }}?</strong> No podrá entrar y, si tiene la app abierta, su sesión se cierra al
          instante. Puedes reactivarla cuando quieras.
        </p>
        <p v-if="usuario.rol === 'mantenimiento' && enProceso" class="small aviso-tecnico">
          <AppIcon name="flag" />Tiene {{ plural(enProceso, 'incidencia', 'incidencias') }} en proceso: seguirán a su nombre, así que reasígnalas desde el tablero.
        </p>
        <div class="cluster">
          <button class="btn small" type="button" :disabled="ocupado" @click="desactivar">{{ ocupado ? 'Desactivando…' : 'Sí, desactivar' }}</button>
          <button class="btn ghost small" type="button" @click="abrir('menu')">Cancelar</button>
        </div>
      </template>

      <p v-if="error" class="err" role="alert">{{ error }}</p>
    </div>
  </li>
</template>
