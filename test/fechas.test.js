import { describe, it, expect } from 'vitest'
import { extraerFecha } from '../src/fechas.js'

const HOY = new Date(2026, 9, 20) // martes 20 de octubre de 2026

describe('fechas', () => {
  it('relativas', () => {
    expect(extraerFecha('mañana', HOY).fecha).toBe('2026-10-21')
    expect(extraerFecha('pasado mañana', HOY).fecha).toBe('2026-10-22')
    expect(extraerFecha('hoy', HOY).fecha).toBe('2026-10-20')
  })
  it('días de la semana', () => {
    expect(extraerFecha('el viernes', HOY).fecha).toBe('2026-10-23')
    expect(extraerFecha('el martes', HOY).fecha).toBe('2026-10-27')
    expect(extraerFecha('este finde', HOY).fecha).toBe('2026-10-24')
  })
  it('fechas concretas', () => {
    expect(extraerFecha('el 15 de noviembre', HOY).fecha).toBe('2026-11-15')
    expect(extraerFecha('el 3 de enero', HOY).fecha).toBe('2027-01-03')
    expect(extraerFecha('25/12', HOY).fecha).toBe('2026-12-25')
    expect(extraerFecha('el 2', HOY).fecha).toBe('2026-11-02')
  })
  it('horas', () => {
    expect(extraerFecha('mañana a las 9 de la noche', HOY)).toMatchObject({ fecha: '2026-10-21', hora: '21:00' })
    expect(extraerFecha('el viernes a las 10 de la mañana', HOY)).toMatchObject({ fecha: '2026-10-23', hora: '10:00' })
    expect(extraerFecha('el viernes a las 21:30', HOY).hora).toBe('21:30')
    expect(extraerFecha('a las 5', HOY).hora).toBe('17:00')
  })
  it('deja el título limpio', () => {
    expect(extraerFecha('cena con Marta el viernes a las 9 de la noche', HOY).resto).toBe('cena con Marta')
  })
  it('sin fecha', () => {
    expect(extraerFecha('comprar leche', HOY)).toBe(null)
  })
})
