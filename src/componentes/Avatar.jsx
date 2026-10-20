export default function Avatar({ miembro, tamano = 36 }) {
  if (!miembro) return null
  return (
    <span className="avatar" style={{ background: miembro.color, width: tamano, height: tamano, fontSize: tamano * 0.45 }} title={miembro.nombre}>
      {miembro.nombre.charAt(0).toUpperCase()}
    </span>
  )
}
