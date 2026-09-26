<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { primerNombre, textoRol } from '@/utils/textos'
import marca from '@/assets/marca.svg'
import AppIcon from '@/components/ui/AppIcon.vue'
import CampanitaNotificaciones from './CampanitaNotificaciones.vue'

const session = useSessionStore()
const router = useRouter()

async function salir() {
  session.logout()
  await router.push({ name: 'login' })
}
</script>

<!-- Header (no sticky): marca · edificio · usuario. -->
<template>
  <header class="wrap app-header">
    <RouterLink to="/" class="marca" aria-label="FixIt, ir al inicio">
      <img :src="marca" width="40" height="40" alt="" />
      <span class="marca-t">FixIt</span>
    </RouterLink>
    <p v-if="session.usuario" class="edificio">{{ session.usuario.edificioNombre }}</p>

    <div v-if="session.usuario" class="header-der">
      <CampanitaNotificaciones />
      <p class="quien">
        <span class="quien-n">{{ primerNombre(session.usuario.nombre) }}</span>
        <span class="quien-r">{{ textoRol[session.usuario.rol] }}</span>
      </p>
      <button class="btn ghost small salir" type="button" @click="salir">
        <AppIcon name="exit" /><span class="salir-t">Salir</span>
      </button>
    </div>
  </header>
</template>
