import { describe, expect, it } from 'vitest'
import { generarClave } from '@/utils/claves'

describe('contraseña temporal', () => {
  it('tiene 3 grupos de 4 sin caracteres que se confunden', () => {
    for (let i = 0; i < 50; i++) {
      const c = generarClave()
      expect(c).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/)
      expect(c).not.toMatch(/[01ilo]/)
      expect(c.length).toBeGreaterThanOrEqual(8) // mínimo del contrato
    }
  })

  it('no se repite', () => {
    expect(new Set(Array.from({ length: 100 }, generarClave)).size).toBe(100)
  })
})
