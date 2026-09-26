import { describe, expect, it } from 'vitest'
import { duracionHoras, fechaCorta, haceCuanto, hora, marcaTiempo } from '@/utils/fechas'
import { codigoIncidencia, plural, primerNombre, siguienteEstado, textoEstado, textoTipo } from '@/utils/textos'

describe('textos', () => {
  it('nunca muestra valores crudos del contrato', () => {
    expect(textoEstado.en_proceso).toBe('En proceso')
    expect(textoTipo.plomeria).toBe('Plomería')
  })

  it('solo permite avanzar hacia adelante', () => {
    expect(siguienteEstado.pendiente).toBe('en_proceso')
    expect(siguienteEstado.en_proceso).toBe('resuelto')
    expect(siguienteEstado.resuelto).toBeNull()
  })

  it('arma el código corto con los últimos 4 dígitos del id', () => {
    expect(codigoIncidencia('10000000-0000-4000-8000-000000000012')).toBe('INC-0012')
  })

  it('pluraliza y saca el primer nombre', () => {
    expect(plural(1, 'incidencia')).toBe('1 incidencia')
    expect(plural(3, 'incidencia')).toBe('3 incidencias')
    expect(plural(2, 'aviso nuevo', 'avisos nuevos')).toBe('2 avisos nuevos')
    expect(primerNombre('María Rojas')).toBe('María')
  })
})

describe('fechas (hora de Lima)', () => {
  // 14:30 UTC = 09:30 en Lima (UTC−5)
  const iso = '2026-10-05T14:30:00.000Z'

  it('formatea en hora de Lima', () => {
    expect(hora(iso)).toBe('09:30')
    expect(fechaCorta(iso)).toMatch(/^5 oct/)
  })

  it('marca HOY y AYER según el día en Lima', () => {
    const ahora = new Date('2026-10-05T20:00:00.000Z')
    expect(marcaTiempo(iso, ahora)).toBe('HOY 09:30')
    expect(marcaTiempo('2026-10-04T23:05:00.000Z', ahora)).toBe('AYER 18:05')
    // 03:00 UTC del 5 = 22:00 del 4 en Lima → AYER
    expect(marcaTiempo('2026-10-05T03:00:00.000Z', ahora)).toBe('AYER 22:00')
  })

  it('dice cuánto tiempo pasó', () => {
    const ahora = new Date('2026-10-05T15:00:00.000Z')
    expect(haceCuanto('2026-10-05T14:55:00.000Z', ahora)).toBe('hace 5 min')
    expect(haceCuanto('2026-10-05T12:00:00.000Z', ahora)).toBe('hace 3 h')
    expect(haceCuanto('2026-10-03T15:00:00.000Z', ahora)).toBe('hace 2 días')
  })

  it('muestra duraciones legibles (es-PE usa punto decimal)', () => {
    expect(duracionHoras(0.5)).toBe('30 min')
    expect(duracionHoras(5.25)).toBe('5.3 h')
    expect(duracionHoras(36)).toBe('36 h')
    expect(duracionHoras(60)).toBe('2.5 días')
  })
})
