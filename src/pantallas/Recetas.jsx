import { useState } from 'react'
import { supabase } from '../supabase.js'
import { parsearIngrediente } from '../clasificador.js'

const vacia = { titulo: '', raciones: '', minutos: '', ingredientesTexto: '', pasos: '', enlace: '' }

export default function Recetas({ sesion, recetas, recargar, avisar, alAnadirCompra, alPonerEnMenu }) {
  const { hogar, yo } = sesion
  const [abierta, setAbierta] = useState(null)
  const [editando, setEditando] = useState(null)
  const [busca, setBusca] = useState('')

  const lista = recetas.filter((r) => r.titulo.toLowerCase().includes(busca.toLowerCase()))

  function editar(r) {
    setEditando(r
      ? { ...r, raciones: r.raciones ?? '', minutos: r.minutos ?? '', enlace: r.enlace ?? '', pasos: r.pasos ?? '', ingredientesTexto: r.ingredientes.map((i) => (i.cantidad ? `${i.cantidad} ${i.producto}` : i.producto)).join('\n') }
      : { ...vacia })
  }

  async function guardar(e) {
    e.preventDefault()
    const r = editando
    const fila = {
      titulo: r.titulo.trim(),
      raciones: Number(r.raciones) || null,
      minutos: Number(r.minutos) || null,
      ingredientes: r.ingredientesTexto.split('\n').map((l) => l.trim()).filter(Boolean).map(parsearIngrediente),
      pasos: r.pasos.trim() || null,
      enlace: r.enlace.trim() || null,
    }
    if (r.id) await supabase.from('recetas').update(fila).eq('id', r.id)
    else await supabase.from('recetas').insert({ ...fila, hogar_id: hogar.id, creado_por: yo.id })
    setEditando(null)
    recargar()
    avisar(r.id ? 'Receta guardada' : 'Receta añadida')
  }

  async function borrarReceta(r) {
    await supabase.from('recetas').delete().eq('id', r.id)
    setAbierta(null)
    recargar()
    avisar('Receta borrada', async () => {
      const { id, ...resto } = r
      await supabase.from('recetas').insert(resto)
    })
  }

  if (editando) {
    return (
      <form className="tarjeta formulario" onSubmit={guardar}>
        <h2>{editando.id ? 'Editar receta' : 'Nueva receta'}</h2>
        <input required autoFocus placeholder="Nombre (ej. Lentejas de la abuela)" value={editando.titulo} onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} />
        <div className="fila">
          <input inputMode="numeric" placeholder="Raciones" value={editando.raciones} onChange={(e) => setEditando({ ...editando, raciones: e.target.value })} />
          <input inputMode="numeric" placeholder="Minutos" value={editando.minutos} onChange={(e) => setEditando({ ...editando, minutos: e.target.value })} />
        </div>
        <label>
          Ingredientes (uno por línea)
          <textarea rows={6} placeholder={'300 g de lentejas\n1 cebolla\n2 zanahorias\npimentón'} value={editando.ingredientesTexto} onChange={(e) => setEditando({ ...editando, ingredientesTexto: e.target.value })} />
        </label>
        <label>
          Pasos
          <textarea rows={5} placeholder="Cómo se hace…" value={editando.pasos} onChange={(e) => setEditando({ ...editando, pasos: e.target.value })} />
        </label>
        <input inputMode="url" placeholder="Enlace (TikTok, YouTube, web…)" value={editando.enlace} onChange={(e) => setEditando({ ...editando, enlace: e.target.value })} />
        <div className="fila">
          <button type="button" className="boton" onClick={() => setEditando(null)}>Cancelar</button>
          <button className="boton principal">Guardar</button>
        </div>
      </form>
    )
  }

  const r = recetas.find((x) => x.id === abierta)
  if (r) {
    return (
      <div className="tarjeta receta-detalle">
        <button className="boton enlace" onClick={() => setAbierta(null)}>‹ Recetas</button>
        <h2 className="titulo-receta">{r.titulo}</h2>
        <p className="suave">
          {[r.raciones && `${r.raciones} raciones`, r.minutos && `${r.minutos} min`].filter(Boolean).join(' · ')}
        </p>
        {r.ingredientes.length > 0 && (
          <>
            <h3>Ingredientes</h3>
            <ul className="ingredientes">
              {r.ingredientes.map((i, k) => <li key={k}>{i.producto}{i.cantidad && <span className="suave"> · {i.cantidad}</span>}</li>)}
            </ul>
          </>
        )}
        {r.pasos && (
          <>
            <h3>Pasos</h3>
            <p className="pasos">{r.pasos}</p>
          </>
        )}
        {r.enlace && <a className="boton ancho enlace-receta" href={r.enlace} target="_blank" rel="noreferrer">▶️ Ver la receta original</a>}
        <div className="pila-botones">
          <button className="boton principal" onClick={() => alPonerEnMenu(r)}>📅 Poner en el menú</button>
          {r.ingredientes.length > 0 && <button className="boton" onClick={() => alAnadirCompra([r])}>🛒 Ingredientes a la compra</button>}
          <div className="fila">
            <button className="boton" onClick={() => editar(r)}>Editar</button>
            <button className="boton" onClick={() => borrarReceta(r)}>Borrar</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="anadir">
        <input placeholder="Buscar receta" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button className="boton principal" onClick={() => editar(null)}>+</button>
      </div>
      {!recetas.length && <p className="vacio-lista">Aún no hay recetas. Pulsa + para añadir la primera.</p>}
      <div className="rejilla-recetas">
        {lista.map((x) => (
          <button key={x.id} className="tarjeta receta" onClick={() => setAbierta(x.id)}>
            <span className="nombre">{x.titulo}</span>
            <span className="suave pequeno">
              {[x.ingredientes.length && `${x.ingredientes.length} ingredientes`, x.minutos && `${x.minutos} min`].filter(Boolean).join(' · ') || 'Sin detalles aún'}
            </span>
            {x.enlace && <span className="chip">▶️ vídeo</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
