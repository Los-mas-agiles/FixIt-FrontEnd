<script setup lang="ts">
import { computed, nextTick, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { toast } from '@/composables/useToast'
import { cursor } from '@/lib/blockCity'
import IconSprite from '@/components/ui/IconSprite.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import NavegacionRol from '@/components/layout/NavegacionRol.vue'
import ObraFondo from '@/components/layout/ObraFondo.vue'

const session = useSessionStore()
const route = useRoute()
const router = useRouter()

const conSesion = computed(() => session.autenticado && !route.meta.publica)

// Token vencido (401) en cualquier pantalla → al login con aviso
watch(
  () => session.usuario,
  (u) => {
    if (!u && !route.meta.publica) {
      if (session.motivoCierre) toast('Sesión cerrada', session.motivoCierre)
      router.replace({ name: 'login' })
    }
  },
)

// Al cambiar de vista, el foco va al h1 (patrón de accesibilidad de Block City)
let primera = true
router.afterEach(() => {
  if (primera) { primera = false; return }
  nextTick(() => document.querySelector<HTMLElement>('main h1[tabindex="-1"]')?.focus({ preventScroll: true }))
})

// La barra inferior del móvil reserva espacio solo cuando existe
watch(conSesion, (v) => document.body.classList.toggle('has-dock', v), { immediate: true })

onMounted(() => cursor.init())
</script>

<template>
  <IconSprite />
  <ObraFondo />
  <a class="skip" href="#main">Saltar al contenido</a>

  <div class="app">
    <AppHeader v-if="conSesion" />
    <NavegacionRol v-if="conSesion" />
    <main id="main">
      <RouterView />
    </main>
  </div>

  <ToastHost />
</template>
