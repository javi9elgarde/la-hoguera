# La Hoguera

App web instalable para organizar la casa en pareja. Se publica en https://javi9elgarde.github.io/la-hoguera/

## Entrega 1

- Personaje Chispa con burbuja: escribe o dicta (micrófono del teclado) y reparte por palabras clave.
- Lista de la compra en tiempo real, agrupada por pasillo, con "Terminar compra" que apunta el gasto.
- Arreglos del hogar: urgente, pendiente y hechos.
- Gastos: total del mes, quién pagó, últimos 6 meses y por categoría.
- Bandeja para lo que pertenece a secciones futuras (social, citas, coche…).

## Piezas

- `src/clasificador.js`: reglas de palabras clave (pruebas en `test/`).
- `supabase/schema.sql`: tablas, seguridad por filas y tiempo real. Se pega en Supabase → SQL Editor.
- `src/config.js`: URL y clave publishable de Supabase (públicas por diseño).
- Cada push a `main` prueba, construye y publica en GitHub Pages.

## Desarrollo

```
npm install
npm test
npm run dev
```
