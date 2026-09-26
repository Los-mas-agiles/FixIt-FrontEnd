<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { inicioPorRol, useSessionStore } from '@/stores/session'
import { useObraStore } from '@/stores/obra'
import { mensajeDeError } from '@/api/client'
import { useEntrada } from '@/composables/useEntrada'
import marca from '@/assets/marca.svg'
import AppIcon from '@/components/ui/AppIcon.vue'

const session = useSessionStore()
const router = useRouter()
const route = useRoute()
useObraStore().progreso = 0.55

const email = ref('')
const password = ref('')
const errorEmail = ref('')
const errorPassword = ref('')
const errorGeneral = ref(session.motivoCierre ?? '')
const enviando = ref(false)
const campoEmail = ref<HTMLInputElement | null>(null)
const campoPassword = ref<HTMLInputElement | null>(null)

const raiz = ref<HTMLElement | null>(null)
useEntrada(raiz)

function validar() {
  errorEmail.value = /^\S+@\S+\.\S+$/.test(email.value.trim()) ? '' : 'Escribe tu correo completo, por ejemplo nombre@olivos.demo.'
  errorPassword.value = password.value ? '' : 'Escribe tu contraseña.'
  if (errorEmail.value) campoEmail.value?.focus()
  else if (errorPassword.value) campoPassword.value?.focus()
  return !errorEmail.value && !errorPassword.value
}

async function entrar() {
  errorGeneral.value = ''
  if (!validar() || enviando.value) return
  enviando.value = true
  try {
    const u = await session.login(email.value.trim(), password.value)
    const destino = typeof route.query.redirigir === 'string' && route.query.redirigir.startsWith('/') ? route.query.redirigir : inicioPorRol(u.rol)
    await router.replace(destino)
  } catch (e) {
    errorGeneral.value = mensajeDeError(e)
    campoPassword.value?.select()
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <section ref="raiz" class="plano login" data-cursor="nivel" aria-labelledby="h1">
    <div class="plano-grid" aria-hidden="true"></div>
    <div class="wrap login-wrap">
      <div class="split">
        <div class="login-intro">
          <p class="marca login-marca" data-enter>
            <img :src="marca" width="44" height="44" alt="" />
            <span class="marca-t">FixIt</span>
          </p>
          <p class="eyebrow" data-enter>Mantenimiento del edificio</p>
          <h1 id="h1" class="t-hero" tabindex="-1" data-enter>Lo que se malogra, se arregla entre todos.</h1>
          <p class="lede" data-enter style="margin-top: 18px">
            Reporta una fuga, una luz quemada o un ascensor detenido con una foto. Mantenimiento lo toma, y tú ves cada
            paso hasta que queda resuelto.
          </p>
          <ul class="login-pasos" data-enter>
            <li><span class="tag" style="background: var(--mbc-peach)">Pendiente</span></li>
            <li aria-hidden="true"><AppIcon name="arrow" /></li>
            <li><span class="tag" style="background: var(--mbc-sky)">En proceso</span></li>
            <li aria-hidden="true"><AppIcon name="arrow" /></li>
            <li><span class="tag" style="background: var(--mbc-mint)">Resuelta</span></li>
          </ul>
        </div>

        <form class="block form-bloque" style="--c: var(--mbc-lav)" novalidate data-enter @submit.prevent="entrar">
          <div class="b-head">
            <span class="stud" aria-hidden="true"></span>
            <span class="tag">Entrar</span>
          </div>
          <h2 class="t-h3">Entra con tu cuenta del edificio.</h2>
          <p class="b-meta">La administración te da el correo y la contraseña.</p>

          <div class="form-grid" style="margin-top: 18px">
            <div class="field">
              <div class="f-box">
                <input
                  id="email"
                  ref="campoEmail"
                  v-model="email"
                  class="f-in"
                  type="email"
                  inputmode="email"
                  autocomplete="username"
                  placeholder=" "
                  :aria-invalid="errorEmail ? 'true' : undefined"
                  aria-describedby="email-err"
                  @input="errorEmail = ''"
                />
                <label for="email">Correo</label>
                <span class="pour" aria-hidden="true"></span>
              </div>
              <p id="email-err" class="err">{{ errorEmail }}</p>
            </div>

            <div class="field">
              <div class="f-box">
                <input
                  id="password"
                  ref="campoPassword"
                  v-model="password"
                  class="f-in"
                  type="password"
                  autocomplete="current-password"
                  placeholder=" "
                  :aria-invalid="errorPassword ? 'true' : undefined"
                  aria-describedby="password-err"
                  @input="errorPassword = ''"
                />
                <label for="password">Contraseña</label>
                <span class="pour" aria-hidden="true"></span>
              </div>
              <p id="password-err" class="err">{{ errorPassword }}</p>
            </div>
          </div>

          <p v-if="errorGeneral" class="err form-err" role="alert">{{ errorGeneral }}</p>

          <div class="b-actions">
            <button class="btn" type="submit" :disabled="enviando">
              <AppIcon name="arrow" />{{ enviando ? 'Entrando…' : 'Entrar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
