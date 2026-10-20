// Fechas en lenguaje natural: "mañana", "el viernes", "el 15 de noviembre", "a las 9 de la noche"…
// Trabaja con fechas locales en formato 'YYYY-MM-DD' para no tener líos de zona horaria.

const sinAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

export const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const deISO = (s) => {
  const [a, m, d] = s.split('-').map(Number)
  return new Date(a, m - 1, d)
}
export const sumarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const hoyISO = () => aISO(new Date())

// Lunes de la semana de una fecha
export function lunesDe(d) {
  const dia = (d.getDay() + 6) % 7
  return sumarDias(d, -dia)
}

const RE_FECHA_NUM = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/
const RE_DIA_MES = new RegExp(`\\b(?:el )?(\\d{1,2}) de (${MESES.join('|')})(?: de (\\d{4}))?\\b`)
const RE_DIA_SEMANA = new RegExp(`\\b(?:el |este |esta |el proximo |el que viene )?(${DIAS.join('|')})( que viene| proximo)?\\b`)
const RE_EL_DIA = /\b(?:el|dia) (\d{1,2})\b(?! de)/
const RE_HORA = /\b(?:a las?|sobre las?|para las?) (\d{1,2})(?:[:.h](\d{2}))?(?: ?(?:h|horas))?(?: (?:de la|por la) (manana|tarde|noche))?\b/
const RE_HORA_SUELTA = /\b(\d{1,2})[:.](\d{2})\b/

// Devuelve { fecha, hora, resto } o null si no hay ninguna pista de fecha
export function extraerFecha(texto, hoy = new Date()) {
  let n = sinAcentos(texto.toLowerCase())
  let fecha = null
  let encontrado = []

  const usar = (re, fn) => {
    if (fecha) return
    const m = n.match(re)
    if (m) {
      const f = fn(m)
      if (f) {
        fecha = f
        encontrado.push(m[0])
      }
    }
  }

  usar(/\bpasado manana\b/, () => sumarDias(hoy, 2))
  usar(/(?<!de la |por la )\bmanana\b/, () => sumarDias(hoy, 1))
  usar(/\b(hoy|esta noche|esta tarde)\b/, () => hoy)
  usar(/\b(este|el) (finde|fin de semana)\b/, () => sumarDias(hoy, (6 - hoy.getDay() + 7) % 7))
  usar(/\bla semana que viene\b|\bla proxima semana\b/, () => sumarDias(lunesDe(hoy), 7))
  usar(RE_DIA_MES, (m) => {
    const mes = MESES.indexOf(m[2])
    let a = m[3] ? Number(m[3]) : hoy.getFullYear()
    let d = new Date(a, mes, Number(m[1]))
    if (!m[3] && d < sumarDias(hoy, -1)) d = new Date(a + 1, mes, Number(m[1]))
    return d
  })
  usar(RE_FECHA_NUM, (m) => {
    const dia = Number(m[1])
    const mes = Number(m[2]) - 1
    if (mes > 11 || dia > 31) return null
    let a = m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : hoy.getFullYear()
    let d = new Date(a, mes, dia)
    if (!m[3] && d < sumarDias(hoy, -1)) d = new Date(a + 1, mes, dia)
    return d
  })
  usar(RE_DIA_SEMANA, (m) => {
    const objetivo = DIAS.indexOf(m[1])
    let dif = (objetivo - hoy.getDay() + 7) % 7
    if (dif === 0 || m[2]) dif = dif === 0 ? 7 : dif
    return sumarDias(hoy, dif)
  })
  usar(RE_EL_DIA, (m) => {
    const dia = Number(m[1])
    if (dia < 1 || dia > 31) return null
    let d = new Date(hoy.getFullYear(), hoy.getMonth(), dia)
    if (d < sumarDias(hoy, -1)) d = new Date(hoy.getFullYear(), hoy.getMonth() + 1, dia)
    return d
  })

  let hora = null
  const mh = n.match(RE_HORA) || n.match(RE_HORA_SUELTA)
  if (mh) {
    let h = Number(mh[1])
    const min = mh[2] ? Number(mh[2]) : 0
    const franja = mh[3]
    if ((franja === 'tarde' || franja === 'noche') && h < 12) h += 12
    if (!franja && h >= 1 && h <= 7 && mh[0].startsWith('a la')) h += 12 // "a las 5" suele ser por la tarde
    if (h < 24 && min < 60) {
      hora = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
      encontrado.push(mh[0])
    }
  }
  if (!fecha && /\besta noche\b/.test(n)) fecha = hoy

  if (!fecha && !hora) return null
  // Quita del texto original las palabras de fecha para dejar un título limpio
  let limpio = texto
  for (const trozo of encontrado) {
    const i = sinAcentos(limpio.toLowerCase()).indexOf(trozo)
    if (i >= 0) limpio = limpio.slice(0, i) + limpio.slice(i + trozo.length)
  }
  const resto = limpio.replace(/\s+/g, ' ').replace(/^[\s,.-]+|[\s,.-]+$/g, '').replace(/\b(el|la|para|de)$/i, '').trim()
  return { fecha: fecha ? aISO(fecha) : aISO(hoy), hora, resto, conFecha: Boolean(fecha) }
}

export function fechaBonita(iso, { conDia = true } = {}) {
  const d = deISO(iso)
  const hoy = new Date()
  const dif = Math.round((d - new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) / 864e5)
  if (dif === 0) return 'Hoy'
  if (dif === 1) return 'Mañana'
  const txt = d.toLocaleDateString('es-ES', conDia ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}
