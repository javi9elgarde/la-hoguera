import { describe, it, expect } from 'vitest'
import { clasificar, extraerImporte } from '../src/clasificador.js'

const uno = (f) => { const r = clasificar(f); expect(r).toHaveLength(1); return r[0] }

describe('clasificador', () => {
  it('compra simple', () => {
    const o = uno('Comprar leche')
    expect(o.seccion).toBe('compra')
    expect(o.campos.producto).toBe('Leche')
    expect(o.campos.pasillo).toBe('lacteos')
    expect(o.segura).toBe(true)
  })
  it('producto suelto sin verbo', () => {
    expect(uno('pan').seccion).toBe('compra')
  })
  it('varios productos heredan la sección', () => {
    const r = clasificar('compra leche, huevos y pasta de dientes')
    expect(r.map((o) => o.seccion)).toEqual(['compra', 'compra', 'compra'])
    expect(r.map((o) => o.campos.producto)).toEqual(['Leche', 'Huevos', 'Pasta de dientes'])
    expect(r[2].campos.pasillo).toBe('higiene')
  })
  it('se ha acabado el champú', () => {
    const o = uno('se ha acabado el champú')
    expect(o.seccion).toBe('compra')
    expect(o.campos.producto).toBe('Champú')
  })
  it('cantidad', () => {
    const o = uno('comprar 2 litros de leche')
    expect(o.campos).toMatchObject({ producto: 'Leche', cantidad: '2 litros' })
  })
  it('arreglo urgente pide confirmación', () => {
    const o = uno('Arreglar radiador del salón, es urgente')
    expect(o.seccion).toBe('arreglos')
    expect(o.campos.prioridad).toBe('urgente')
    expect(o.campos.estancia).toBe('Salón')
    expect(o.campos.titulo).toBe('Arreglar radiador del salón')
    expect(o.segura).toBe(false)
  })
  it('arreglo normal', () => {
    const o = uno('el grifo de la cocina gotea')
    expect(o).toMatchObject({ seccion: 'arreglos', segura: true })
    expect(o.campos.prioridad).toBe('normal')
  })
  it('gasto con importe', () => {
    const o = uno('He echado 50 € de gasolina')
    expect(o.seccion).toBe('gastos')
    expect(o.campos).toMatchObject({ importe: 50, categoria: 'coche' })
    expect(o.segura).toBe(false)
  })
  it('gasto en super con coma decimal', () => {
    const o = uno('he pagado 63,40 euros en el Mercadona')
    expect(o.campos).toMatchObject({ importe: 63.4, categoria: 'comida' })
  })
  it('frase mixta', () => {
    const r = clasificar('compra vino y llama al fontanero')
    expect(r.map((o) => o.seccion)).toEqual(['compra', 'arreglos'])
  })
  it('secciones futuras van a la bandeja', () => {
    const o = uno('pasar la ITV')
    expect(o).toMatchObject({ seccion: 'bandeja', sugerida: 'coche' })
  })
  it('cumpleaños va a la agenda y se repite', () => {
    const o = uno('el sábado es el cumpleaños de Marta')
    expect(o.seccion).toBe('agenda')
    expect(o.campos).toMatchObject({ tipo: 'cumpleanos', anual: true })
    expect(new Date(o.campos.fecha + 'T12:00').getDay()).toBe(6)
    expect(o.campos.titulo).toBe('Cumpleaños de Marta')
  })
  it('plan con varias personas no se parte', () => {
    const r = clasificar('el sábado cena con Marta y Luis, y compra vino')
    expect(r.map((o) => o.seccion)).toEqual(['agenda', 'compra'])
    expect(r[0].campos.titulo).toBe('Cena con Marta y Luis')
  })
  it('cosas frente a súper', () => {
    expect(uno('comprar un HDMI').seccion).toBe('cosas')
    expect(uno('comprar lámpara para el salón').campos.titulo).toBe('Lámpara para el salón')
    expect(uno('comprar panko').seccion).toBe('compra')
    expect(uno('la nevera no funciona').seccion).toBe('arreglos')
  })
  it('menú de la semana', () => {
    const o = uno('el lunes cenamos lentejas')
    expect(o.seccion).toBe('menu')
    expect(o.campos).toMatchObject({ comida: 'cena', texto: 'Lentejas' })
    expect(new Date(o.campos.fecha + 'T12:00').getDay()).toBe(1)
  })
  it('notas para la pareja', () => {
    const o = uno('dile que te quiero mucho')
    expect(o.seccion).toBe('notas')
    expect(o.campos.texto).toBe('Te quiero mucho')
  })
  it('receta nueva', () => {
    expect(uno('receta de tortilla de patatas').campos.titulo).toBe('Tortilla de patatas')
  })
  it('sin pistas no adivina', () => {
    expect(uno('blablá').seccion).toBe(null)
  })
  it('importes', () => {
    expect(extraerImporte('20 pavos')).toBe(20)
    expect(extraerImporte('€12')).toBe(12)
    expect(extraerImporte('nada')).toBe(null)
  })
})
