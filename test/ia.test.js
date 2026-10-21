import { describe, it, expect, vi } from 'vitest'
vi.mock('../src/supabase.js', () => ({ supabase: {} }))
const { convertir, necesitaIA } = await import('../src/ia.js')
import { clasificar } from '../src/clasificador.js'

const vacia = { producto: null, cantidad: null, titulo: null, urgente: false, estancia: null, importe: null, categoria: null, concepto: null, enlace: null, precio_estimado: null, fecha: null, hora: null, tipo: null, comida: null, nota: null, seccion_sugerida: null }

describe('IA de Chispa', () => {
  it('solo pregunta a la IA cuando hace falta', () => {
    expect(necesitaIA(clasificar('comprar leche'))).toBe(false)
    expect(necesitaIA(clasificar('blablabla cosa rara'))).toBe(true)
  })
  it('convierte una compra con su pasillo', () => {
    const o = convertir({ ...vacia, seccion: 'compra', texto: 'leche', producto: 'leche', cantidad: '2 litros' })
    expect(o.campos).toEqual({ producto: 'Leche', cantidad: '2 litros', pasillo: expect.any(String) })
    expect(o.segura).toBe(true)
  })
  it('la agenda siempre se confirma y valida la fecha', () => {
    const o = convertir({ ...vacia, seccion: 'agenda', texto: 'cumple de Ana el 3', titulo: 'cumple de Ana', fecha: '2026-11-03', hora: 'luego', tipo: 'cumpleanos' })
    expect(o.campos).toMatchObject({ titulo: 'Cumple de Ana', fecha: '2026-11-03', hora: null, anual: true })
    expect(o.segura).toBe(false)
  })
  it('menú con fecha se guarda solo', () => {
    const o = convertir({ ...vacia, seccion: 'menu', texto: 'el lunes cenamos lentejas', fecha: '2026-10-26', comida: 'cena', nota: 'lentejas' })
    expect(o.campos).toEqual({ fecha: '2026-10-26', comida: 'cena', texto: 'Lentejas' })
    expect(o.segura).toBe(true)
  })
})
