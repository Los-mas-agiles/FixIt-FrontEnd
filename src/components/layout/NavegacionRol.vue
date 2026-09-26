<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import type { RolUsuario } from '@/types/models'
import AppIcon from '@/components/ui/AppIcon.vue'

interface Pieza {
  to: string
  largo: string
  corto: string // ≤ 9 caracteres para móvil
  icono: string
  color: string // cada sección tiene su pastel fijo
  activaEn: string[]
}

const PIEZAS: Record<RolUsuario, Pieza[]> = {
  residente: [
    { to: '/mis-incidencias', largo: 'Mis incidencias', corto: 'Inicio', icono: 'home', color: 'var(--mbc-brick)', activaEn: ['mis-incidencias', 'incidencia'] },
    { to: '/nueva', largo: 'Reportar incidencia', corto: 'Reportar', icono: 'plus', color: 'var(--mbc-lav)', activaEn: ['nueva'] },
  ],
  mantenimiento: [
    { to: '/tablero', largo: 'Tablero', corto: 'Tablero', icono: 'board', color: 'var(--mbc-sky)', activaEn: ['tablero', 'incidencia'] },
  ],
  administrador: [
    { to: '/tablero', largo: 'Tablero', corto: 'Tablero', icono: 'board', color: 'var(--mbc-sky)', activaEn: ['tablero', 'incidencia'] },
    { to: '/panel', largo: 'Panel de indicadores', corto: 'Panel', icono: 'chart', color: 'var(--mbc-mint)', activaEn: ['panel'] },
    { to: '/usuarios', largo: 'Usuarios', corto: 'Usuarios', icono: 'people', color: 'var(--mbc-peach)', activaEn: ['usuarios'] },
  ],
}

const session = useSessionStore()
const route = useRoute()
const piezas = computed(() => (session.rol ? PIEZAS[session.rol] : []))
const activa = (p: Pieza) => p.activaEn.includes(String(route.name))
</script>

<!-- Navegación por piezas: arriba (sticky) en escritorio, barra inferior fija en móvil.
     Con una sola sección (mantenimiento) no se muestra. -->
<template>
  <nav v-if="piezas.length > 1" class="dock" aria-label="Secciones">
    <div class="wrap">
      <ul :style="{ '--n': piezas.length }">
        <li v-for="p in piezas" :key="p.to">
          <RouterLink class="tab" :to="p.to" :aria-current="activa(p) ? 'page' : undefined" :style="{ '--c': p.color }">
            <AppIcon :name="p.icono" />
            <span class="l-long">{{ p.largo }}</span><span class="l-short">{{ p.corto }}</span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </nav>
</template>
