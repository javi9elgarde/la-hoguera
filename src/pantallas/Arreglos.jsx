import { useState } from 'react'
import { supabase } from '../supabase.js'
import { useTabla } from '../useTabla.js'
import Avatar from '../componentes/Avatar.jsx'

const dias = (fecha) => Math.floor((Date.now() - new Date(fecha)) / 864e5)

export default function Arreglos({ sesion, avisar }) {
  const { hogar, yo, miembros } = sesion
  const { filas, recargar } = useTabla('tareas', hogar.id, { asc: false })
  const [titulo, setTitulo] = useState('')
  const [urgente, setUrgente] = useState(false)
  const [verHechos, setVerHechos] = useState(false)
  const [preguntaCoste, setPreguntaCoste] = useState(null)
  const [coste, setCoste] = useState('')

  const urgentes = filas.filter((t) => t.estado === 'pendiente' && t.prioridad === 'urgente')
  const pendientes = filas.filter((t) => t.estado === 'pendiente' && t.prioridad === 'normal')
  const hechos = filas.filter((t) => t.estado === 'hecha')

  async function anadir(e) {
    e.preventDefault()
    if (!titulo.trim()) return
    await supabase.from('tareas').insert({ hogar_id: hogar.id, titulo: titulo.trim(), prioridad: urgente ? 'urgente' : 'normal', creado_por: yo.id })
    setTitulo('')
    setUrgente(false)
    recargar()
  }

  async function completar(t) {
    await supabase.from('tareas').update({ estado: 'hecha', hecha_en: new Date().toISOString() }).eq('id', t.id)
    recargar()
    setPreguntaCoste(t)
  }

  async function guardarCoste(e) {
    e.preventDefault()
    const n = Number(coste.replace(',', '.'))
    if (n > 0) {
      await supabase.from('gastos').insert({ hogar_id: hogar.id, importe: n, categoria: 'hogar', concepto: preguntaCoste.titulo, pagado_por: yo.id, origen_tipo: 'tarea', origen_id: preguntaCoste.id })
      avisar('Gasto apuntado')
    }
    setPreguntaCoste(null)
    setCoste('')
  }

  async function reabrir(t) {
    await supabase.from('tareas').update({ estado: 'pendiente', hecha_en: null }).eq('id', t.id)
    recargar()
  }

  async function cambiarPrioridad(t) {
    await supabase.from('tareas').update({ prioridad: t.prioridad === 'urgente' ? 'normal' : 'urgente' }).eq('id', t.id)
    recargar()
  }

  async function borrarTarea(t) {
    await supabase.from('tareas').delete().eq('id', t.id)
    recargar()
    avisar('Arreglo borrado', async () => {
      const { id, ...resto } = t
      await supabase.from('tareas').insert(resto)
    })
  }

  const autor = (id) => miembros.find((m) => m.id === id)

  const Tarea = ({ t }) => (
    <li className={`tarea ${t.prioridad}`}>
      <button className="casilla" onClick={() => completar(t)} aria-label="Marcar como hecho" />
      <div className="texto">
        <span>{t.titulo}</span>
        <span className="suave pequeno">
          {t.estancia ? `${t.estancia} · ` : ''}
          {dias(t.creado_en) === 0 ? 'hoy' : `hace ${dias(t.creado_en)} d`}
        </span>
      </div>
      <Avatar miembro={autor(t.creado_por)} tamano={22} />
      <button className="chip boton-chip" onClick={() => cambiarPrioridad(t)}>{t.prioridad === 'urgente' ? 'Bajar' : '🔥'}</button>
      <button className="quitar" onClick={() => borrarTarea(t)} aria-label="Borrar">✕</button>
    </li>
  )

  return (
    <div>
      <form className="anadir" onSubmit={anadir}>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. cambiar bombilla del pasillo" />
        <button type="button" className={`boton icono-boton ${urgente ? 'activo' : ''}`} onClick={() => setUrgente(!urgente)} aria-pressed={urgente} title="Urgente">🔥</button>
        <button className="boton principal" disabled={!titulo.trim()}>+</button>
      </form>

      {preguntaCoste && (
        <form className="tarjeta pregunta" onSubmit={guardarCoste}>
          <p>¡Hecho! ¿Costó algo “{preguntaCoste.titulo}”?</p>
          <div className="anadir">
            <input autoFocus inputMode="decimal" value={coste} onChange={(e) => setCoste(e.target.value)} placeholder="€ (vacío si nada)" />
            <button className="boton principal">Listo</button>
          </div>
        </form>
      )}

      <section className="tarjeta columna-urgente">
        <h2>🔥 Urgente ({urgentes.length})</h2>
        {urgentes.length ? <ul className="lista">{urgentes.map((t) => <Tarea key={t.id} t={t} />)}</ul> : <p className="suave">Nada urgente. 😌</p>}
      </section>

      <section className="tarjeta">
        <h2>🕒 Pendiente ({pendientes.length})</h2>
        {pendientes.length ? <ul className="lista">{pendientes.map((t) => <Tarea key={t.id} t={t} />)}</ul> : <p className="suave">Todo al día.</p>}
      </section>

      {hechos.length > 0 && (
        <section className="tarjeta">
          <button className="boton enlace" onClick={() => setVerHechos(!verHechos)}>
            {verHechos ? 'Ocultar' : 'Ver'} hechos ({hechos.length})
          </button>
          {verHechos && (
            <ul className="lista">
              {hechos.slice(0, 30).map((t) => (
                <li key={t.id} className="tarea hecho">
                  <button className="casilla marcada" onClick={() => reabrir(t)} aria-label="Reabrir">✓</button>
                  <span className="texto">{t.titulo}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
