import { useMemo, useState } from 'react'
import { supabase } from '../supabase.js'
import { useTabla } from '../useTabla.js'
import { aISO, deISO, hoyISO, fechaBonita } from '../fechas.js'
import Avatar from '../componentes/Avatar.jsx'
import Icono from '../componentes/Icono.jsx'

export const TIPOS = {
  plan: { nombre: 'Plan', icono: '🎉', color: '#4a90c2' },
  cumpleanos: { nombre: 'Cumpleaños', icono: '🎂', color: '#d4a72c' },
  cita: { nombre: 'Cita', icono: '💕', color: '#e05d75' },
  otro: { nombre: 'Otro', icono: '📌', color: '#9a8f86' },
}
const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// Próxima vez que toca un evento (los cumpleaños se repiten cada año)
export function proximaFecha(ev, desde = hoyISO()) {
  if (!ev.anual) return ev.fecha
  const d = deISO(ev.fecha)
  const hoy = deISO(desde)
  let f = new Date(hoy.getFullYear(), d.getMonth(), d.getDate())
  if (f < hoy) f = new Date(hoy.getFullYear() + 1, d.getMonth(), d.getDate())
  return aISO(f)
}

const vacio = () => ({ titulo: '', tipo: 'plan', fecha: hoyISO(), hora: '', lugar: '', nota: '' })

export default function Agenda({ sesion, avisar }) {
  const { hogar, yo, miembros } = sesion
  const { filas, recargar } = useTabla('eventos', hogar.id, { orden: 'fecha' })
  const [filtro, setFiltro] = useState('todo')
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [diaElegido, setDiaElegido] = useState(null)
  const [form, setForm] = useState(null)
  const [verPasados, setVerPasados] = useState(false)

  const hoy = hoyISO()
  const conProxima = useMemo(() => filas.map((e) => ({ ...e, proxima: proximaFecha(e) })), [filas])
  const filtrados = conProxima.filter((e) => filtro === 'todo' || e.tipo === filtro)
  const proximos = filtrados.filter((e) => e.proxima >= hoy).sort((a, b) => (a.proxima + (a.hora || '')).localeCompare(b.proxima + (b.hora || '')))
  const pasados = filtrados.filter((e) => e.proxima < hoy).sort((a, b) => b.fecha.localeCompare(a.fecha))

  // Eventos de cada día del mes visible (incluye cumpleaños repetidos)
  const celdas = useMemo(() => {
    const primero = (mes.getDay() + 6) % 7
    const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
    const lista = []
    for (let i = 0; i < primero; i++) lista.push(null)
    for (let d = 1; d <= diasMes; d++) {
      const iso = aISO(new Date(mes.getFullYear(), mes.getMonth(), d))
      const ese = filtrados.filter((e) => (e.anual ? e.fecha.slice(5) === iso.slice(5) && e.fecha <= iso : e.fecha === iso))
      lista.push({ iso, d, eventos: ese })
    }
    return lista
  }, [mes, filtrados])

  async function guardar(e) {
    e.preventDefault()
    const f = form
    const fila = { titulo: f.titulo.trim(), tipo: f.tipo, fecha: f.fecha, hora: f.hora || null, lugar: f.lugar || null, nota: f.nota || null, anual: f.tipo === 'cumpleanos' }
    if (f.id) await supabase.from('eventos').update(fila).eq('id', f.id)
    else await supabase.from('eventos').insert({ ...fila, hogar_id: hogar.id, creado_por: yo.id })
    setForm(null)
    recargar()
  }

  async function borrarEvento(ev) {
    const { proxima, ...original } = ev
    await supabase.from('eventos').delete().eq('id', ev.id)
    setForm(null)
    recargar()
    avisar('Evento borrado', async () => {
      const { id, ...resto } = original
      await supabase.from('eventos').insert(resto)
    })
  }

  const autor = (id) => miembros.find((m) => m.id === id)
  const nombreMes = mes.toLocaleDateString('es-ES', { month: 'long' }).replace(/^./, (c) => c.toUpperCase()) + ` ${mes.getFullYear()}`
  const delDia = diaElegido ? celdas.find((c) => c?.iso === diaElegido)?.eventos || [] : null

  const Evento = ({ ev }) => {
    const t = TIPOS[ev.tipo]
    const anios = ev.tipo === 'cumpleanos' && ev.proxima.slice(0, 4) - ev.fecha.slice(0, 4)
    return (
      <li className="evento" onClick={() => setForm({ ...ev, hora: ev.hora?.slice(0, 5) || '', lugar: ev.lugar || '', nota: ev.nota || '' })}>
        <span className="icono-evento" style={{ background: t.color }}>{t.icono}</span>
        <div className="texto">
          <span>{ev.titulo}</span>
          <span className="suave pequeno">
            {fechaBonita(ev.proxima)}
            {ev.hora ? ` · ${ev.hora.slice(0, 5)}` : ''}
            {ev.lugar ? ` · ${ev.lugar}` : ''}
            {anios > 0 ? ` · cumple ${anios}` : ''}
          </span>
        </div>
        <Avatar miembro={autor(ev.creado_por)} tamano={22} />
      </li>
    )
  }

  return (
    <div className="pantalla">
      <h1><Icono img="icono-agenda" /> Agenda</h1>
      <div className="filtros">
        {[['todo', 'Todo'], ...Object.entries(TIPOS).map(([k, v]) => [k, `${v.icono} ${v.nombre}`])].map(([k, n]) => (
          <button key={k} className={`chip boton-chip ${filtro === k ? 'elegido' : ''}`} onClick={() => setFiltro(k)}>{n}</button>
        ))}
      </div>

      <section className="tarjeta calendario">
        <div className="selector-mes">
          <button className="boton" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} aria-label="Mes anterior">‹</button>
          <strong>{nombreMes}</strong>
          <button className="boton" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} aria-label="Mes siguiente">›</button>
        </div>
        <div className="rejilla-mes">
          {DIAS_CORTOS.map((d) => <span key={d} className="cabecera-semana">{d}</span>)}
          {celdas.map((c, i) => c ? (
            <button key={c.iso} className={`celda ${c.iso === hoy ? 'hoy' : ''} ${c.iso === diaElegido ? 'elegida' : ''}`} onClick={() => setDiaElegido(c.iso === diaElegido ? null : c.iso)}>
              <span>{c.d}</span>
              <span className="puntos-dia">{c.eventos.slice(0, 3).map((e) => <i key={e.id} style={{ background: TIPOS[e.tipo].color }} />)}</span>
            </button>
          ) : <span key={`v${i}`} />)}
        </div>
      </section>

      {form ? (
        <form className="tarjeta formulario" onSubmit={guardar}>
          <h2>{form.id ? 'Editar' : 'Nuevo evento'}</h2>
          <input required autoFocus placeholder="Qué (ej. Cena con Marta y Luis)" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          <div className="filtros">
            {Object.entries(TIPOS).map(([k, v]) => (
              <button type="button" key={k} className={`chip boton-chip ${form.tipo === k ? 'elegido' : ''}`} onClick={() => setForm({ ...form, tipo: k })}>{v.icono} {v.nombre}</button>
            ))}
          </div>
          <div className="fila">
            <input type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            <input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} />
          </div>
          {form.tipo === 'cumpleanos' && <p className="suave pequeno">Pon la fecha de nacimiento si la sabes: así veréis cuántos cumple. Se repite cada año.</p>}
          <input placeholder="Dónde (opcional)" value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} />
          <textarea rows={2} placeholder="Notas (regalo, reserva…)" value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} />
          <div className="fila">
            <button type="button" className="boton" onClick={() => setForm(null)}>Cancelar</button>
            <button className="boton principal">Guardar</button>
          </div>
          {form.id && <button type="button" className="boton enlace" onClick={() => borrarEvento(form)}>Borrar evento</button>}
        </form>
      ) : (
        <button className="boton principal ancho" onClick={() => setForm({ ...vacio(), fecha: diaElegido || hoy, tipo: filtro !== 'todo' ? filtro : 'plan' })}>+ Añadir {diaElegido ? `el ${deISO(diaElegido).getDate()}` : 'evento'}</button>
      )}

      {delDia && (
        <section className="tarjeta">
          <h2>{fechaBonita(diaElegido)}</h2>
          {delDia.length ? <ul className="lista">{delDia.map((e) => <Evento key={e.id} ev={{ ...e, proxima: diaElegido }} />)}</ul> : <p className="suave">Nada este día.</p>}
        </section>
      )}

      <section className="tarjeta">
        <h2>Próximamente</h2>
        {proximos.length ? <ul className="lista">{proximos.slice(0, 20).map((e) => <Evento key={e.id} ev={e} />)}</ul> : <p className="suave">Nada a la vista. Dile a Chispa “el sábado cena con Marta”.</p>}
      </section>

      {pasados.length > 0 && (
        <section className="tarjeta">
          <button className="boton enlace" onClick={() => setVerPasados(!verPasados)}>{verPasados ? 'Ocultar' : 'Ver'} pasados ({pasados.length})</button>
          {verPasados && <ul className="lista">{pasados.slice(0, 30).map((e) => <Evento key={e.id} ev={e} />)}</ul>}
        </section>
      )}
    </div>
  )
}
