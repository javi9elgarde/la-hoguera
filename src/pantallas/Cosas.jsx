import { useState } from 'react'
import { supabase } from '../supabase.js'
import { useTabla } from '../useTabla.js'
import { euros } from '../datos.js'
import { extraerImporte } from '../clasificador.js'
import Avatar from '../componentes/Avatar.jsx'

const dominio = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

// Compras generales: lámpara, HDMI, regalos… con enlace y precio aproximado
export default function Cosas({ sesion, avisar }) {
  const { hogar, yo, miembros } = sesion
  const { filas, recargar } = useTabla('cosas_compra', hogar.id, { asc: false })
  const [titulo, setTitulo] = useState('')
  const [editando, setEditando] = useState(null)
  const [verCompradas, setVerCompradas] = useState(false)

  const pendientes = filas.filter((c) => c.estado === 'pendiente')
  const compradas = filas.filter((c) => c.estado === 'comprado')
  const totalEstimado = pendientes.reduce((s, c) => s + Number(c.precio_estimado || 0), 0)

  async function anadir(e) {
    e.preventDefault()
    const t = titulo.trim()
    if (!t) return
    const enlace = (t.match(/https?:\/\/\S+/) || [])[0] || null
    const limpio = t.replace(/https?:\/\/\S+/, '').replace(/^(comprar|compra)\s+(un |una |unos |unas )?/i, '').trim()
    await supabase.from('cosas_compra').insert({ hogar_id: hogar.id, titulo: limpio || 'Enlace', enlace, precio_estimado: extraerImporte(t), anadido_por: yo.id })
    setTitulo('')
    recargar()
  }

  async function marcar(c) {
    const comprado = c.estado === 'pendiente'
    await supabase.from('cosas_compra').update({ estado: comprado ? 'comprado' : 'pendiente', comprado_en: comprado ? new Date().toISOString() : null }).eq('id', c.id)
    recargar()
    if (comprado) setEditando({ ...c, preguntarGasto: true, importe: c.precio_estimado ?? '' })
  }

  async function guardarEdicion(e) {
    e.preventDefault()
    const c = editando
    if (c.preguntarGasto) {
      const n = Number(String(c.importe).replace(',', '.'))
      if (n > 0) {
        await supabase.from('gastos').insert({ hogar_id: hogar.id, importe: n, categoria: 'hogar', concepto: c.titulo, pagado_por: yo.id, origen_tipo: 'cosa', origen_id: c.id })
        avisar('Gasto apuntado')
      }
    } else {
      const precio = Number(String(c.precio_estimado ?? '').replace(',', '.'))
      await supabase.from('cosas_compra').update({ titulo: c.titulo, enlace: c.enlace || null, nota: c.nota || null, precio_estimado: precio > 0 ? precio : null }).eq('id', c.id)
      recargar()
    }
    setEditando(null)
  }

  async function borrarCosa(c) {
    await supabase.from('cosas_compra').delete().eq('id', c.id)
    recargar()
    avisar(`Quitado: ${c.titulo}`, async () => {
      const { id, ...resto } = c
      await supabase.from('cosas_compra').insert(resto)
    })
  }

  const autor = (id) => miembros.find((m) => m.id === id)

  return (
    <div>
      <form className="anadir" onSubmit={anadir}>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. cable HDMI, o pega un enlace" />
        <button className="boton principal" disabled={!titulo.trim()}>+</button>
      </form>

      {editando && (
        <form className="tarjeta formulario pregunta" onSubmit={guardarEdicion}>
          {editando.preguntarGasto ? (
            <>
              <p>¡Comprado! ¿Cuánto costó “{editando.titulo}”?</p>
              <input autoFocus inputMode="decimal" placeholder="€ (vacío si no lo apuntas)" value={editando.importe} onChange={(e) => setEditando({ ...editando, importe: e.target.value })} />
            </>
          ) : (
            <>
              <input value={editando.titulo} onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} placeholder="Qué es" />
              <input value={editando.enlace || ''} onChange={(e) => setEditando({ ...editando, enlace: e.target.value })} placeholder="Enlace (Amazon, IKEA, TikTok…)" inputMode="url" />
              <input value={editando.precio_estimado ?? ''} onChange={(e) => setEditando({ ...editando, precio_estimado: e.target.value })} placeholder="Precio aproximado €" inputMode="decimal" />
              <textarea rows={2} value={editando.nota || ''} onChange={(e) => setEditando({ ...editando, nota: e.target.value })} placeholder="Nota: medidas, color, tienda…" />
            </>
          )}
          <div className="fila">
            <button type="button" className="boton" onClick={() => setEditando(null)}>Cancelar</button>
            <button className="boton principal">Guardar</button>
          </div>
        </form>
      )}

      {!pendientes.length && <p className="vacio-lista">Nada pendiente. Dile a Chispa “comprar una lámpara”.</p>}

      {pendientes.length > 0 && (
        <section className="tarjeta">
          <div className="titulo-con-dato">
            <h2>Por comprar ({pendientes.length})</h2>
            {totalEstimado > 0 && <span className="suave pequeno">≈ {euros(totalEstimado)}</span>}
          </div>
          <ul className="lista">
            {pendientes.map((c) => (
              <li key={c.id} className="cosa">
                <button className="casilla" onClick={() => marcar(c)} aria-label={`Marcar ${c.titulo} como comprado`} />
                <div className="texto" onClick={() => setEditando({ ...c })}>
                  <span>{c.titulo}</span>
                  <span className="suave pequeno">
                    {c.precio_estimado ? `≈ ${euros(c.precio_estimado)}` : 'Toca para añadir precio o enlace'}
                    {c.nota ? ` · ${c.nota}` : ''}
                  </span>
                </div>
                {c.enlace && <a className="chip enlace-chip" href={c.enlace} target="_blank" rel="noreferrer">🔗 {dominio(c.enlace)}</a>}
                <Avatar miembro={autor(c.anadido_por)} tamano={22} />
                <button className="quitar" onClick={() => borrarCosa(c)} aria-label="Quitar">✕</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {compradas.length > 0 && (
        <section className="tarjeta">
          <button className="boton enlace" onClick={() => setVerCompradas(!verCompradas)}>{verCompradas ? 'Ocultar' : 'Ver'} compradas ({compradas.length})</button>
          {verCompradas && (
            <ul className="lista">
              {compradas.slice(0, 30).map((c) => (
                <li key={c.id} className="cosa hecho">
                  <button className="casilla marcada" onClick={() => marcar(c)} aria-label="Volver a pendiente">✓</button>
                  <span className="texto">{c.titulo}</span>
                  <button className="quitar" onClick={() => borrarCosa(c)} aria-label="Borrar">✕</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
