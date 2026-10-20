import { useEffect, useRef, useState } from 'react'
import { clasificar, reconstruir, NOMBRES_SECCION, SECCIONES_ACTIVAS, CATEGORIAS_GASTO } from '../clasificador.js'
import { guardarOrden } from '../datos.js'
import { euros } from '../datos.js'

const ICONO = { compra: '🥖', cosas: '📦', arreglos: '🔧', gastos: '💶', agenda: '📅', menu: '🍳', receta: '📖', notas: '💌', bandeja: '📥' }
const OPCIONES = [...SECCIONES_ACTIVAS, 'bandeja']
const TIPOS_EVENTO = { plan: '🎉 Plan', cumpleanos: '🎂 Cumpleaños', cita: '💕 Cita', otro: '📌 Otro' }

// La burbuja del personaje: escribir o dictar, ver qué ha entendido y guardar
export default function Burbuja({ contexto, alCambiarAnimo, alCerrar, alGuardar }) {
  const [texto, setTexto] = useState('')
  const [ordenes, setOrdenes] = useState(null)
  const [error, setError] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const campo = useRef(null)

  useEffect(() => { campo.current?.focus() }, [])

  async function entender(e) {
    e?.preventDefault()
    if (!texto.trim()) return
    alCambiarAnimo('pensando')
    await new Promise((r) => setTimeout(r, 450))
    const r = clasificar(texto)
    if (r.length && r.every((o) => o.segura)) {
      await guardarTodo(r)
      return
    }
    setOrdenes(r)
    alCambiarAnimo(r.some((o) => !o.seccion) ? 'duda' : 'escuchando')
  }

  async function guardarTodo(lista) {
    setOcupado(true)
    setError(null)
    try {
      const hechos = []
      for (const o of lista) {
        if (!o.seccion) throw new Error(`Elige dónde va "${o.texto}"`)
        if (o.seccion === 'gastos' && !(o.campos.importe > 0)) throw new Error('Falta el importe del gasto')
        if ((o.seccion === 'agenda' || o.seccion === 'menu') && !o.campos.fecha) throw new Error(`Elige el día de "${o.texto}"`)
        hechos.push(await guardarOrden(o, contexto))
      }
      alGuardar(hechos, lista)
    } catch (err) {
      setError(err.message)
      setOcupado(false)
      alCambiarAnimo('duda')
    }
  }

  const cambiar = (i, cambio) => setOrdenes((l) => l.map((o, j) => (j === i ? cambio(o) : o)))
  const quitar = (i) => setOrdenes((l) => l.filter((_, j) => j !== i))

  return (
    <div className="velo" onClick={alCerrar}>
      <div className="burbuja" onClick={(e) => e.stopPropagation()}>
        {!ordenes && (
          <form onSubmit={entender}>
            <textarea
              ref={campo}
              rows={3}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) entender(e) }}
              placeholder="Ej. comprar leche y pan, el grifo del baño gotea…"
            />
            <p className="pista">🎙️ Para hablar, pulsa el micrófono del teclado del móvil.</p>
            <div className="fila">
              <button type="button" className="boton" onClick={alCerrar}>Cerrar</button>
              <button className="boton principal" disabled={!texto.trim()}>Apuntar</button>
            </div>
          </form>
        )}
        {ordenes && (
          <div className="resultados">
            <p className="titulo-burbuja">{ordenes.length === 1 ? 'Esto he entendido:' : `He entendido ${ordenes.length} cosas:`}</p>
            {ordenes.map((o, i) => (
              <Resultado key={i} orden={o} alCambiar={(c) => cambiar(i, c)} alQuitar={() => quitar(i)} />
            ))}
            {error && <p className="aviso error">{error}</p>}
            <div className="fila">
              <button className="boton" onClick={() => { setOrdenes(null); setError(null); alCambiarAnimo('escuchando') }}>Corregir texto</button>
              <button className="boton principal" disabled={ocupado || !ordenes.length} onClick={() => guardarTodo(ordenes)}>Guardar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Resultado({ orden, alCambiar, alQuitar }) {
  const sec = orden.seccion
  const elegir = (s) => alCambiar((o) => reconstruir(o.texto, s))
  const campo = (k, v) => alCambiar((o) => ({ ...o, campos: { ...o.campos, [k]: v } }))

  return (
    <div className={`resultado ${!sec ? 'sin-seccion' : ''} ${orden.urgente ? 'urgente' : ''}`}>
      <div className="cabecera-resultado">
        <span className="icono">{ICONO[sec] || '❓'}</span>
        <strong>{sec ? NOMBRES_SECCION[sec] : '¿Dónde lo guardo?'}</strong>
        {sec === 'bandeja' && orden.campos.seccion_sugerida && <span className="chip">para {NOMBRES_SECCION[orden.campos.seccion_sugerida]}</span>}
        <button className="quitar" onClick={alQuitar} aria-label="Quitar">✕</button>
      </div>
      {sec === 'compra' && (
        <input value={orden.campos.producto || ''} onChange={(e) => campo('producto', e.target.value)} />
      )}
      {(sec === 'cosas' || sec === 'receta') && (
        <input value={orden.campos.titulo || ''} onChange={(e) => campo('titulo', e.target.value)} />
      )}
      {sec === 'notas' && (
        <textarea rows={2} value={orden.campos.texto || ''} onChange={(e) => campo('texto', e.target.value)} />
      )}
      {sec === 'agenda' && (
        <>
          <input value={orden.campos.titulo || ''} onChange={(e) => campo('titulo', e.target.value)} />
          <div className="fila">
            <input type="date" value={orden.campos.fecha || ''} onChange={(e) => campo('fecha', e.target.value)} />
            <input type="time" value={orden.campos.hora || ''} onChange={(e) => campo('hora', e.target.value)} />
          </div>
          <select value={orden.campos.tipo} onChange={(e) => alCambiar((o) => ({ ...o, campos: { ...o.campos, tipo: e.target.value, anual: e.target.value === 'cumpleanos' } }))}>
            {Object.entries(TIPOS_EVENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </>
      )}
      {sec === 'menu' && (
        <>
          <input value={orden.campos.texto || ''} onChange={(e) => campo('texto', e.target.value)} />
          <div className="fila">
            <input type="date" value={orden.campos.fecha || ''} onChange={(e) => campo('fecha', e.target.value)} />
            <select value={orden.campos.comida} onChange={(e) => campo('comida', e.target.value)}>
              <option value="comida">☀️ Comida</option>
              <option value="cena">🌙 Cena</option>
            </select>
          </div>
        </>
      )}
      {sec === 'arreglos' && (
        <>
          <input value={orden.campos.titulo || ''} onChange={(e) => campo('titulo', e.target.value)} />
          <label className="interruptor">
            <input type="checkbox" checked={orden.campos.prioridad === 'urgente'} onChange={(e) => campo('prioridad', e.target.checked ? 'urgente' : 'normal')} />
            Es urgente
          </label>
        </>
      )}
      {sec === 'gastos' && (
        <div className="fila">
          <input className="importe" inputMode="decimal" placeholder="€" value={orden.campos.importe ?? ''} onChange={(e) => campo('importe', Number(e.target.value.replace(',', '.')) || null)} />
          <select value={orden.campos.categoria} onChange={(e) => campo('categoria', e.target.value)}>
            {CATEGORIAS_GASTO.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      )}
      {sec === 'gastos' && orden.campos.importe > 0 && <p className="suave pequeno">{euros(orden.campos.importe)} · {orden.campos.concepto || 'sin concepto'}</p>}
      {(sec === 'bandeja' || !sec) && <p className="cita">“{orden.texto}”</p>}
      {!sec ? (
        <div className="cambiar-seccion">
          {OPCIONES.map((s) => (
            <button key={s} className="chip boton-chip" onClick={() => elegir(s)}>{ICONO[s]} {NOMBRES_SECCION[s]}</button>
          ))}
        </div>
      ) : (
        <select className="mover" value="" onChange={(e) => e.target.value && elegir(e.target.value)} aria-label="Mover a otra sección">
          <option value="">↪ Mover a otra sección…</option>
          {OPCIONES.filter((s) => s !== sec).map((s) => <option key={s} value={s}>{ICONO[s]} {NOMBRES_SECCION[s]}</option>)}
        </select>
      )}
    </div>
  )
}
