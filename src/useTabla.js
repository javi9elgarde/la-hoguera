import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'

// Lee una tabla del hogar y la mantiene al día con Realtime.
// Ante cualquier cambio vuelve a pedir la tabla: con dos personas es barato y nunca se desincroniza.
export function useTabla(tabla, hogarId, { orden = 'creado_en', asc = true, filtro } = {}) {
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const temporizador = useRef(null)

  const recargar = useCallback(async () => {
    if (!hogarId) return
    let q = supabase.from(tabla).select('*').eq('hogar_id', hogarId).order(orden, { ascending: asc })
    if (filtro) q = filtro(q)
    const { data, error } = await q
    if (!error) setFilas(data)
    setCargando(false)
  }, [tabla, hogarId, orden, asc, filtro])

  useEffect(() => {
    if (!hogarId) return
    recargar()
    const pronto = () => {
      clearTimeout(temporizador.current)
      temporizador.current = setTimeout(recargar, 150)
    }
    const canal = supabase
      .channel(`${tabla}-${hogarId}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: tabla, filter: `hogar_id=eq.${hogarId}` }, pronto)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: tabla }, pronto)
      .subscribe()
    // En iPhone la app se duerme en segundo plano: al volver, se recarga
    const alVolver = () => document.visibilityState === 'visible' && recargar()
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearTimeout(temporizador.current)
      supabase.removeChannel(canal)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [tabla, hogarId, recargar])

  return { filas, cargando, recargar }
}
