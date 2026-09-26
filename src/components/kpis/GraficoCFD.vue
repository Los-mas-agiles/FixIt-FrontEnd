<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { CategoryScale, Chart, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip, type ChartOptions } from 'chart.js'
import type { PuntoCFD } from '@/types/models'
import { fechaCorta } from '@/utils/fechas'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const props = defineProps<{ puntos: PuntoCFD[] }>()

// Colores Block City: relleno pastel + trazo en la variante oscura (solo para trazos)
const SERIES = [
  { clave: 'resuelto', etiqueta: 'Resueltas', relleno: '#B8E8D0', trazo: '#5FAE88' },
  { clave: 'en_proceso', etiqueta: 'En proceso', relleno: '#BFE0F0', trazo: '#6AAAD0' },
  { clave: 'pendiente', etiqueta: 'Pendientes', relleno: '#F2C4A8', trazo: '#C98763' },
] as const

// 'YYYY-MM-DD' → "22 sep" (a mediodía UTC para no cruzar de día al pasar a hora de Lima)
const etiquetaDia = (f: string) => fechaCorta(`${f}T12:00:00Z`)

const data = computed(() => ({
  labels: props.puntos.map((p) => etiquetaDia(p.fecha)),
  datasets: SERIES.map((s, i) => ({
    label: s.etiqueta,
    data: props.puntos.map((p) => p[s.clave]),
    backgroundColor: s.relleno,
    borderColor: s.trazo,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 4,
    tension: 0.25,
    fill: i === 0 ? 'origin' : '-1',
  })),
}))

const MONO = "'JetBrains Mono', ui-monospace, monospace"
const options: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 700, easing: 'easeOutQuart' },
  interaction: { mode: 'index', intersect: false },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: MONO, size: 11 }, color: '#3F3F3F', maxRotation: 0, autoSkipPadding: 12 } },
    y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(44,44,44,.08)' }, ticks: { precision: 0, font: { family: MONO, size: 11 }, color: '#3F3F3F' } },
  },
  plugins: {
    legend: { position: 'bottom', reverse: true, labels: { font: { family: "'Space Grotesk', system-ui", size: 14 }, color: '#2C2C2C', boxWidth: 18, boxHeight: 12, useBorderRadius: true, borderRadius: 4 } },
    tooltip: { backgroundColor: '#2C2C2C', titleColor: '#F5E6A3', bodyColor: '#DCD3AE', titleFont: { family: MONO }, padding: 12, cornerRadius: 12, itemSort: (a, b) => b.datasetIndex - a.datasetIndex },
  },
}
</script>

<template>
  <div class="cfd">
    <div class="cfd-canvas" role="img" :aria-label="`Diagrama de flujo acumulado de ${puntos.length} días. La tabla con los datos está debajo.`">
      <Line :data="data" :options="options" />
    </div>
    <details class="cfd-tabla">
      <summary>Ver los datos como tabla</summary>
      <table>
        <thead>
          <tr><th scope="col">Día</th><th scope="col">Pendientes</th><th scope="col">En proceso</th><th scope="col">Resueltas</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in puntos" :key="p.fecha">
            <th scope="row">{{ etiquetaDia(p.fecha) }}</th><td>{{ p.pendiente }}</td><td>{{ p.en_proceso }}</td><td>{{ p.resuelto }}</td>
          </tr>
        </tbody>
      </table>
    </details>
  </div>
</template>
