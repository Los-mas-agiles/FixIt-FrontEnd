/** Contraseña temporal legible: 3 grupos de 4, sin caracteres que se confunden (0/o, 1/l/i). Ej.: "k7mq-p3xa-9dwe". */
export function generarClave() {
  const letras = 'abcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  const s = [...bytes].map((b) => letras[b % letras.length]).join('')
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`
}
