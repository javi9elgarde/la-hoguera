import { useState } from 'react'
import Segmentos from '../componentes/Segmentos.jsx'
import Arreglos from './Arreglos.jsx'
import Recursos from './Recursos.jsx'
import Ideas from './Ideas.jsx'
import Icono from '../componentes/Icono.jsx'

export default function Casa(props) {
  const [apartado, setApartado] = useState(props.apartado || 'arreglos')
  return (
    <div className="pantalla">
      <h1><Icono img="icono-casa" /> Casa</h1>
      <Segmentos
        opciones={[{ id: 'arreglos', nombre: '🔧 Arreglos' }, { id: 'recursos', nombre: 'Recursos', img: 'icono-recursos' }, { id: 'ideas', nombre: '💡 Ideas' }]}
        valor={apartado}
        alCambiar={setApartado}
      />
      {apartado === 'arreglos' && <Arreglos {...props} />}
      {apartado === 'recursos' && <Recursos {...props} />}
      {apartado === 'ideas' && <Ideas {...props} />}
    </div>
  )
}
