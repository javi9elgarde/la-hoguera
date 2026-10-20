import { useCallback, useMemo, useState } from 'react'
import { supabase } from '../supabase.js'
import { useTabla } from '../useTabla.js'
import { mismoProducto, pasilloPara } from '../clasificador.js'
import { aISO, deISO, lunesDe, sumarDias, hoyISO } from '../fechas.js'
import Segmentos from '../componentes/Segmentos.jsx'
import Recetas from './Recetas.jsx'

const COMIDAS = [{ id: 'comida', nombre: '☀️ Comida' }, { id: 'cena', nombre: '🌙 Cena' }]

export default function Cocina({ sesion, avisar }) {
  const { hogar, yo } = sesion
  const [apartado, setApartado] = useState('semana')
  const [lunes, setLunes] = useState(() => aISO(lunesDe(new Date())))
  const [hueco, setHueco] = useState(null) // { fecha, comida, texto, receta_id }
  const [ingredientes, setIngredientes] = useState(null) // lista para confirmar antes de añadir a la compra
  const [poniendo, setPoniendo] = useState(null) // receta que se va a colocar en el menú

  const domingo = aISO(sumarDias(deISO(lunes), 6))
  const filtroSemana = useCallback((q) => q.gte('fecha', lunes).lte('fecha', domingo), [lunes, domingo])
  const menu = useTabla('menu', hogar.id, { orden: 'fecha', filtro: filtroSemana })
  const recetas = useTabla('recetas', hogar.id, { orden: 'titulo' })
  const compra = useTabla('items_compra', hogar.id)

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => aISO(sumarDias(deISO(lunes), i))), [lunes])
  const enHueco = (fecha, comida) => menu.filas.find((m) => m.fecha === fecha && m.comida === comida)
  const receta = (id) => recetas.filas.find((r) => r.id === id)

  async function guardarHueco(e) {
    e?.preventDefault()
    const { fecha, comida, texto, receta_id } = hueco
    if (!texto?.trim() && !receta_id) {
      await supabase.from('menu').delete().eq('hogar_id', hogar.id).eq('fecha', fecha).eq('comida', comida)
    } else {
      await supabase.from('menu').upsert({ hogar_id: hogar.id, fecha, comida, texto: texto?.trim() || null, receta_id: receta_id || null }, { onConflict: 'hogar_id,fecha,comida' })
    }
    setHueco(null)
    menu.recargar()
  }

  // Prepara la lista de ingredientes: marcados los que no están ya en la compra
  function prepararIngredientes(listaRecetas) {
    const pendientes = compra.filas.filter((i) => !i.comprado)
    const vistos = []
    for (const r of listaRecetas) {
      for (const ing of r.ingredientes || []) {
        if (!ing.producto || vistos.some((v) => mismoProducto(v.producto, ing.producto))) continue
        const yaEsta = pendientes.some((i) => mismoProducto(i.producto, ing.producto))
        vistos.push({ ...ing, receta_id: r.id, receta: r.titulo, yaEsta, elegido: !yaEsta })
      }
    }
    if (!vistos.length) {
      avisar('Esas recetas no tienen ingredientes apuntados')
      return
    }
    setIngredientes(vistos)
  }

  function ingredientesDeLaSemana() {
    const ids = [...new Set(menu.filas.map((m) => m.receta_id).filter(Boolean))]
    const lista = ids.map(receta).filter(Boolean)
    if (!lista.length) {
      avisar('Elige recetas en el menú para sacar sus ingredientes')
      return
    }
    prepararIngredientes(lista)
  }

  async function anadirIngredientes() {
    const filas = ingredientes
      .filter((i) => i.elegido)
      .map((i) => ({ hogar_id: hogar.id, producto: i.producto, cantidad: i.cantidad || null, pasillo: pasilloPara(i.producto), receta_id: i.receta_id, anadido_por: yo.id }))
    if (filas.length) await supabase.from('items_compra').insert(filas)
    setIngredientes(null)
    compra.recargar()
    avisar(filas.length ? `Añadidos ${filas.length} ingredientes a la compra` : 'No se ha añadido nada')
  }

  async function colocarReceta(fecha, comida) {
    await supabase.from('menu').upsert({ hogar_id: hogar.id, fecha, comida, receta_id: poniendo.id, texto: null }, { onConflict: 'hogar_id,fecha,comida' })
    setPoniendo(null)
    setApartado('semana')
    menu.recargar()
    avisar(`${poniendo.titulo} en el menú`)
  }

  const hoy = hoyISO()
  const nombreDia = (iso) => deISO(iso).toLocaleDateString('es-ES', { weekday: 'long' })
  const numeroDia = (iso) => deISO(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  const rango = `${numeroDia(lunes)} – ${numeroDia(domingo)}`

  return (
    <div className="pantalla">
      <h1>🍳 Cocina</h1>
      <Segmentos opciones={[{ id: 'semana', nombre: '📅 Semana' }, { id: 'recetas', nombre: '📖 Recetas', cuenta: recetas.filas.length }]} valor={apartado} alCambiar={setApartado} />

      {apartado === 'semana' && (
        <>
          <div className="selector-mes">
            <button className="boton" onClick={() => setLunes(aISO(sumarDias(deISO(lunes), -7)))} aria-label="Semana anterior">‹</button>
            <strong>{rango}</strong>
            <button className="boton" onClick={() => setLunes(aISO(sumarDias(deISO(lunes), 7)))} aria-label="Semana siguiente">›</button>
          </div>
          <div className="semana">
            {dias.map((d) => (
              <div key={d} className={`tarjeta dia ${d === hoy ? 'hoy' : ''} ${d < hoy ? 'pasado' : ''}`}>
                <div className="cabecera-dia">
                  <strong>{nombreDia(d)}</strong>
                  <span className="suave pequeno">{numeroDia(d)}</span>
                </div>
                <div className="huecos">
                  {COMIDAS.map((c) => {
                    const m = enHueco(d, c.id)
                    const r = m?.receta_id && receta(m.receta_id)
                    return (
                      <button key={c.id} className={`hueco ${m ? 'lleno' : ''}`} onClick={() => setHueco({ fecha: d, comida: c.id, texto: m?.texto || '', receta_id: m?.receta_id || null })}>
                        <span className="tipo-hueco">{c.nombre}</span>
                        <span className="plato">{r ? `📖 ${r.titulo}` : m?.texto || '+'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <button className="boton principal ancho" onClick={ingredientesDeLaSemana}>🛒 Ingredientes de la semana a la compra</button>
        </>
      )}

      {apartado === 'recetas' && (
        <Recetas sesion={sesion} recetas={recetas.filas} recargar={recetas.recargar} avisar={avisar} alAnadirCompra={prepararIngredientes} alPonerEnMenu={setPoniendo} />
      )}

      {hueco && (
        <div className="velo" onClick={() => setHueco(null)}>
          <form className="burbuja" onClick={(e) => e.stopPropagation()} onSubmit={guardarHueco}>
            <p className="titulo-burbuja">{COMIDAS.find((c) => c.id === hueco.comida).nombre} del {nombreDia(hueco.fecha)}</p>
            <input autoFocus placeholder="Escribe un plato (ej. pizza casera)" value={hueco.receta_id ? '' : hueco.texto} onChange={(e) => setHueco({ ...hueco, texto: e.target.value, receta_id: null })} />
            {recetas.filas.length > 0 && (
              <>
                <p className="suave pequeno">O elige una receta:</p>
                <div className="cambiar-seccion">
                  {recetas.filas.map((r) => (
                    <button type="button" key={r.id} className={`chip boton-chip ${hueco.receta_id === r.id ? 'elegido' : ''}`} onClick={() => setHueco({ ...hueco, receta_id: r.id, texto: '' })}>📖 {r.titulo}</button>
                  ))}
                </div>
              </>
            )}
            <div className="fila">
              <button type="button" className="boton" onClick={() => setHueco({ ...hueco, texto: '', receta_id: null })}>Vaciar</button>
              <button className="boton principal">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {poniendo && (
        <div className="velo" onClick={() => setPoniendo(null)}>
          <div className="burbuja" onClick={(e) => e.stopPropagation()}>
            <p className="titulo-burbuja">¿Cuándo hacéis “{poniendo.titulo}”?</p>
            <div className="elegir-hueco">
              {dias.map((d) => (
                <div key={d} className="fila-hueco">
                  <span className="dia-corto">{nombreDia(d).slice(0, 3)} {deISO(d).getDate()}</span>
                  {COMIDAS.map((c) => (
                    <button key={c.id} className={`chip boton-chip ${enHueco(d, c.id) ? 'ocupado' : ''}`} onClick={() => colocarReceta(d, c.id)}>{c.nombre}</button>
                  ))}
                </div>
              ))}
            </div>
            <button className="boton ancho" onClick={() => setPoniendo(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {ingredientes && (
        <div className="velo" onClick={() => setIngredientes(null)}>
          <div className="burbuja" onClick={(e) => e.stopPropagation()}>
            <p className="titulo-burbuja">¿Qué añado a la compra?</p>
            <p className="suave pequeno">Desmarcados los que ya están en la lista. Quita lo que tengáis en casa.</p>
            <ul className="lista">
              {ingredientes.map((i, k) => (
                <li key={k} className="item-compra" onClick={() => setIngredientes(ingredientes.map((x, j) => (j === k ? { ...x, elegido: !x.elegido } : x)))}>
                  <span className={`casilla ${i.elegido ? 'marcada' : ''}`}>{i.elegido ? '✓' : ''}</span>
                  <span className="texto">
                    {i.producto}
                    {i.cantidad && <span className="suave"> · {i.cantidad}</span>}
                    <span className="suave pequeno"> ({i.yaEsta ? 'ya en la lista' : i.receta})</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="fila">
              <button className="boton" onClick={() => setIngredientes(null)}>Cancelar</button>
              <button className="boton principal" onClick={anadirIngredientes}>Añadir {ingredientes.filter((i) => i.elegido).length}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
