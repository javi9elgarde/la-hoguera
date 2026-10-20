// Selector de apartados dentro de una pestaña (Súper / Cosas, Semana / Recetas…)
export default function Segmentos({ opciones, valor, alCambiar }) {
  return (
    <div className="segmentos" role="tablist">
      {opciones.map((o) => (
        <button key={o.id} role="tab" aria-selected={valor === o.id} className={valor === o.id ? 'activo' : ''} onClick={() => alCambiar(o.id)}>
          {o.nombre}
          {o.cuenta > 0 && <span className="cuenta">{o.cuenta}</span>}
        </button>
      ))}
    </div>
  )
}
