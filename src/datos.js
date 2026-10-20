import { supabase } from './supabase.js'

// Guarda una orden del personaje en su tabla y devuelve { tabla, id } para poder deshacer
export async function guardarOrden(orden, { hogarId, miembroId }) {
  const base = { hogar_id: hogarId }
  let tabla
  let fila
  switch (orden.seccion) {
    case 'compra':
      tabla = 'items_compra'
      fila = { ...base, producto: orden.campos.producto, cantidad: orden.campos.cantidad, pasillo: orden.campos.pasillo, anadido_por: miembroId }
      break
    case 'arreglos':
      tabla = 'tareas'
      fila = { ...base, titulo: orden.campos.titulo, prioridad: orden.campos.prioridad, estancia: orden.campos.estancia, creado_por: miembroId }
      break
    case 'gastos':
      tabla = 'gastos'
      fila = { ...base, importe: orden.campos.importe, categoria: orden.campos.categoria, concepto: orden.campos.concepto, pagado_por: miembroId }
      break
    default:
      tabla = 'entradas'
      fila = { ...base, texto: orden.campos.texto || orden.texto, seccion_sugerida: orden.campos.seccion_sugerida || null, autor_id: miembroId }
  }
  const { data, error } = await supabase.from(tabla).insert(fila).select('id').single()
  if (error) throw error
  return { tabla, id: data.id }
}

export async function borrar(tabla, id) {
  const { error } = await supabase.from(tabla).delete().eq('id', id)
  if (error) throw error
}

export const euros = (n) =>
  Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number(n) % 1 ? 2 : 0 })
