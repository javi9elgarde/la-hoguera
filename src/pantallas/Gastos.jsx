import { useMemo, useState } from 'react'
import { supabase } from '../supabase.js'
import { useTabla } from '../useTabla.js'
import { CATEGORIAS_GASTO } from '../clasificador.js'
import { euros } from '../datos.js'
import Avatar from '../componentes/Avatar.jsx'

const COLOR = { comida: '#e8833a', hogar: '#8a5a3b', coche: '#4a90c2', facturas: '#7a6fb0', ocio: '#e05d75', salud: '#3fa37a', ropa: '#d4a72c', otros: '#9a8f86' }
const ICONO = { compra: '🛒', tarea: '🔧' }
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const claveMes = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export default function Gastos({ sesion, avisar }) {
  const { hogar, yo, miembros } = sesion
  const { filas, recargar } = useTabla('gastos', hogar.id, { orden: 'fecha', asc: false })
  const [mes, setMes] = useState(() => claveMes(new Date()))
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState({ importe: '', categoria: 'comida', concepto: '', fecha: new Date().toISOString().slice(0, 10), pagado_por: yo.id })

  const delMes = filas.filter((g) => g.fecha.startsWith(mes))
  const total = delMes.reduce((s, g) => s + Number(g.importe), 0)

  const porCategoria = useMemo(() => {
    const m = {}
    for (const g of delMes) m[g.categoria] = (m[g.categoria] || 0) + Number(g.importe)
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [delMes])

  // Últimos 6 meses hasta el mes elegido
  const historico = useMemo(() => {
    const [a, m] = mes.split('-').map(Number)
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(a, m - 1 - (5 - i), 1)
      const k = claveMes(d)
      return { k, etiqueta: MESES[d.getMonth()], total: filas.filter((g) => g.fecha.startsWith(k)).reduce((s, g) => s + Number(g.importe), 0) }
    })
  }, [filas, mes])
  const maximo = Math.max(1, ...historico.map((h) => h.total))

  const porPersona = miembros.map((p) => ({ p, total: delMes.filter((g) => g.pagado_por === p.id).reduce((s, g) => s + Number(g.importe), 0) }))

  function moverMes(delta) {
    const [a, m] = mes.split('-').map(Number)
    setMes(claveMes(new Date(a, m - 1 + delta, 1)))
  }

  async function guardar(e) {
    e.preventDefault()
    const importe = Number(String(form.importe).replace(',', '.'))
    if (!(importe > 0)) return
    await supabase.from('gastos').insert({ hogar_id: hogar.id, ...form, importe, concepto: form.concepto || null })
    setForm({ ...form, importe: '', concepto: '' })
    setAbierto(false)
    recargar()
  }

  async function borrarGasto(g) {
    await supabase.from('gastos').delete().eq('id', g.id)
    recargar()
    avisar('Gasto borrado', async () => {
      const { id, ...resto } = g
      await supabase.from('gastos').insert(resto)
    })
  }

  const [a, m] = mes.split('-').map(Number)

  return (
    <div className="pantalla">
      <h1>💶 Gastos</h1>
      <div className="selector-mes">
        <button className="boton" onClick={() => moverMes(-1)} aria-label="Mes anterior">‹</button>
        <strong>{MESES[m - 1]} {a}</strong>
        <button className="boton" onClick={() => moverMes(1)} aria-label="Mes siguiente">›</button>
      </div>

      <section className="tarjeta total">
        <span className="suave">Total del mes</span>
        <span className="numero grande">{euros(total)}</span>
        <div className="por-persona">
          {porPersona.map(({ p, total: t }) => (
            <span key={p.id}><Avatar miembro={p} tamano={22} /> {euros(t)}</span>
          ))}
        </div>
      </section>

      {!abierto ? (
        <button className="boton principal ancho" onClick={() => setAbierto(true)}>+ Apuntar gasto</button>
      ) : (
        <form className="tarjeta formulario" onSubmit={guardar}>
          <div className="fila">
            <input autoFocus className="importe" inputMode="decimal" placeholder="Importe €" required value={form.importe} onChange={(e) => setForm({ ...form, importe: e.target.value })} />
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              {CATEGORIAS_GASTO.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <input placeholder="Concepto (opcional)" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} />
          <div className="fila">
            <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            <select value={form.pagado_por} onChange={(e) => setForm({ ...form, pagado_por: e.target.value })}>
              {miembros.map((p) => <option key={p.id} value={p.id}>Pagó {p.nombre}</option>)}
            </select>
          </div>
          <div className="fila">
            <button type="button" className="boton" onClick={() => setAbierto(false)}>Cancelar</button>
            <button className="boton principal">Guardar</button>
          </div>
        </form>
      )}

      <section className="tarjeta">
        <h2>Últimos 6 meses</h2>
        <div className="barras" role="img" aria-label="Gasto total por mes">
          {historico.map((h) => (
            <button key={h.k} className={`barra ${h.k === mes ? 'actual' : ''}`} onClick={() => setMes(h.k)}>
              <span className="valor">{h.total ? Math.round(h.total) : ''}</span>
              <span className="relleno" style={{ height: `${(h.total / maximo) * 100}%` }} />
              <span className="etiqueta">{h.etiqueta}</span>
            </button>
          ))}
        </div>
      </section>

      {porCategoria.length > 0 && (
        <section className="tarjeta">
          <h2>Por categoría</h2>
          <ul className="categorias">
            {porCategoria.map(([c, v]) => (
              <li key={c}>
                <span className="nombre-cat">{c}</span>
                <span className="pista-barra"><span style={{ width: `${(v / porCategoria[0][1]) * 100}%`, background: COLOR[c] }} /></span>
                <span className="cifra">{euros(v)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="tarjeta">
        <h2>Movimientos</h2>
        {!delMes.length && <p className="suave">Sin gastos este mes.</p>}
        <ul className="lista">
          {delMes.map((g) => (
            <li key={g.id} className="movimiento">
              <span className="punto" style={{ background: COLOR[g.categoria] }} />
              <div className="texto">
                <span>{ICONO[g.origen_tipo] ? `${ICONO[g.origen_tipo]} ` : ''}{g.concepto || g.categoria}</span>
                <span className="suave pequeno">{new Date(g.fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · {g.categoria}</span>
              </div>
              <Avatar miembro={miembros.find((p) => p.id === g.pagado_por)} tamano={22} />
              <strong>{euros(g.importe)}</strong>
              <button className="quitar" onClick={() => borrarGasto(g)} aria-label="Borrar">✕</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
