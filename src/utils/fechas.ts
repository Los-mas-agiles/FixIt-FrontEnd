// Todas las fechas de la API vienen en ISO UTC; se muestran en hora de Lima.
const ZONA = 'America/Lima'
const LOCALE = 'es-PE'

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE, { timeZone: ZONA, ...o })
const fCorta = fmt({ day: 'numeric', month: 'short' })
const fHora = fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const fDia = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' })
const fFrase = fmt({ weekday: 'long', day: 'numeric', month: 'long' })
const fCompleta = fmt({ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** "22 sep" */
export const fechaCorta = (iso: string) => fCorta.format(new Date(iso)).replace('.', '')

/** "09:30" */
export const hora = (iso: string) => fHora.format(new Date(iso))

/** "jueves 1 de octubre" */
export const fechaFrase = (iso: string) => fFrase.format(new Date(iso)).replace(',', '')

/** "05/10/2026 09:30" */
export const fechaHora = (iso: string) => fCompleta.format(new Date(iso)).replace(',', '')

/** Clave de día en Lima: "25/09/2026" (para comparar hoy/ayer). */
const claveDia = (d: Date) => fDia.format(d)

/** "HOY 09:12", "AYER 18:05" o "22 SEP 18:05" (bitácora). */
export function marcaTiempo(iso: string, ahora = new Date()) {
  const d = new Date(iso)
  const ayer = new Date(ahora.getTime() - 86_400_000)
  if (claveDia(d) === claveDia(ahora)) return `HOY ${hora(iso)}`
  if (claveDia(d) === claveDia(ayer)) return `AYER ${hora(iso)}`
  return `${fechaCorta(iso).toUpperCase()} ${hora(iso)}`
}

/** Cuánto tiempo pasó: "hace 5 min", "hace 3 h", "hace 2 días". */
export function haceCuanto(iso: string, ahora = new Date()) {
  const min = Math.max(0, Math.round((ahora.getTime() - new Date(iso).getTime()) / 60_000))
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`
}

/** Duración legible de un número de horas: "36 h", "2.5 días", "45 min" (es-PE usa punto decimal). */
export function duracionHoras(horas: number) {
  if (horas < 1) return `${Math.round(horas * 60)} min`
  if (horas < 48) return `${formatoNumero(horas, horas < 10 ? 1 : 0)} h`
  return `${formatoNumero(horas / 24, 1)} días`
}

export const formatoNumero = (n: number, decimales = 0) =>
  new Intl.NumberFormat(LOCALE, { maximumFractionDigits: decimales, minimumFractionDigits: 0 }).format(n)
