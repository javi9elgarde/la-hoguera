import { useState } from 'react'
import Segmentos from '../componentes/Segmentos.jsx'
import Arreglos from './Arreglos.jsx'
import Gastos from './Gastos.jsx'
import Icono from '../componentes/Icono.jsx'

export default function Casa(props) {
  const [apartado, setApartado] = useState(props.apartado || 'arreglos')
  return (
    <div className="pantalla">
      <h1><Icono img="icono-casa" /> Casa</h1>
      <Segmentos opciones={[{ id: 'arreglos', nombre: '🔧 Arreglos' }, { id: 'gastos', nombre: '💶 Gastos' }]} valor={apartado} alCambiar={setApartado} />
      {apartado === 'arreglos' ? <Arreglos {...props} /> : <Gastos {...props} />}
    </div>
  )
}
