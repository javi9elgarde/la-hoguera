// Iconos dibujados por la pareja; si no hay dibujo para algo, se usa un emoji
export default function Icono({ img, emoji }) {
  if (img) return <img className="icono-img" src={`${import.meta.env.BASE_URL}img/${img}.png`} alt="" />
  return <span className="icono">{emoji}</span>
}
