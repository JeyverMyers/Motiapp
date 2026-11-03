import type { Route } from "next";

/**
 * Ayudas para construir URLs que `typedRoutes` acepta.
 *
 * Con `typedRoutes` activado, Next valida los `href` literales contra las rutas
 * que existen de verdad: escribir `/app/inventario` mal es un error de
 * compilación. Eso vale la pena y por eso la opción está encendida.
 *
 * El precio es que una URL armada en tiempo de ejecución (por ejemplo una
 * paginación que conserva los filtros) es un `string` cualquiera y TypeScript no
 * puede saber a qué ruta corresponde. Estas funciones concentran ese único
 * punto de conversión, en vez de repartir `as Route` por toda la interfaz.
 */

/** Marca una cadena ya construida como ruta válida. */
export function comoRuta(ruta: string): Route {
  return ruta as Route;
}

/**
 * Construye una URL con parámetros de búsqueda a partir de una ruta base.
 * Los valores `undefined` se omiten, así que es seguro pasar parámetros
 * opcionales de `searchParams` directamente.
 */
export function rutaConParametros(
  base: string,
  parametros: Record<string, string | string[] | undefined>,
): Route {
  const busqueda = new URLSearchParams();

  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor === undefined || valor === "") continue;
    busqueda.set(clave, Array.isArray(valor) ? (valor[0] ?? "") : valor);
  }

  const cadena = busqueda.toString();
  return comoRuta(cadena ? `${base}?${cadena}` : base);
}
