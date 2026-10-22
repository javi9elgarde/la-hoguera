import { supabase } from './supabase.js'
import { esSegura, pasilloPara } from './clasificador.js'
import { hoyISO, DIAS } from './fechas.js'

// Solo se pregunta a la IA cuando las palabras clave no han sabido qué hacer con algo
export function necesitaIA(ordenes) {
  if (!ordenes.length) return true
  return ordenes.some((o) =>
    !o.seccion ||
    o.seccion === 'bandeja' ||
    ((o.seccion === 'agenda' || o.seccion === 'menu') && !o.campos.fecha) ||
    (o.seccion === 'gastos' && !(o.campos.importe > 0)))
}

const mayuscula = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const fechaValida = (f) => (/^\d{4}-\d{2}-\d{2}$/.test(f || '') ? f : null)
const horaValida = (h) => (/^\d{2}:\d{2}$/.test(h || '') ? h : null)

// Pasa la respuesta de la IA al mismo formato que usa el clasificador de palabras clave
export function convertir(o) {
  const t = o.texto || o.titulo || o.nota || o.producto || ''
  let orden
  switch (o.seccion) {
    case 'compra':
      orden = { campos: { producto: mayuscula(o.producto || t), cantidad: o.cantidad || null, pasillo: pasilloPara(o.producto || t) } }
      break
    case 'cosas':
      orden = { campos: { titulo: mayuscula(o.titulo || t), enlace: o.enlace || null, precio_estimado: o.precio_estimado ?? null } }
      break
    case 'arreglos':
      orden = { urgente: o.urgente, campos: { titulo: mayuscula(o.titulo || t), prioridad: o.urgente ? 'urgente' : 'normal', estancia: o.estancia || null } }
      break
    case 'gastos':
      orden = { importe: o.importe, campos: { importe: o.importe, categoria: o.categoria || 'otros', concepto: o.concepto || null } }
      break
    case 'agenda': {
      const tipo = o.tipo || 'plan'
      orden = { conFecha: Boolean(fechaValida(o.fecha)), campos: { titulo: mayuscula(o.titulo || t), fecha: fechaValida(o.fecha), hora: horaValida(o.hora), tipo, anual: tipo === 'cumpleanos' } }
      break
    }
    case 'menu':
      orden = { conFecha: Boolean(fechaValida(o.fecha)), campos: { fecha: fechaValida(o.fecha), comida: o.comida || 'comida', texto: mayuscula(o.nota || o.titulo || t) } }
      break
    case 'receta':
    case 'ideas':
    case 'recursos':
      orden = { campos: { titulo: mayuscula(o.titulo || t) } }
      break
    case 'notas':
      orden = { campos: { texto: mayuscula(o.nota || t) } }
      break
    default:
      orden = { campos: { texto: mayuscula(o.nota || t), seccion_sugerida: o.seccion_sugerida || null } }
  }
  orden.seccion = o.seccion || 'bandeja'
  orden.texto = t
  orden.ia = true
  orden.segura = esSegura(orden)
  return orden
}

// Devuelve las órdenes de la IA, o null si no está disponible (sin clave, sin saldo, sin conexión…)
export async function preguntarIA(frase) {
  try {
    const { data, error } = await supabase.functions.invoke('chispa', {
      body: { frase, hoy: hoyISO(), dia_semana: DIAS[new Date().getDay()] },
    })
    if (error || !Array.isArray(data?.ordenes) || !data.ordenes.length) {
      if (error) console.warn('IA de Chispa no disponible:', error.message)
      return null
    }
    return data.ordenes.map(convertir)
  } catch (err) {
    console.warn('IA de Chispa no disponible:', err)
    return null
  }
}
