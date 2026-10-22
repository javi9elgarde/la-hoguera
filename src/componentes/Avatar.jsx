export const rutaAvatar = (a) => `${import.meta.env.BASE_URL}img/${a}.png`

const sinAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Cada uno tiene su propia cara dibujada: Javi el chico, Mariam la chica
export function avatarDe(miembro) {
  const n = sinAcentos(miembro?.nombre || '')
  if (n.startsWith('javi')) return 'avatar-1'
  if (n.startsWith('mariam')) return 'avatar-2'
  return null
}

export default function Avatar({ miembro, tamano = 36 }) {
  if (!miembro) return null
  const dibujo = avatarDe(miembro)
  if (dibujo) {
    return (
      <span className="avatar con-imagen" style={{ width: tamano, height: tamano, borderColor: miembro.color }} title={miembro.nombre}>
        <img src={rutaAvatar(dibujo)} alt={miembro.nombre} />
      </span>
    )
  }
  return (
    <span className="avatar" style={{ background: miembro.color, width: tamano, height: tamano, fontSize: tamano * 0.45 }} title={miembro.nombre}>
      {miembro.nombre.charAt(0).toUpperCase()}
    </span>
  )
}
