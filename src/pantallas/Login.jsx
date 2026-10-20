import { useState } from 'react'
import { supabase } from '../supabase.js'
import Personaje from '../componentes/Personaje.jsx'

export default function Login() {
  const [modo, setModo] = useState('entrar')
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [aviso, setAviso] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setOcupado(true)
    setAviso(null)
    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: clave })
      if (error) setAviso({ tipo: 'error', texto: traducir(error.message) })
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: clave,
        options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
      })
      if (error) setAviso({ tipo: 'error', texto: traducir(error.message) })
      else if (!data.session) {
        setAviso({ tipo: 'ok', texto: 'Te hemos enviado un correo. Pulsa el enlace para confirmar y después vuelve aquí y entra.' })
        setModo('entrar')
      }
    }
    setOcupado(false)
  }

  return (
    <div className="pantalla centrada">
      <Personaje animo={modo === 'entrar' ? 'reposo' : 'contento'} tamano={150} />
      <h1 className="marca">La Hoguera</h1>
      <p className="suave">Vuestro rincón para organizar la casa</p>
      <form className="tarjeta formulario" onSubmit={enviar}>
        <label>
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Contraseña
          <input type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} minLength={6} required value={clave} onChange={(e) => setClave(e.target.value)} />
        </label>
        {aviso && <p className={`aviso ${aviso.tipo}`}>{aviso.texto}</p>}
        <button className="boton principal" disabled={ocupado}>{modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}</button>
        <button type="button" className="boton enlace" onClick={() => { setModo(modo === 'entrar' ? 'registro' : 'entrar'); setAviso(null) }}>
          {modo === 'entrar' ? '¿Primera vez? Crea tu cuenta' : 'Ya tengo cuenta'}
        </button>
      </form>
    </div>
  )
}

function traducir(m) {
  if (/invalid login/i.test(m)) return 'Email o contraseña incorrectos.'
  if (/email not confirmed/i.test(m)) return 'Falta confirmar el email: busca el correo de Supabase (mira en spam).'
  if (/already registered/i.test(m)) return 'Ese email ya tiene cuenta. Pulsa "Ya tengo cuenta".'
  if (/at least 6/i.test(m)) return 'La contraseña necesita al menos 6 caracteres.'
  if (/rate limit/i.test(m)) return 'Demasiados intentos seguidos. Espera unos minutos.'
  return m
}
