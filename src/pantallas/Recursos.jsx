import { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { useTabla } from '../useTabla.js'
import Avatar from '../componentes/Avatar.jsx'

const sinAcentos = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Reduce la foto antes de subirla: el móvil hace fotos enormes y aquí basta con verse bien
async function reducir(archivo, max = 1600) {
  const img = await createImageBitmap(archivo)
  const escala = Math.min(1, max / Math.max(img.width, img.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(img.width * escala)
  lienzo.height = Math.round(img.height * escala)
  lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height)
  return new Promise((ok) => lienzo.toBlob(ok, 'image/jpeg', 0.82))
}

// Medidas de muebles, fotos de etiquetas, cosas a tener en cuenta de la casa
export default function Recursos({ sesion, avisar }) {
  const { hogar, yo, miembros } = sesion
  const { filas, recargar } = useTabla('recursos', hogar.id, { asc: false })
  const [editando, setEditando] = useState(null)
  const [buscar, setBuscar] = useState('')
  const [urls, setUrls] = useState({})
  const [grande, setGrande] = useState(null)
  const [subiendo, setSubiendo] = useState(false)

  // Las fotos son privadas: se piden enlaces temporales para verlas
  useEffect(() => {
    const rutas = filas.map((r) => r.imagen).filter((r) => r && !urls[r])
    if (!rutas.length) return
    supabase.storage.from('recursos').createSignedUrls(rutas, 3600).then(({ data }) => {
      if (data) setUrls((u) => ({ ...u, ...Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl])) }))
    })
  }, [filas]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = sinAcentos(buscar.trim())
  const visibles = q ? filas.filter((r) => sinAcentos(`${r.titulo} ${r.texto} ${r.estancia}`).includes(q)) : filas

  async function guardar(e) {
    e.preventDefault()
    const r = editando
    if (!r.titulo?.trim() && !r.texto?.trim() && !r.archivo && !r.imagen) return
    setSubiendo(true)
    try {
      let imagen = r.imagen || null
      if (r.archivo) {
        const ruta = `${hogar.id}/${crypto.randomUUID()}.jpg`
        const { error } = await supabase.storage.from('recursos').upload(ruta, await reducir(r.archivo), { contentType: 'image/jpeg' })
        if (error) throw error
        if (r.imagen) await supabase.storage.from('recursos').remove([r.imagen])
        imagen = ruta
      }
      const fila = { titulo: r.titulo?.trim() || 'Sin título', texto: r.texto?.trim() || null, estancia: r.estancia?.trim() || null, imagen }
      const { error } = r.id
        ? await supabase.from('recursos').update(fila).eq('id', r.id)
        : await supabase.from('recursos').insert({ ...fila, hogar_id: hogar.id, creado_por: yo.id })
      if (error) throw error
      setEditando(null)
      recargar()
    } catch (err) {
      avisar(`No se ha podido guardar: ${err.message}`)
    }
    setSubiendo(false)
  }

  async function borrarRecurso(r) {
    if (!confirm(`¿Borrar “${r.titulo}”?`)) return
    await supabase.from('recursos').delete().eq('id', r.id)
    if (r.imagen) await supabase.storage.from('recursos').remove([r.imagen])
    setEditando(null)
    recargar()
  }

  const autor = (id) => miembros.find((m) => m.id === id)

  return (
    <div>
      <div className="anadir">
        <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar: sofá, salón, wifi…" />
        <button className="boton principal" onClick={() => setEditando({ titulo: '', texto: '', estancia: '' })} aria-label="Nuevo recurso">+</button>
      </div>

      {editando && (
        <form className="tarjeta formulario pregunta" onSubmit={guardar}>
          <input autoFocus value={editando.titulo} onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} placeholder="Qué es (ej. Medidas del sofá)" />
          <textarea rows={4} value={editando.texto || ''} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} placeholder="Medidas, modelos, notas… (ej. 210 × 90 × 85 cm)" />
          <input value={editando.estancia || ''} onChange={(e) => setEditando({ ...editando, estancia: e.target.value })} placeholder="Dónde (salón, cocina…) opcional" />
          <label className="boton foto">
            📷 {editando.archivo ? editando.archivo.name : editando.imagen ? 'Cambiar foto' : 'Añadir foto'}
            <input type="file" accept="image/*" hidden onChange={(e) => setEditando({ ...editando, archivo: e.target.files[0] || null })} />
          </label>
          <div className="fila">
            {editando.id ? <button type="button" className="boton" onClick={() => borrarRecurso(editando)}>Borrar</button> : <button type="button" className="boton" onClick={() => setEditando(null)}>Cancelar</button>}
            <button className="boton principal" disabled={subiendo}>{subiendo ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      )}

      {!filas.length && !editando && <p className="vacio-lista">Aquí van las medidas de los muebles, fotos de etiquetas y cosas a tener en cuenta. Pulsa + o dile a Chispa “el sofá mide 210 por 90”.</p>}
      {filas.length > 0 && !visibles.length && <p className="vacio-lista">Nada con “{buscar}”.</p>}

      <div className="recursos">
        {visibles.map((r) => (
          <section key={r.id} className="tarjeta recurso" onClick={() => setEditando({ ...r })}>
            {r.imagen && (
              urls[r.imagen]
                ? <img src={urls[r.imagen]} alt="" onClick={(e) => { e.stopPropagation(); setGrande(urls[r.imagen]) }} />
                : <div className="foto-cargando">📷</div>
            )}
            <div className="texto-recurso">
              <strong>{r.titulo}</strong>
              {r.estancia && <span className="chip">{r.estancia}</span>}
              {r.texto && <p>{r.texto}</p>}
            </div>
            <Avatar miembro={autor(r.creado_por)} tamano={22} />
          </section>
        ))}
      </div>

      {grande && <div className="velo foto-grande" onClick={() => setGrande(null)}><img src={grande} alt="" /></div>}
    </div>
  )
}
