import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, configurado } from './supabase.js'
import { useTabla } from './useTabla.js'
import Login from './pantallas/Login.jsx'
import Bienvenida from './pantallas/Bienvenida.jsx'
import Inicio from './pantallas/Inicio.jsx'
import Compra from './pantallas/Compra.jsx'
import Arreglos from './pantallas/Arreglos.jsx'
import Gastos from './pantallas/Gastos.jsx'
import Ajustes from './pantallas/Ajustes.jsx'

const PESTANAS = [
  { id: 'inicio', icono: '🔥', nombre: 'Hoguera' },
  { id: 'compra', icono: '🛒', nombre: 'Compra' },
  { id: 'arreglos', icono: '🔧', nombre: 'Arreglos' },
  { id: 'gastos', icono: '💶', nombre: 'Gastos' },
]

export default function App() {
  const [usuario, setUsuario] = useState(undefined)

  useEffect(() => {
    if (!configurado) return
    supabase.auth.getSession().then(({ data }) => setUsuario(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUsuario(s?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!configurado) return <div className="pantalla centrada"><p>Falta configurar Supabase en src/config.js</p></div>
  if (usuario === undefined) return <Cargando />
  if (!usuario) return <Login />
  return <ConHogar usuario={usuario} />
}

function Cargando() {
  return <div className="pantalla centrada"><p className="suave">Avivando el fuego…</p></div>
}

function ConHogar({ usuario }) {
  const [yo, setYo] = useState(undefined)
  const [hogar, setHogar] = useState(null)

  const cargar = useCallback(async () => {
    const { data: m } = await supabase.from('miembros').select('*').eq('id', usuario.id).maybeSingle()
    if (m) {
      const { data: h } = await supabase.from('hogares').select('*').eq('id', m.hogar_id).single()
      setHogar(h)
    }
    setYo(m ?? null)
  }, [usuario.id])

  useEffect(() => { cargar() }, [cargar])

  if (yo === undefined) return <Cargando />
  if (!yo) return <Bienvenida alTerminar={cargar} />
  return <Principal yo={yo} hogar={hogar} recargarPerfil={cargar} />
}

function Principal({ yo, hogar, recargarPerfil }) {
  const [pestana, setPestana] = useState('inicio')
  const [aviso, setAviso] = useState(null)
  const temporizador = useRef(null)
  const { filas: miembros } = useTabla('miembros', hogar.id)
  const yoActual = miembros.find((m) => m.id === yo.id) || yo
  const sesion = { hogar, yo: yoActual, miembros: miembros.length ? miembros : [yo] }

  // Aviso en la parte de abajo, con botón Deshacer opcional durante 5 segundos
  const avisar = useCallback((texto, deshacer) => {
    clearTimeout(temporizador.current)
    setAviso({ texto, deshacer })
    temporizador.current = setTimeout(() => setAviso(null), 5000)
  }, [])

  const props = { sesion, avisar, irA: setPestana }

  return (
    <div className="app">
      <header className="cabecera">
        <span className="marca pequena" onClick={() => setPestana('inicio')}>La Hoguera</span>
        <button className="boton icono-boton" onClick={() => setPestana('ajustes')} aria-label="Ajustes">⚙️</button>
      </header>
      <main>
        {pestana === 'inicio' && <Inicio {...props} />}
        {pestana === 'compra' && <Compra {...props} />}
        {pestana === 'arreglos' && <Arreglos {...props} />}
        {pestana === 'gastos' && <Gastos {...props} />}
        {pestana === 'ajustes' && <Ajustes {...props} alCambiar={recargarPerfil} />}
      </main>
      {aviso && (
        <div className="aviso-flotante" role="status">
          <span>{aviso.texto}</span>
          {aviso.deshacer && (
            <button className="boton enlace" onClick={async () => { setAviso(null); await aviso.deshacer() }}>Deshacer</button>
          )}
        </div>
      )}
      <nav className="pestanas">
        {PESTANAS.map((p) => (
          <button key={p.id} className={pestana === p.id ? 'activa' : ''} onClick={() => setPestana(p.id)}>
            <span className="icono">{p.icono}</span>
            <span>{p.nombre}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
