import { useState } from 'react'
import { supabase } from '../supabase.js'
import Avatar, { AVATARES, rutaAvatar } from '../componentes/Avatar.jsx'

const COLORES = ['#e8833a', '#4a90c2', '#e05d75', '#3fa37a', '#7a6fb0', '#d4a72c', '#8a5a3b']

export default function Ajustes({ sesion, alCambiar, avisar }) {
  const { hogar, yo, miembros } = sesion
  const [nombre, setNombre] = useState(yo.nombre)

  async function guardarPerfil(cambio) {
    const { error } = await supabase.from('miembros').update(cambio).eq('id', yo.id)
    if (error) {
      // Si falta la columna "avatar", es que no se ha vuelto a pegar el schema.sql en Supabase
      avisar(/avatar/.test(error.message) ? 'Falta actualizar la base de datos (pegar schema.sql en Supabase)' : `No se ha podido guardar: ${error.message}`)
      return
    }
    alCambiar()
  }

  async function compartir() {
    const texto = `Únete a nuestro hogar en La Hoguera con el código ${hogar.codigo}: ${window.location.href}`
    if (navigator.share) {
      try { await navigator.share({ text: texto }) } catch { /* cancelado */ }
    } else {
      await navigator.clipboard.writeText(texto)
      avisar('Copiado')
    }
  }

  return (
    <div className="pantalla">
      <h1>⚙️ Ajustes</h1>
      <section className="tarjeta">
        <h2>{hogar.nombre}</h2>
        <p>Código para unirse: <strong className="codigo">{hogar.codigo}</strong></p>
        <button className="boton" onClick={compartir}>Compartir código</button>
        <ul className="lista miembros">
          {miembros.map((m) => <li key={m.id}><Avatar miembro={m} tamano={30} /> {m.nombre}{m.id === yo.id && <span className="suave"> (tú)</span>}</li>)}
        </ul>
      </section>

      <section className="tarjeta formulario">
        <h2>Tu perfil</h2>
        <label>
          Nombre
          <div className="anadir">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <button className="boton" disabled={!nombre.trim() || nombre === yo.nombre} onClick={() => guardarPerfil({ nombre: nombre.trim() })}>Guardar</button>
          </div>
        </label>
        <span>Tu avatar</span>
        <div className="avatares">
          <button className={!yo.avatar ? 'activo' : ''} onClick={() => guardarPerfil({ avatar: null })} aria-label="Sin dibujo, solo inicial">
            <span className="avatar" style={{ background: yo.color, width: 56, height: 56, fontSize: 24 }}>{yo.nombre.charAt(0).toUpperCase()}</span>
          </button>
          {AVATARES.map((a) => (
            <button key={a} className={yo.avatar === a ? 'activo' : ''} onClick={() => guardarPerfil({ avatar: a })} aria-label={`Avatar ${a}`}>
              <span className="avatar con-imagen" style={{ width: 56, height: 56, borderColor: yo.color }}><img src={rutaAvatar(a)} alt="" /></span>
            </button>
          ))}
        </div>
        <span>Tu color</span>
        <div className="colores">
          {COLORES.map((c) => (
            <button key={c} className={`color ${c === yo.color ? 'activo' : ''}`} style={{ background: c }} onClick={() => guardarPerfil({ color: c })} aria-label={`Color ${c}`} />
          ))}
        </div>
      </section>

      <section className="tarjeta">
        <h2>Instalar en el móvil</h2>
        <p><strong>iPhone:</strong> abre esta página en Safari, pulsa el botón Compartir (cuadrado con flecha) y elige “Añadir a pantalla de inicio”.</p>
        <p><strong>Android:</strong> en Chrome, menú ⋮ y “Añadir a pantalla de inicio” o “Instalar aplicación”.</p>
      </section>

      <button className="boton ancho" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
    </div>
  )
}
