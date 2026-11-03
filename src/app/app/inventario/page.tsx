import Link from "next/link";
import { redirect } from "next/navigation";

import { TablaInventario } from "@/components/app/inventario/tabla-inventario";
import { Paginacion } from "@/components/app/paginacion";
import { TarjetaIndicador } from "@/components/app/tarjeta-indicador";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { Entrada, Selector } from "@/components/ui/formulario";
import { ESTADOS_MOTO, ETIQUETA_ESTADO_MOTO } from "@/domain/enums";
import { filtrosInventarioSchema } from "@/domain/moto";
import { hoyISO } from "@/lib/fechas";
import { formatearMoneda } from "@/lib/formato";
import { sesionDeDueno } from "@/server/auth/sesion";
import { buscarInventario, resumenInventario } from "@/server/repositorios/motos";

export const metadata = {
  title: "Inventario",
  robots: { index: false, follow: false },
};

/**
 * Inventario de motos.
 *
 * Todos los filtros, el orden y la página viven en la URL: el dueño puede
 * compartir un enlace o volver atrás sin perder la búsqueda, y la página sigue
 * siendo un Server Component que consulta una sola vez. La tabla (TanStack) es
 * el único componente de cliente.
 */
export default async function PaginaInventario(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");

  const parametros = await props.searchParams;
  const filtros =
    filtrosInventarioSchema.safeParse(parametros).data ?? filtrosInventarioSchema.parse({});

  const [{ filas, total }, resumen] = await Promise.all([
    buscarInventario(sesion.tenantId, filtros),
    resumenInventario(sesion.tenantId),
  ]);
  const hoy = hoyISO();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em]">Inventario</h1>
          <p className="text-sm text-muted-foreground">
            Motos de compra y venta. Los empeños van aparte.
          </p>
        </div>
        <Boton asChild>
          <Link href="/app/inventario/nueva">Registrar compra</Link>
        </Boton>
      </div>

      {parametros.eliminada === "1" ? (
        <Aviso tono="exito">La moto se borró del inventario. Sus gastos se conservan.</Aviso>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <TarjetaIndicador etiqueta="En inventario" valor={String(resumen.enInventario)} />
        <TarjetaIndicador etiqueta="Capital invertido" valor={formatearMoneda(resumen.capitalInvertido)} />
        <TarjetaIndicador etiqueta="Vendidas" valor={String(resumen.vendidas)} />
      </div>

      <form className="grid gap-3 superficie p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        {/* El orden se conserva al filtrar; la página vuelve a la primera. */}
        <input type="hidden" name="orden" value={filtros.orden} />
        <input type="hidden" name="dir" value={filtros.dir} />
        <Filtro etiqueta="Buscar" htmlFor="texto">
          <Entrada
            id="texto"
            name="texto"
            defaultValue={filtros.texto ?? ""}
            placeholder="Placa, marca, modelo, nombre o cédula del dueño"
          />
        </Filtro>
        <Filtro etiqueta="Estado" htmlFor="estado">
          <Selector id="estado" name="estado" defaultValue={filtros.estado ?? ""}>
            <option value="">Todos</option>
            {ESTADOS_MOTO.map((estado) => (
              <option key={estado} value={estado}>
                {ETIQUETA_ESTADO_MOTO[estado]}
              </option>
            ))}
          </Selector>
        </Filtro>
        <Filtro etiqueta="Comprada desde" htmlFor="desde">
          <Entrada id="desde" name="desde" type="date" max={hoy} defaultValue={filtros.desde ?? ""} />
        </Filtro>
        <Filtro etiqueta="Hasta" htmlFor="hasta">
          <Entrada id="hasta" name="hasta" type="date" max={hoy} defaultValue={filtros.hasta ?? ""} />
        </Filtro>
        <div className="flex items-end">
          <Boton type="submit" className="w-full">
            Buscar
          </Boton>
        </div>
      </form>

      <div className="superficie">
        <TablaInventario filas={filas} orden={filtros.orden} dir={filtros.dir} />
      </div>

      <p className="text-xs text-muted-foreground">{total} motos</p>
      <Paginacion
        base="/app/inventario"
        pagina={filtros.pagina}
        totalPaginas={Math.max(1, Math.ceil(total / filtros.porPagina))}
        parametros={parametros}
      />
    </div>
  );
}

function Filtro({ etiqueta, htmlFor, children }: { etiqueta: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
