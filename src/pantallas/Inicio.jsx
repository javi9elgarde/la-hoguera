import { useState } from 'react'
import Personaje from '../componentes/Personaje.jsx'
import Avatar from '../componentes/Avatar.jsx'
import Burbuja from '../componentes/Burbuja.jsx'
import { useTabla } from '../useTabla.js'
import { borrar, euros } from '../datos.js'
import { NOMBRES_SECCION } from '../clasificador.js'

const FRASES = ['¿Qué apuntamos hoy?', 'Tócame y dime algo', 'Aquí estoy, calentito', '¿Falta algo en casa?']

export default function Inicio({ sesion, irA, avisar }) {
  const { hogar, yo, miembros } = sesion
  const [abierta, setAbierta] = useState(false)
  const [animo, setAnimo] = useState('reposo')
  const [frase] = useState(() => FRASES[Math.floor(Math.random() * FRASES.length)])

  const tareas = useTabla('tareas', hogar.id)
  const compra = useTabla('items_compra', hogar.id)
  const gastos = useTabla('gastos', hogar.id)
  const entradas = useTabla('entradas', hogar.id, { asc: false })

  const urgentes = tareas.filas.filter((t) => t.prioridad === 'urgente' && t.estado === 'pendiente')
  const porComprar = compra.filas.filter((i) => !i.comprado)
  const mes = new Date().toISOString().slice(0, 7)
  const totalMes = gastos.filas.filter((g) => g.fecha.startsWith(mes)).reduce((s, g) => s + Number(g.importe), 0)
  const pareja = miembros.find((m) => m.id !== yo.id)

  function abrir() {
    setAbierta(true)
    setAnimo('escuchando')
  }

  function cerrar() {
    setAbierta(false)
    setAnimo('reposo')
  }

  function guardado(hechos, ordenes) {
    setAbierta(false)
    setAnimo('contento')
    setTimeout(() => setAnimo('reposo'), 2500)
    const resumen = ordenes.length === 1 ? `Guardado en ${NOMBRES_SECCION[ordenes[0].seccion]}` : `Guardadas ${ordenes.length} cosas`
    avisar(resumen, async () => {
      for (const h of hechos) await borrar(h.tabla, h.id)
    })
    tareas.recargar(); compra.recargar(); gastos.recargar(); entradas.recargar()
  }

  return (
    <div className="pantalla inicio">
      <div className={`escena ${urgentes.length ? 'con-urgencias' : ''}`}>
        <div className="pareja">
          <Avatar miembro={yo} tamano={44} />
          <Personaje animo={animo} tamano={180} onClick={abrir} intenso={urgentes.length > 0} />
          {pareja ? <Avatar miembro={pareja} tamano={44} /> : <span className="avatar vacio" title="Falta tu pareja">?</span>}
        </div>
        <p className="bocadillo" onClick={abrir}>{abierta ? 'Te escucho…' : frase}</p>
      </div>

      <div className="tarjetas">
        <button className={`tarjeta resumen ${urgentes.length ? 'roja' : ''}`} onClick={() => irA('arreglos')}>
          <span className="numero">{urgentes.length}</span>
          <span>{urgentes.length === 1 ? 'urgencia' : 'urgencias'}</span>
        </button>
        <button className="tarjeta resumen" onClick={() => irA('compra')}>
          <span className="numero">{porComprar.length}</span>
          <span>por comprar</span>
        </button>
        <button className="tarjeta resumen" onClick={() => irA('gastos')}>
          <span className="numero pequeno">{euros(totalMes)}</span>
          <span>este mes</span>
        </button>
      </div>

      {urgentes.length > 0 && (
        <section className="tarjeta">
          <h2>🔥 Urgente</h2>
          <ul className="lista">
            {urgentes.slice(0, 3).map((t) => <li key={t.id} onClick={() => irA('arreglos')}>{t.titulo}{t.estancia && <span className="suave"> · {t.estancia}</span>}</li>)}
          </ul>
        </section>
      )}

      {entradas.filas.length > 0 && (
        <section className="tarjeta">
          <h2>📥 Bandeja</h2>
          <p className="suave pequeno">Cosas para secciones que llegan en próximas entregas.</p>
          <ul className="lista">
            {entradas.filas.map((e) => (
              <li key={e.id} className="fila-lista">
                <span>
                  {e.texto}
                  {e.seccion_sugerida && <span className="chip">{NOMBRES_SECCION[e.seccion_sugerida]}</span>}
                </span>
                <button className="quitar" aria-label="Borrar" onClick={() => borrar('entradas', e.id).then(entradas.recargar)}>✕</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!pareja && (
        <section className="tarjeta suave-fondo">
          <h2>Falta tu pareja</h2>
          <p>Pásale este código para que se una: <strong className="codigo">{hogar.codigo}</strong></p>
        </section>
      )}

      {abierta && <Burbuja contexto={{ hogarId: hogar.id, miembroId: yo.id }} alCambiarAnimo={setAnimo} alCerrar={cerrar} alGuardar={guardado} />}
    </div>
  )
}
