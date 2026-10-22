import { useState } from 'react'
import Segmentos from '../componentes/Segmentos.jsx'
import Compra from './Compra.jsx'
import Cosas from './Cosas.jsx'
import Gastos from './Gastos.jsx'
import Icono from '../componentes/Icono.jsx'

export default function Compras(props) {
  const [apartado, setApartado] = useState(props.apartado || 'super')
  return (
    <div className="pantalla">
      <h1><Icono img="icono-compras" /> Compras</h1>
      <Segmentos
        opciones={[{ id: 'super', nombre: '🍎 Comida' }, { id: 'cosas', nombre: '📦 Otros' }, { id: 'gastos', nombre: '💶 Gastos' }]}
        valor={apartado}
        alCambiar={setApartado}
      />
      {apartado === 'super' && <Compra {...props} />}
      {apartado === 'cosas' && <Cosas {...props} />}
      {apartado === 'gastos' && <Gastos {...props} />}
    </div>
  )
}
