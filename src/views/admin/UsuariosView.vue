<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import * as usuariosApi from '@/api/usuarios'
import { mensajeDeError } from '@/api/client'
import type { RolUsuario, Usuario } from '@/types/models'
import { useCarga } from '@/composables/useCarga'
import { useEntrada } from '@/composables/useEntrada'
import { useTecnicos } from '@/composables/useTecnicos'
import { toast } from '@/composables/useToast'
import { useSessionStore } from '@/stores/session'
import { plural, textoRol } from '@/utils/textos'
import { generarClave } from '@/utils/claves'
import AppIcon from '@/components/ui/AppIcon.vue'
import CargandoBloques from '@/components/ui/CargandoBloques.vue'
import EstadoError from '@/components/ui/EstadoError.vue'
import FilaUsuario from '@/components/usuarios/FilaUsuario.vue'

const session = useSessionStore()
// Activos e inactivos en paralelo: los desactivados se pueden reactivar
const { datos, cargando, error, recargar } = useCarga(async () => {
  const [activos, inactivos] = await Promise.all([usuariosApi.listar(), usuariosApi.listar({ inactivos: true })])
  return { activos, inactivos }
})
recargar()
const verInactivos = ref(false)

const raiz = ref<HTMLElement | null>(null)
const { animar } = useEntrada(raiz)
watch(datos, animar)

const ORDEN: RolUsuario[] = ['administrador', 'mantenimiento', 'residente']
const COLOR_ROL: Record<RolUsuario, string> = {
  administrador: 'var(--mbc-brick)',
  mantenimiento: 'var(--mbc-sky)',
  residente: 'var(--mbc-mint)',
}
const ordenar = (l: Usuario[]) =>
  [...l].sort((a, b) => ORDEN.indexOf(a.rol) - ORDEN.indexOf(b.rol) || a.nombre.localeCompare(b.nombre, 'es'))
const usuarios = computed(() => ordenar(datos.value?.activos ?? []))
const inactivos = computed(() => ordenar(datos.value?.inactivos ?? []))
const lista = computed(() => (verInactivos.value ? inactivos.value : usuarios.value))
const cuenta = computed(() => {
  const c: Record<RolUsuario, number> = { administrador: 0, mantenimiento: 0, residente: 0 }
  for (const u of usuarios.value) c[u.rol]++
  return c
})

// ── Formulario ──
const nombre = ref('')
const email = ref('')
const password = ref('')
const rol = ref<RolUsuario>('residente')
const errores = ref<Record<string, string>>({})
const errorGeneral = ref('')
const enviando = ref(false)
const form = ref<HTMLFormElement | null>(null)

function validar() {
  const e: Record<string, string> = {}
  if (nombre.value.trim().length < 2) e.nombre = 'Escribe nombre y apellido, como aparecerá en las incidencias.'
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) e.email = 'Escribe un correo completo, por ejemplo vecino@olivos.demo.'
  if (password.value.length < 8) e.password = 'Mínimo 8 caracteres. Compártela con la persona por un medio privado.'
  errores.value = e
  const primero = Object.keys(e)[0]
  if (primero) form.value?.querySelector<HTMLInputElement>(`#u-${primero}`)?.focus()
  return !primero
}

const { cargar: recargarTecnicos } = useTecnicos()
function alCambiar(rolCambiado: RolUsuario) {
  if (rolCambiado === 'mantenimiento') recargarTecnicos(true)
  recargar(true)
}

async function crear() {
  errorGeneral.value = ''
  if (!validar() || enviando.value) return
  enviando.value = true
  try {
    const u = await usuariosApi.crear({ nombre: nombre.value.trim(), email: email.value.trim(), password: password.value, rol: rol.value })
    toast('Usuario creado', `${u.nombre} ya puede entrar como ${textoRol[u.rol].toLowerCase()}.`)
    nombre.value = ''
    email.value = ''
    password.value = ''
    rol.value = 'residente'
    alCambiar(u.rol)
  } catch (e) {
    errorGeneral.value = mensajeDeError(e)
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <section ref="raiz" class="plano" aria-labelledby="h1">
    <div class="plano-grid" aria-hidden="true"></div>
    <div class="wrap vista">
      <p class="eyebrow" data-enter>Usuarios · {{ session.usuario?.edificioNombre }}</p>
      <h1 id="h1" class="t-h1" tabindex="-1" data-enter>
        {{ datos ? `${plural(usuarios.length, 'persona usa', 'personas usan')} FixIt en el edificio.` : 'Quién usa FixIt en el edificio.' }}
      </h1>
      <p v-if="datos" class="lede" data-enter style="margin-top: 14px">
        {{ plural(cuenta.residente, 'residente') }}, {{ plural(cuenta.mantenimiento, 'técnico') }} y
        {{ plural(cuenta.administrador, 'persona', 'personas') }} en administración.
      </p>

      <div class="split" style="margin-top: 32px">
        <div>
          <CargandoBloques v-if="cargando && !datos" texto="Cargando usuarios…" :cantidad="2" />
          <EstadoError v-else-if="error" :mensaje="error" @reintentar="recargar()" />
          <div v-else class="block is-white" data-enter>
            <div class="b-head">
              <span class="stud" aria-hidden="true"></span>
              <span class="tag">Directorio</span>
            </div>
            <div class="seg" role="group" aria-label="Qué cuentas ver" style="margin-bottom: 8px">
              <button type="button" :aria-pressed="!verInactivos" @click="verInactivos = false">Activas <span class="n">{{ usuarios.length }}</span></button>
              <button type="button" :aria-pressed="verInactivos" @click="verInactivos = true">Desactivadas <span class="n">{{ inactivos.length }}</span></button>
            </div>
            <p v-if="verInactivos && inactivos.length === 0" class="b-meta" style="padding: 12px 0">
              Nadie tiene la cuenta desactivada. Cuando alguien deje el edificio o el piloto, desactívalo desde "Gestionar".
            </p>
            <ul class="usuarios">
              <FilaUsuario
                v-for="u in lista"
                :key="u.id"
                :usuario="u"
                :activo="!verInactivos"
                :es-yo="u.id === session.usuario?.id"
                :color="COLOR_ROL[u.rol]"
                @cambio="alCambiar"
              />
            </ul>
          </div>
        </div>

        <form ref="form" class="block form-bloque" style="--c: var(--mbc-lav)" novalidate data-enter @submit.prevent="crear">
          <div class="b-head">
            <span class="stud" aria-hidden="true"></span>
            <span class="tag">Nuevo usuario</span>
          </div>
          <h2 class="t-h3">Suma a alguien del edificio.</h2>
          <p class="b-meta">Queda en {{ session.usuario?.edificioNombre }}. Entra con este correo y contraseña.</p>

          <div class="form-grid" style="margin-top: 16px">
            <div class="field">
              <div class="f-box">
                <input id="u-nombre" v-model="nombre" class="f-in" type="text" autocomplete="off" placeholder=" " :aria-invalid="errores.nombre ? 'true' : undefined" aria-describedby="u-nombre-err" @input="errores.nombre = ''" />
                <label for="u-nombre">Nombre y apellido</label>
                <span class="pour" aria-hidden="true"></span>
              </div>
              <p id="u-nombre-err" class="err">{{ errores.nombre }}</p>
            </div>
            <div class="field">
              <div class="f-box">
                <input id="u-email" v-model="email" class="f-in" type="email" inputmode="email" autocomplete="off" placeholder=" " :aria-invalid="errores.email ? 'true' : undefined" aria-describedby="u-email-err" @input="errores.email = ''" />
                <label for="u-email">Correo</label>
                <span class="pour" aria-hidden="true"></span>
              </div>
              <p id="u-email-err" class="err">{{ errores.email }}</p>
            </div>
            <div class="field">
              <div class="f-box">
                <input id="u-password" v-model="password" class="f-in mono" type="text" spellcheck="false" autocomplete="off" placeholder=" " :aria-invalid="errores.password ? 'true' : undefined" aria-describedby="u-password-err" @input="errores.password = ''" />
                <label for="u-password">Contraseña inicial</label>
                <span class="pour" aria-hidden="true"></span>
              </div>
              <p id="u-password-err" class="err">{{ errores.password }}</p>
              <p class="hint contador">
                <span>La persona la cambia al entrar, en "Mi cuenta".</span>
                <button class="btn ghost small" type="button" @click="password = generarClave(); errores.password = ''">Sugerir una</button>
              </p>
            </div>
            <fieldset class="chips">
              <legend>Rol</legend>
              <div class="chip-row">
                <label v-for="r in ORDEN" :key="r" class="chip">
                  <input v-model="rol" type="radio" name="rol" :value="r" />
                  <span>{{ textoRol[r] }}</span>
                </label>
              </div>
            </fieldset>
          </div>

          <p v-if="errorGeneral" class="err form-err" role="alert">{{ errorGeneral }}</p>
          <div class="b-actions">
            <button class="btn" type="submit" :disabled="enviando"><AppIcon name="plus" />{{ enviando ? 'Creando…' : 'Crear usuario' }}</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
