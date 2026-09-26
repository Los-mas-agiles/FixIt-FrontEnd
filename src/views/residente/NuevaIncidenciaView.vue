<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import imageCompression from 'browser-image-compression'
import * as incidenciasApi from '@/api/incidencias'
import { mensajeDeError } from '@/api/client'
import { toast } from '@/composables/useToast'
import { useEntrada } from '@/composables/useEntrada'
import { textoPrioridad, textoTipo } from '@/utils/textos'
import AppIcon from '@/components/ui/AppIcon.vue'

const MIN = 10
const MAX = 1000

const router = useRouter()
const raiz = ref<HTMLElement | null>(null)
useEntrada(raiz)

const descripcion = ref('')
const errorDescripcion = ref('')
const errorFoto = ref('')
const errorGeneral = ref('')
const enviando = ref(false)
const comprimiendo = ref(false)
const foto = ref<Blob | null>(null)
const vistaPrevia = ref<string | null>(null)
const campoDescripcion = ref<HTMLTextAreaElement | null>(null)
const inputFoto = ref<HTMLInputElement | null>(null)

const largo = computed(() => descripcion.value.trim().length)

function limpiarVistaPrevia() {
  if (vistaPrevia.value) URL.revokeObjectURL(vistaPrevia.value)
  vistaPrevia.value = null
}
onBeforeUnmount(limpiarVistaPrevia)

async function elegirFoto(e: Event) {
  const archivo = (e.target as HTMLInputElement).files?.[0]
  errorFoto.value = ''
  if (!archivo) return
  if (!archivo.type.startsWith('image/')) {
    errorFoto.value = 'Ese archivo no es una imagen. Elige una foto JPG, PNG o WebP.'
    return
  }
  comprimiendo.value = true
  try {
    // Máx. ~1 MB y 1600 px: Vercel rechaza cuerpos de más de 4,5 MB
    const comprimida = await imageCompression(archivo, { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true, fileType: 'image/jpeg' })
    foto.value = new File([comprimida], 'foto.jpg', { type: 'image/jpeg' })
    limpiarVistaPrevia()
    vistaPrevia.value = URL.createObjectURL(foto.value)
  } catch {
    errorFoto.value = 'No pudimos leer esa foto. Prueba con otra o toma una nueva.'
  } finally {
    comprimiendo.value = false
    if (inputFoto.value) inputFoto.value.value = ''
  }
}

function quitarFoto() {
  foto.value = null
  limpiarVistaPrevia()
}

async function enviar() {
  errorGeneral.value = ''
  if (largo.value < MIN) {
    errorDescripcion.value = `Cuéntanos un poco más (mínimo ${MIN} caracteres): qué pasa y dónde.`
    campoDescripcion.value?.focus()
    return
  }
  if (enviando.value || comprimiendo.value) return
  enviando.value = true
  try {
    const inc = await incidenciasApi.crear(descripcion.value.trim(), foto.value)
    toast(
      'Reporte enviado',
      inc.clasificadoPor === 'fallback'
        ? 'La IA no respondió a tiempo: administración revisará el tipo y la prioridad.'
        : `Quedó como ${textoTipo[inc.tipo]}, prioridad ${textoPrioridad[inc.prioridad].toLowerCase()}. Mantenimiento ya la ve.`,
    )
    await router.push({ name: 'incidencia', params: { id: inc.id } })
  } catch (e) {
    errorGeneral.value = mensajeDeError(e)
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <section ref="raiz" class="plano" data-cursor="nivel" aria-labelledby="h1">
    <div class="plano-grid" aria-hidden="true"></div>
    <div class="wrap vista">
      <div class="split">
        <div>
          <p class="eyebrow" data-enter>Nueva incidencia</p>
          <h1 id="h1" class="t-h1" tabindex="-1" data-enter>Cuéntanos qué se malogró.</h1>
          <p class="lede" data-enter style="margin-top: 14px">
            Con una frase clara basta. La IA le pone tipo y prioridad, y mantenimiento la ve en su tablero al instante.
          </p>
          <div class="block is-white consejos" data-enter>
            <div class="b-head">
              <span class="stud" aria-hidden="true"></span>
              <span class="tag">Para que llegue rápido</span>
            </div>
            <ul class="consejos-lista">
              <li><AppIcon name="check" /><span><strong>Qué pasa:</strong> "gotea el caño", "no prende la luz".</span></li>
              <li><AppIcon name="check" /><span><strong>Dónde:</strong> piso, depto o área común (escalera, sótano, lavandería).</span></li>
              <li><AppIcon name="check" /><span><strong>Si hay riesgo</strong> (agua, olor a quemado, alguien atrapado), dilo: sube la prioridad.</span></li>
            </ul>
          </div>
        </div>

        <form class="block form-bloque" style="--c: var(--mbc-lav)" novalidate data-enter @submit.prevent="enviar">
          <div class="b-head">
            <span class="stud" aria-hidden="true"></span>
            <span class="tag">Nueva incidencia</span>
          </div>

          <div class="form-grid">
            <div class="field">
              <div class="f-box">
                <textarea
                  id="descripcion"
                  ref="campoDescripcion"
                  v-model="descripcion"
                  class="f-in"
                  placeholder=" "
                  :maxlength="MAX"
                  rows="5"
                  :aria-invalid="errorDescripcion ? 'true' : undefined"
                  aria-describedby="descripcion-hint descripcion-err"
                  @input="errorDescripcion = ''"
                ></textarea>
                <label for="descripcion">¿Qué pasa y dónde?</label>
                <span class="pour" aria-hidden="true"></span>
              </div>
              <p id="descripcion-hint" class="hint contador">
                <span>Ej.: "Gotea el caño del lavadero del piso 3".</span>
                <span class="mono" :class="{ 'contador-ok': largo >= MIN }">{{ largo }} / {{ MAX }}</span>
              </p>
              <p id="descripcion-err" class="err">{{ errorDescripcion }}</p>
            </div>

            <div class="foto-campo">
              <p class="foto-label">Foto <span class="muted">(opcional)</span></p>
              <div v-if="vistaPrevia" class="foto-preview">
                <img :src="vistaPrevia" alt="Vista previa de la foto que vas a enviar" />
                <button class="btn ghost small" type="button" @click="quitarFoto"><AppIcon name="x" />Quitar foto</button>
              </div>
              <!-- Sin "capture": en algunos Android obliga a usar la cámara; así se elige cámara o galería -->
              <label v-else class="foto-pick" :class="{ 'is-busy': comprimiendo }">
                <input ref="inputFoto" class="sr" type="file" accept="image/*" aria-describedby="foto-err" @change="elegirFoto" />
                <AppIcon name="camera" />
                <span>{{ comprimiendo ? 'Preparando la foto…' : 'Tomar o elegir una foto' }}</span>
              </label>
              <p id="foto-err" class="err">{{ errorFoto }}</p>
            </div>
          </div>

          <p v-if="errorGeneral" class="err form-err" role="alert">{{ errorGeneral }}</p>
          <p class="sr" aria-live="polite">{{ enviando ? 'Enviando y clasificando tu reporte.' : '' }}</p>

          <div class="b-actions">
            <button class="btn" type="submit" :disabled="enviando || comprimiendo">
              <AppIcon :name="enviando ? 'spark' : 'arrow'" />{{ enviando ? 'Enviando y clasificando…' : 'Enviar reporte' }}
            </button>
            <p v-if="enviando" class="small muted">Tarda unos segundos: la IA lo está leyendo.</p>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
