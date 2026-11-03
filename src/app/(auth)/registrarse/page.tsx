import { redirect } from "next/navigation";

/**
 * El registro público está cerrado: las cuentas las abre el administrador en
 * `/admin` (ver `src/server/auth/cuentas.ts`). La ruta se conserva para que los
 * enlaces viejos lleven al ingreso en vez de a un 404.
 */
export default function PaginaRegistro() {
  redirect("/login");
}
