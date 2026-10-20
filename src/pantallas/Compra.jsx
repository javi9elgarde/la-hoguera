import { useState } from 'react'
import { supabase } from '../supabase.js'
import { useTabla } from '../useTabla.js'
import { clasificar, reconstruir } from '../clasificador.js'
import Avatar from '../componentes/Avatar.jsx'

const PASILLOS = {
  fruta: '🍎 Fruta', verdura: '🥬 Verdura', lacteos: '🥛 Lácteos y huevos', carne: '🍗 Carne', pescado: '🐟 Pescado',
  panaderia: '🥖 Panadería', despensa: '🥫 Despensa', bebidas: '🧃 Bebidas', congelados: '🧊 Congelados',
  limpieza: '🧽 Limpieza', higiene: '🧴 Higiene', otros: '🛍️ Otros',
}

export default function Compra({ sesion, avisar }) {
  const { hogar, yo, miembros } = sesion
  const { filas, recargar } = useTabla('items_compra', hogar.id)
  const [nuevo, setNuevo] = useState('')
  const [cerrando, setCerrando] = useState(false)
  const [importe, setImporte] = useState('')

  const pendientes = filas.filter((i) => !i.comprado)
  const enCarro = filas.filter((i) => i.comprado)
  const grupos = Object.keys(PASILLOS).map((p) => [p, pendientes.filter((i) => i.pasillo === p)]).filter(([, l]) => l.length)

  async function anadir(e) {
    e.preventDefault()
    if (!nuevo.trim()) return
    // Reutiliza el clasificador para separar "leche, pan y huevos" y detectar el pasillo
    const ordenes = clasificar(nuevo).map((o) => (o.seccion === 'compra' ? o : reconstruir(o.texto, 'compra')))
    const filasNuevas = ordenes
      .filter((o) => o.campos.producto)
      .map((o) => ({ hogar_id: hogar.id, producto: o.campos.producto, cantidad: o.campos.cantidad, pasillo: o.campos.pasillo, anadido_por: yo.id }))
    if (filasNuevas.length) await supabase.from('items_compra').insert(filasNuevas)
    setNuevo('')
    recargar()
  }

  async function alternar(item) {
    await supabase.from('items_compra').update({ comprado: !item.comprado }).eq('id', item.id)
    recargar()
  }

  async function borrarItem(item) {
    await supabase.from('items_compra').delete().eq('id', item.id)
    recargar()
    avisar(`Quitado: ${item.producto}`, async () => {
      const { id, ...resto } = item
      await supabase.from('items_compra').insert(resto)
    })
  }

  async function terminar(e) {
    e.preventDefault()
    const n = Number(importe.replace(',', '.'))
    if (n > 0) {
      await supabase.from('gastos').insert({ hogar_id: hogar.id, importe: n, categoria: 'comida', concepto: 'Compra', pagado_por: yo.id, origen_tipo: 'compra' })
    }
    await supabase.from('items_compra').delete().in('id', enCarro.map((i) => i.id))
    setCerrando(false)
    setImporte('')
    recargar()
    avisar(n > 0 ? 'Compra terminada y gasto apuntado' : 'Compra terminada')
  }

  const autor = (id) => miembros.find((m) => m.id === id)

  return (
    <div className="pantalla">
      <h1>🛒 Lista de la compra</h1>
      <form className="anadir" onSubmit={anadir}>
        <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Añadir: leche, pan y huevos" />
        <button className="boton principal" disabled={!nuevo.trim()}>+</button>
      </form>

      {!pendientes.length && !enCarro.length && <p className="vacio-lista">La lista está vacía. ¡Qué bien!</p>}

      {grupos.map(([pasillo, lista]) => (
        <section key={pasillo} className="tarjeta">
          <h2>{PASILLOS[pasillo]}</h2>
          <ul className="lista">
            {lista.map((i) => (
              <li key={i.id} className="item-compra">
                <button className="casilla" onClick={() => alternar(i)} aria-label={`Marcar ${i.producto}`} />
                <span className="texto" onClick={() => alternar(i)}>
                  {i.producto}
                  {i.cantidad && <span className="suave"> · {i.cantidad}</span>}
                </span>
                <Avatar miembro={autor(i.anadido_por)} tamano={22} />
                <button className="quitar" onClick={() => borrarItem(i)} aria-label="Quitar">✕</button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {enCarro.length > 0 && (
        <section className="tarjeta carro">
          <h2>✅ En el carro ({enCarro.length})</h2>
          <ul className="lista">
            {enCarro.map((i) => (
              <li key={i.id} className="item-compra hecho">
                <button className="casilla marcada" onClick={() => alternar(i)} aria-label={`Desmarcar ${i.producto}`}>✓</button>
                <span className="texto" onClick={() => alternar(i)}>{i.producto}</span>
              </li>
            ))}
          </ul>
          {!cerrando ? (
            <button className="boton principal ancho" onClick={() => setCerrando(true)}>Terminar compra</button>
          ) : (
            <form className="anadir" onSubmit={terminar}>
              <input autoFocus inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="Importe del ticket (€), opcional" />
              <button className="boton principal">Hecho</button>
            </form>
          )}
        </section>
      )}
    </div>
  )
}
