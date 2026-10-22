import { useState } from 'react'
import { supabase } from '../supabase.js'
import { useTabla } from '../useTabla.js'
import { euros } from '../datos.js'
import Avatar from '../componentes/Avatar.jsx'

// Futuras reformas y mejoras de la casa
export default function Ideas({ sesion, avisar }) {
  const { hogar, yo, miembros } = sesion
  const { filas, recargar } = useTabla('ideas', hogar.id, { asc: false })
  const [titulo, setTitulo] = useState('')
  const [editando, setEditando] = useState(null)
  const [verHechas, setVerHechas] = useState(false)

  const pendientes = filas.filter((i) => i.estado !== 'hecha')
  const hechas = filas.filter((i) => i.estado === 'hecha')
  const total = pendientes.reduce((s, i) => s + Number(i.presupuesto || 0), 0)

  async function anadir(e) {
    e.preventDefault()
    if (!titulo.trim()) return
    await supabase.from('ideas').insert({ hogar_id: hogar.id, titulo: titulo.trim(), creado_por: yo.id })
    setTitulo('')
    recargar()
  }

  async function guardar(e) {
    e.preventDefault()
    const i = editando
    const presupuesto = Number(String(i.presupuesto ?? '').replace(',', '.'))
    await supabase.from('ideas').update({ titulo: i.titulo.trim() || 'Idea', descripcion: i.descripcion?.trim() || null, estancia: i.estancia?.trim() || null, presupuesto: presupuesto > 0 ? presupuesto : null }).eq('id', i.id)
    setEditando(null)
    recargar()
  }

  async function marcar(i) {
    await supabase.from('ideas').update({ estado: i.estado === 'hecha' ? 'idea' : 'hecha' }).eq('id', i.id)
    recargar()
    if (i.estado !== 'hecha') avisar('¡Reforma hecha! 🎉')
  }

  async function borrarIdea(i) {
    await supabase.from('ideas').delete().eq('id', i.id)
    setEditando(null)
    recargar()
    avisar(`Quitada: ${i.titulo}`, async () => {
      const { id, ...resto } = i
      await supabase.from('ideas').insert(resto)
    })
  }

  const autor = (id) => miembros.find((m) => m.id === id)

  return (
    <div>
      <form className="anadir" onSubmit={anadir}>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. cambiar el suelo del salón" />
        <button className="boton principal" disabled={!titulo.trim()}>+</button>
      </form>

      {editando && (
        <form className="tarjeta formulario pregunta" onSubmit={guardar}>
          <input value={editando.titulo} onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} placeholder="La idea" />
          <textarea rows={3} value={editando.descripcion || ''} onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })} placeholder="Detalles, enlaces, cómo lo queremos…" />
          <input value={editando.estancia || ''} onChange={(e) => setEditando({ ...editando, estancia: e.target.value })} placeholder="Dónde (salón, baño…)" />
          <input value={editando.presupuesto ?? ''} onChange={(e) => setEditando({ ...editando, presupuesto: e.target.value })} placeholder="Presupuesto aproximado €" inputMode="decimal" />
          <div className="fila">
            <button type="button" className="boton" onClick={() => borrarIdea(editando)}>Borrar</button>
            <button type="button" className="boton" onClick={() => setEditando(null)}>Cancelar</button>
            <button className="boton principal">Guardar</button>
          </div>
        </form>
      )}

      {!pendientes.length && <p className="vacio-lista">Sin ideas todavía. Dile a Chispa “idea: pintar el dormitorio de verde”.</p>}

      {pendientes.length > 0 && (
        <section className="tarjeta">
          <div className="titulo-con-dato">
            <h2>💡 Para algún día ({pendientes.length})</h2>
            {total > 0 && <span className="suave pequeno">≈ {euros(total)}</span>}
          </div>
          <ul className="lista">
            {pendientes.map((i) => (
              <li key={i.id} className="cosa">
                <button className="casilla" onClick={() => marcar(i)} aria-label={`Marcar ${i.titulo} como hecha`} />
                <div className="texto" onClick={() => setEditando({ ...i })}>
                  <span>{i.titulo}</span>
                  <span className="suave pequeno">
                    {[i.estancia, i.presupuesto ? `≈ ${euros(i.presupuesto)}` : null, i.descripcion].filter(Boolean).join(' · ') || 'Toca para añadir detalles'}
                  </span>
                </div>
                <Avatar miembro={autor(i.creado_por)} tamano={22} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {hechas.length > 0 && (
        <section className="tarjeta">
          <button className="boton enlace" onClick={() => setVerHechas(!verHechas)}>{verHechas ? 'Ocultar' : 'Ver'} hechas ({hechas.length})</button>
          {verHechas && (
            <ul className="lista">
              {hechas.map((i) => (
                <li key={i.id} className="cosa hecho">
                  <button className="casilla marcada" onClick={() => marcar(i)} aria-label="Volver a pendiente">✓</button>
                  <span className="texto">{i.titulo}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
