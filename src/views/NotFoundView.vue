<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import AppIcon from '@/components/ui/AppIcon.vue'

const session = useSessionStore()
const destino = computed(() => (session.autenticado ? '/' : '/login'))
</script>

<template>
  <section class="plano" data-cursor="nivel" aria-labelledby="h1">
    <div class="plano-grid" aria-hidden="true"></div>
    <div class="wrap vista no-encontrado">
      <p class="eyebrow">Error 404</p>
      <h1 id="h1" class="t-hero" tabindex="-1">Este piso todavía no se construye.</h1>
      <p class="lede" style="margin-top: 16px">La dirección que abriste no existe en FixIt. Puede que el enlace esté incompleto.</p>
      <div style="margin-top: 28px">
        <RouterLink class="btn" :to="destino"><AppIcon name="home" />{{ session.autenticado ? 'Ir a mi inicio' : 'Ir a entrar' }}</RouterLink>
      </div>
    </div>
  </section>
</template>
