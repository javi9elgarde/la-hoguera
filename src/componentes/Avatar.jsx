export const AVATARES = ['avatar-1', 'avatar-2']
export const rutaAvatar = (a) => `${import.meta.env.BASE_URL}img/${a}.png`

export default function Avatar({ miembro, tamano = 36 }) {
  if (!miembro) return null
  if (miembro.avatar && AVATARES.includes(miembro.avatar)) {
    return (
      <span className="avatar con-imagen" style={{ width: tamano, height: tamano, borderColor: miembro.color }} title={miembro.nombre}>
        <img src={rutaAvatar(miembro.avatar)} alt={miembro.nombre} />
      </span>
    )
  }
  return (
    <span className="avatar" style={{ background: miembro.color, width: tamano, height: tamano, fontSize: tamano * 0.45 }} title={miembro.nombre}>
      {miembro.nombre.charAt(0).toUpperCase()}
    </span>
  )
}
