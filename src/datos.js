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
    case 'cosas':
      tabla = 'cosas_compra'
      fila = { ...base, titulo: orden.campos.titulo, enlace: orden.campos.enlace, precio_estimado: orden.campos.precio_estimado, anadido_por: miembroId }
      break
    case 'agenda':
      tabla = 'eventos'
      fila = { ...base, titulo: orden.campos.titulo, fecha: orden.campos.fecha, hora: orden.campos.hora || null, tipo: orden.campos.tipo, anual: orden.campos.anual, creado_por: miembroId }
      break
    case 'menu': {
      // Un hueco por día y comida: si ya había algo, se sustituye
      const { data, error } = await supabase
        .from('menu')
        .upsert({ ...base, fecha: orden.campos.fecha, comida: orden.campos.comida, texto: orden.campos.texto, receta_id: orden.campos.receta_id || null }, { onConflict: 'hogar_id,fecha,comida' })
        .select('id')
        .single()
      if (error) throw error
      return { tabla: 'menu', id: data.id }
    }
    case 'receta':
      tabla = 'recetas'
      fila = { ...base, titulo: orden.campos.titulo, creado_por: miembroId }
      break
    case 'notas':
      tabla = 'notas'
      fila = { ...base, texto: orden.campos.texto, autor_id: miembroId }
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
