import { useState } from 'react'
import { supabase } from '../supabase.js'
import Personaje from '../componentes/Personaje.jsx'

export default function Bienvenida({ alTerminar }) {
  const [modo, setModo] = useState(null)
  const [nombre, setNombre] = useState('')
  const [extra, setExtra] = useState('')
  const [error, setError] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setOcupado(true)
    setError(null)
    const { error } = modo === 'crear'
      ? await supabase.rpc('crear_hogar', { p_nombre_hogar: extra, p_mi_nombre: nombre })
      : await supabase.rpc('unirse_hogar', { p_codigo: extra, p_mi_nombre: nombre })
    setOcupado(false)
    if (error) setError(error.message)
    else alTerminar()
  }

  return (
    <div className="pantalla centrada">
      <Personaje animo={modo ? 'escuchando' : 'contento'} tamano={150} />
      <h1 className="marca">¡Bienvenidos!</h1>
      {!modo && (
        <div className="pila">
          <p className="suave">El primero crea el hogar y comparte el código. El segundo se une con ese código.</p>
          <button className="boton principal" onClick={() => setModo('crear')}>Crear nuestro hogar</button>
          <button className="boton" onClick={() => setModo('unirse')}>Tengo un código</button>
          <button className="boton enlace" onClick={() => supabase.auth.signOut()}>Salir</button>
        </div>
      )}
      {modo && (
        <form className="tarjeta formulario" onSubmit={enviar}>
          <label>
            Tu nombre
            <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Como quieres que te vea tu pareja" />
          </label>
          <label>
            {modo === 'crear' ? 'Nombre del hogar' : 'Código del hogar'}
            <input
              required={modo === 'unirse'}
              value={extra}
              onChange={(e) => setExtra(modo === 'unirse' ? e.target.value.toUpperCase() : e.target.value)}
              placeholder={modo === 'crear' ? 'Nuestra casa' : 'Ej. 3FA9C1'}
              maxLength={modo === 'unirse' ? 6 : 40}
            />
          </label>
          {error && <p className="aviso error">{error}</p>}
          <button className="boton principal" disabled={ocupado}>{modo === 'crear' ? 'Encender la hoguera' : 'Unirme'}</button>
          <button type="button" className="boton enlace" onClick={() => setModo(null)}>Volver</button>
        </form>
      )}
    </div>
  )
}
