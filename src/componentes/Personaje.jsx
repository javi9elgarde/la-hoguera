// Chispa, el personaje de la hoguera. Ilustración SVG con 5 estados de ánimo.
const OSCURO = '#3b2416'

function Cara({ animo }) {
  switch (animo) {
    case 'escuchando':
      return (
        <g>
          <ellipse cx="85" cy="144" rx="7" ry="9" fill={OSCURO} />
          <ellipse cx="115" cy="144" rx="7" ry="9" fill={OSCURO} />
          <circle cx="87" cy="141" r="2.5" fill="#fff" />
          <circle cx="117" cy="141" r="2.5" fill="#fff" />
          <ellipse cx="100" cy="166" rx="6" ry="7" fill={OSCURO} />
        </g>
      )
    case 'pensando':
      return (
        <g>
          <ellipse cx="85" cy="144" rx="5" ry="7" fill={OSCURO} />
          <ellipse cx="115" cy="144" rx="5" ry="7" fill={OSCURO} />
          <circle cx="86" cy="139" r="2" fill="#fff" />
          <circle cx="116" cy="139" r="2" fill="#fff" />
          <path d="M92 166 h16" stroke={OSCURO} strokeWidth="4" strokeLinecap="round" />
          <g className="puntos" fill={OSCURO}>
            <circle cx="150" cy="40" r="5" />
            <circle cx="166" cy="28" r="6" />
            <circle cx="184" cy="14" r="7" />
          </g>
        </g>
      )
    case 'contento':
      return (
        <g fill="none" stroke={OSCURO} strokeWidth="4.5" strokeLinecap="round">
          <path d="M78 147 q7 -10 14 0" />
          <path d="M108 147 q7 -10 14 0" />
          <path d="M86 160 q14 16 28 0" fill={OSCURO} />
        </g>
      )
    case 'duda':
      return (
        <g>
          <ellipse cx="85" cy="145" rx="5" ry="7" fill={OSCURO} />
          <ellipse cx="115" cy="146" rx="4" ry="4" fill={OSCURO} />
          <path d="M108 133 l14 -4" stroke={OSCURO} strokeWidth="4" strokeLinecap="round" />
          <path d="M90 167 q5 -5 10 0 q5 5 10 0" fill="none" stroke={OSCURO} strokeWidth="4" strokeLinecap="round" />
          <text x="160" y="60" fontSize="44" fontWeight="800" fill={OSCURO} fontFamily="Nunito, sans-serif">?</text>
        </g>
      )
    default:
      return (
        <g>
          <ellipse cx="85" cy="145" rx="5" ry="7" fill={OSCURO} />
          <ellipse cx="115" cy="145" rx="5" ry="7" fill={OSCURO} />
          <circle cx="86" cy="142" r="2" fill="#fff" />
          <circle cx="116" cy="142" r="2" fill="#fff" />
          <path d="M91 161 q9 8 18 0" fill="none" stroke={OSCURO} strokeWidth="4" strokeLinecap="round" />
        </g>
      )
  }
}

export default function Personaje({ animo = 'reposo', tamano = 200, onClick, intenso = false }) {
  return (
    <button className={`personaje animo-${animo} ${intenso ? 'intenso' : ''}`} onClick={onClick} aria-label="Hablar con Chispa" type="button">
      <svg viewBox="0 0 200 230" width={tamano} height={tamano * 1.15} aria-hidden="true">
        <ellipse cx="100" cy="222" rx="70" ry="7" fill="#000" opacity="0.08" />
        <g className="troncos">
          <rect x="38" y="190" width="124" height="22" rx="11" fill="#8a5a3b" transform="rotate(-10 100 201)" />
          <rect x="38" y="190" width="124" height="22" rx="11" fill="#a06b46" transform="rotate(10 100 201)" />
          <circle cx="44" cy="190" r="7" fill="#c99470" />
          <circle cx="156" cy="190" r="7" fill="#c99470" />
        </g>
        <g className="llama">
          <path d="M100 18 C128 58 166 88 160 140 C156 180 130 198 100 198 C70 198 42 180 40 140 C37 102 66 84 78 48 C86 70 96 74 100 18 Z" fill="#f28c38" />
          <path d="M100 78 C122 104 140 126 136 154 C133 176 118 188 100 188 C82 188 67 176 64 154 C61 128 86 112 100 78 Z" fill="#ffc94d" />
          <ellipse cx="74" cy="158" rx="8" ry="5" fill="#ff8a7a" opacity="0.55" />
          <ellipse cx="126" cy="158" rx="8" ry="5" fill="#ff8a7a" opacity="0.55" />
          <Cara animo={animo} />
        </g>
      </svg>
    </button>
  )
}
