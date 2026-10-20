import { useState } from 'react'
import { supabase } from '../supabase.js'
import { useTabla } from '../useTabla.js'
import { fechaBonita, aISO } from '../fechas.js'
import Avatar from '../componentes/Avatar.jsx'

export const COLORES_NOTA = ['#fff3b0', '#ffd6d6', '#d7f0dd', '#d6e8ff', '#ecdcff', '#ffe2c4']

export default function Tablero({ sesion, avisar }) {
  const { hogar, yo, miembros } = sesion
  const { filas, recargar } = useTabla('notas', hogar.id, { asc: false })
  const [texto, setTexto] = useState('')
  const [color, setColor] = useState(COLORES_NOTA[0])

  const ordenadas = [...filas].sort((a, b) => Number(b.fijada) - Number(a.fijada))

  async function enviar(e) {
    e.preventDefault()
    if (!texto.trim()) return
    await supabase.from('notas').insert({ hogar_id: hogar.id, autor_id: yo.id, texto: texto.trim(), color })
    setTexto('')
    recargar()
  }

  async function fijar(n) {
    await supabase.from('notas').update({ fijada: !n.fijada }).eq('id', n.id)
    recargar()
  }

  async function borrarNota(n) {
    await supabase.from('notas').delete().eq('id', n.id)
    recargar()
    avisar('Nota quitada', async () => {
      const { id, ...resto } = n
      await supabase.from('notas').insert(resto)
    })
  }

  const autor = (id) => miembros.find((m) => m.id === id)

  return (
    <div className="pantalla">
      <h1>💌 Tablero</h1>
      <form className="tarjeta formulario nueva-nota" onSubmit={enviar} style={{ background: color }}>
        <textarea rows={3} placeholder="Déjale algo bonito…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <div className="fila">
          <div className="colores">
            {COLORES_NOTA.map((c) => (
              <button type="button" key={c} className={`color pequeno ${c === color ? 'activo' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label="Color de la nota" />
            ))}
          </div>
          <button className="boton principal" disabled={!texto.trim()}>Pegar</button>
        </div>
      </form>

      {!filas.length && <p className="vacio-lista">El tablero está vacío. ¡Estrénalo!</p>}
      <div className="corcho">
        {ordenadas.map((n, i) => (
          <div key={n.id} className={`postit ${n.fijada ? 'fijada' : ''}`} style={{ background: n.color, '--giro': `${((i * 37) % 7) - 3}deg` }}>
            {n.fijada && <span className="chincheta">📌</span>}
            <p>{n.texto}</p>
            <div className="pie-postit">
              <Avatar miembro={autor(n.autor_id)} tamano={22} />
              <span className="suave pequeno">{fechaBonita(aISO(new Date(n.creado_en)), { conDia: false })}</span>
              <button className="quitar" onClick={() => fijar(n)} aria-label={n.fijada ? 'Desfijar' : 'Fijar'}>{n.fijada ? '📍' : '📌'}</button>
              <button className="quitar" onClick={() => borrarNota(n)} aria-label="Quitar">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
