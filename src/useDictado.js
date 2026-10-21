import { useEffect, useRef, useState } from 'react'

// Dictado con el reconocimiento de voz del navegador (Chrome en Android, Safari en iPhone).
// Si el navegador no lo tiene, `disponible` es false y se sigue usando el micro del teclado.
const Reconocimiento = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

export function useDictado(alTexto) {
  const [escuchando, setEscuchando] = useState(false)
  const [error, setError] = useState(null)
  const rec = useRef(null)
  const base = useRef('')
  const alTextoRef = useRef(alTexto)
  alTextoRef.current = alTexto

  useEffect(() => () => rec.current?.abort(), [])

  function empezar(textoActual = '') {
    if (!Reconocimiento) return
    setError(null)
    const r = new Reconocimiento()
    r.lang = 'es-ES'
    r.interimResults = true
    r.continuous = false
    base.current = textoActual ? textoActual.trim() + ' ' : ''
    r.onresult = (e) => {
      let dicho = ''
      for (const res of e.results) dicho += res[0].transcript
      alTextoRef.current(base.current + dicho)
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setError('Da permiso al micrófono en los ajustes del navegador.')
      else if (e.error !== 'no-speech' && e.error !== 'aborted') setError('No te he oído bien, prueba otra vez.')
    }
    r.onend = () => setEscuchando(false)
    rec.current = r
    try {
      r.start()
      setEscuchando(true)
    } catch {
      setEscuchando(false)
    }
  }

  function parar() {
    rec.current?.stop()
  }

  return { disponible: Boolean(Reconocimiento), escuchando, error, empezar, parar }
}
