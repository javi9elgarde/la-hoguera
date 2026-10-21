// Chispa, el personaje de la hoguera. Ilustraciones de Javi y su pareja, una por estado de ánimo.
const ANIMOS = ['reposo', 'escuchando', 'pensando', 'contento', 'duda']
const ruta = (animo) => `${import.meta.env.BASE_URL}img/chispa-${animo}.png`

// Precarga para que el cambio de cara sea instantáneo
if (typeof window !== 'undefined') {
  for (const a of ANIMOS) {
    const img = new Image()
    img.src = ruta(a)
  }
}

export default function Personaje({ animo = 'reposo', tamano = 200, onClick, intenso = false }) {
  const cara = ANIMOS.includes(animo) ? animo : 'reposo'
  return (
    <button className={`personaje animo-${cara} ${intenso ? 'intenso' : ''}`} onClick={onClick} aria-label="Hablar con Chispa" type="button">
      <img className="llama" src={ruta(cara)} width={tamano} height={tamano} alt="" draggable="false" />
    </button>
  )
}
