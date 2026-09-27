<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import * as authApi from '@/api/auth'
import { mensajeDeError } from '@/api/client'
import { toast } from '@/composables/useToast'
import { useEntrada } from '@/composables/useEntrada'
import { useSessionStore } from '@/stores/session'
import { primerNombre, textoRol } from '@/utils/textos'
import AppIcon from '@/components/ui/AppIcon.vue'
import ActivarAvisos from '@/components/layout/ActivarAvisos.vue'

const MIN = 8

const session = useSessionStore()
const router = useRouter()
const raiz = ref<HTMLElement | null>(null)
useEntrada(raiz)

const actual = ref('')
const nueva = ref('')
const repetir = ref('')
const errores = ref<{ actual?: string; nueva?: string; repetir?: string }>({})
const errorGeneral = ref('')
const enviando = ref(false)
const form = ref<HTMLFormElement | null>(null)

function enfocarPrimerError() {
  const primero = (['actual', 'nueva', 'repetir'] as const).find((k) => errores.value[k])
  if (primero) form.value?.querySelector<HTMLInputElement>(`#c-${primero}`)?.focus()
}

function validar() {
  const e: typeof errores.value = {}
  if (!actual.value) e.actual = 'Escribe tu contraseña actual (la temporal, si te dieron una).'
  if (nueva.value.length < MIN) e.nueva = `Mínimo ${MIN} caracteres. Una frase corta es fácil de recordar.`
  else if (nueva.value === actual.value) e.nueva = 'Tiene que ser distinta de la actual.'
  if (!e.nueva && repetir.value !== nueva.value) e.repetir = 'No coincide con la nueva contraseña.'
  errores.value = e
  enfocarPrimerError()
  return Object.keys(e).length === 0
}

async function cambiar() {
  errorGeneral.value = ''
  if (!validar() || enviando.value) return
  enviando.value = true
  try {
    await authApi.cambiarPassword(actual.value, nueva.value)
    toast('Contraseña cambiada', 'La próxima vez entra con la nueva. Tu sesión sigue abierta.')
    actual.value = ''
    nueva.value = ''
    repetir.value = ''
  } catch (e) {
    // "La contraseña actual no es correcta" llega como 400: se marca el campo, la sesión sigue abierta
    const msg = mensajeDeError(e)
    if (/actual/i.test(msg)) {
      errores.value = { actual: msg }
      enfocarPrimerError()
    } else {
      errorGeneral.value = msg
    }
  } finally {
    enviando.value = false
  }
}

async function salir() {
  session.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <section ref="raiz" class="plano" aria-labelledby="h1">
    <div class="plano-grid" aria-hidden="true"></div>
    <div v-if="session.usuario" class="wrap vista">
      <p class="eyebrow" data-enter>Tu cuenta · {{ session.usuario.edificioNombre }}</p>
      <h1 id="h1" class="t-h1" tabindex="-1" data-enter>Hola, {{ primerNombre(session.usuario.nombre) }}.</h1>
      <p class="lede" data-enter style="margin-top: 14px">
        Si te dieron una contraseña temporal, cámbiala aquí por una que solo tú conozcas.
      </p>

      <div class="split" style="margin-top: 32px">
        <form ref="form" class="block form-bloque" style="--c: var(--mbc-lav)" novalidate data-enter @submit.prevent="cambiar">
          <div class="b-head">
            <span class="stud" aria-hidden="true"></span>
            <span class="tag">Contraseña</span>
          </div>
          <h2 class="t-h3">Cambia tu contraseña.</h2>
          <p class="b-meta">Mínimo {{ MIN }} caracteres y distinta de la actual.</p>

          <div class="form-grid" style="margin-top: 16px">
            <div class="field">
              <div class="f-box">
                <input id="c-actual" v-model="actual" class="f-in" type="password" autocomplete="current-password" placeholder=" " :aria-invalid="errores.actual ? 'true' : undefined" aria-describedby="c-actual-err" @input="errores.actual = undefined" />
                <label for="c-actual">Contraseña actual</label>
                <span class="pour" aria-hidden="true"></span>
              </div>
              <p id="c-actual-err" class="err">{{ errores.actual }}</p>
            </div>
            <div class="field">
              <div class="f-box">
                <input id="c-nueva" v-model="nueva" class="f-in" type="password" autocomplete="new-password" placeholder=" " :aria-invalid="errores.nueva ? 'true' : undefined" aria-describedby="c-nueva-err" @input="errores.nueva = undefined" />
                <label for="c-nueva">Nueva contraseña</label>
                <span class="pour" aria-hidden="true"></span>
              </div>
              <p id="c-nueva-err" class="err">{{ errores.nueva }}</p>
            </div>
            <div class="field">
              <div class="f-box">
                <input id="c-repetir" v-model="repetir" class="f-in" type="password" autocomplete="new-password" placeholder=" " :aria-invalid="errores.repetir ? 'true' : undefined" aria-describedby="c-repetir-err" @input="errores.repetir = undefined" />
                <label for="c-repetir">Repite la nueva</label>
                <span class="pour" aria-hidden="true"></span>
              </div>
              <p id="c-repetir-err" class="err">{{ errores.repetir }}</p>
            </div>
          </div>

          <p v-if="errorGeneral" class="err form-err" role="alert">{{ errorGeneral }}</p>
          <div class="b-actions">
            <button class="btn" type="submit" :disabled="enviando"><AppIcon name="check" />{{ enviando ? 'Guardando…' : 'Cambiar contraseña' }}</button>
          </div>
        </form>

        <div class="stack-aside">
          <div class="block is-white" data-enter>
            <div class="b-head">
              <span class="stud" aria-hidden="true"></span>
              <span class="tag">Tus datos</span>
            </div>
            <dl class="datos">
              <div><dt>Nombre</dt><dd>{{ session.usuario.nombre }}</dd></div>
              <div><dt>Correo</dt><dd class="mono">{{ session.usuario.email }}</dd></div>
              <div><dt>Rol</dt><dd>{{ textoRol[session.usuario.rol] }}</dd></div>
              <div><dt>Edificio</dt><dd>{{ session.usuario.edificioNombre }}</dd></div>
            </dl>
            <p class="hint" style="margin-top: 14px">¿Algún dato está mal? Pídele a administración que lo corrija.</p>
          </div>

          <div class="block is-white" data-enter>
            <div class="b-head">
              <span class="stud" aria-hidden="true"></span>
              <span class="tag">Avisos</span>
            </div>
            <h2 class="b-title">Avisos en este equipo</h2>
            <ActivarAvisos />
          </div>

          <div data-enter>
            <button class="btn ghost" type="button" @click="salir"><AppIcon name="exit" />Salir de FixIt</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
