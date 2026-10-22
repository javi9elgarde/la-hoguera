import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, configurado } from './supabase.js'
import { useTabla } from './useTabla.js'
import Login from './pantallas/Login.jsx'
import Bienvenida from './pantallas/Bienvenida.jsx'
import Inicio from './pantallas/Inicio.jsx'
import Compras from './pantallas/Compras.jsx'
import Cocina from './pantallas/Cocina.jsx'
import Agenda from './pantallas/Agenda.jsx'
import Casa from './pantallas/Casa.jsx'
import Tablero from './pantallas/Tablero.jsx'
import Ajustes from './pantallas/Ajustes.jsx'
import Icono from './componentes/Icono.jsx'

const PESTANAS = [
  { id: 'inicio', img: 'chispa-reposo', nombre: 'Hoguera' },
  { id: 'compras', img: 'icono-compras', nombre: 'Compras' },
  { id: 'cocina', icono: '🍳', nombre: 'Cocina' },
  { id: 'agenda', img: 'icono-agenda', nombre: 'Agenda' },
  { id: 'casa', img: 'icono-casa', nombre: 'Casa' },
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
  // "casa:gastos" abre la pestaña Casa en el apartado Gastos
  const [destino, setDestino] = useState({ pestana: 'inicio', apartado: null, n: 0 })
  const pestana = destino.pestana
  const irA = useCallback((d) => {
    const [p, a] = d.split(':')
    setDestino((x) => ({ pestana: p, apartado: a || null, n: x.n + 1 }))
    window.scrollTo(0, 0)
  }, [])
  const [aviso, setAviso] = useState(null)
  const temporizador = useRef(null)
  const { filas: miembros, recargar: recargarMiembros } = useTabla('miembros', hogar.id)
  const yoActual = miembros.find((m) => m.id === yo.id) || yo
  const sesion = { hogar, yo: yoActual, miembros: miembros.length ? miembros : [yo] }

  // Aviso en la parte de abajo, con botón Deshacer opcional durante 5 segundos
  const avisar = useCallback((texto, deshacer) => {
    clearTimeout(temporizador.current)
    setAviso({ texto, deshacer })
    temporizador.current = setTimeout(() => setAviso(null), 5000)
  }, [])

  const props = { sesion, avisar, irA, apartado: destino.apartado }

  return (
    <div className="app">
      <header className="cabecera">
        <span className="marca pequena" onClick={() => irA('inicio')}>La Hoguera</span>
        <span>
          <button className={`boton icono-boton ${pestana === 'tablero' ? 'activo' : ''}`} onClick={() => irA('tablero')} aria-label="Tablero de notas"><Icono img="icono-tablero" /></button>
          <button className={`boton icono-boton ${pestana === 'ajustes' ? 'activo' : ''}`} onClick={() => irA('ajustes')} aria-label="Ajustes">⚙️</button>
        </span>
      </header>
      <main>
        {pestana === 'inicio' && <Inicio key={destino.n} {...props} />}
        {pestana === 'compras' && <Compras key={destino.n} {...props} />}
        {pestana === 'cocina' && <Cocina key={destino.n} {...props} />}
        {pestana === 'agenda' && <Agenda key={destino.n} {...props} />}
        {pestana === 'casa' && <Casa key={destino.n} {...props} />}
        {pestana === 'tablero' && <Tablero key={destino.n} {...props} />}
        {pestana === 'ajustes' && <Ajustes key={destino.n} {...props} alCambiar={() => { recargarPerfil(); recargarMiembros() }} />}
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
          <button key={p.id} className={pestana === p.id ? 'activa' : ''} onClick={() => irA(p.id)}>
            <Icono img={p.img} emoji={p.icono} />
            <span>{p.nombre}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
