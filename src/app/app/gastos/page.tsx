import { redirect } from "next/navigation";

import { FormularioGasto } from "@/components/app/gastos/formulario-gasto";
import { TablaGastos } from "@/components/app/gastos/tabla-gastos";
import { Paginacion } from "@/components/app/paginacion";
import { Boton } from "@/components/ui/boton";
import { Entrada, Selector } from "@/components/ui/formulario";
import { filtrosGastoSchema } from "@/domain/gasto";
import {
  CATEGORIAS_GASTO,
  ETIQUETA_CATEGORIA_GASTO,
  ETIQUETA_MODULO,
  MODULOS,
} from "@/domain/enums";
import { hoyISO } from "@/lib/fechas";
import { formatearMoneda } from "@/lib/formato";
import { sesionDeDueno } from "@/server/auth/sesion";
import { listarGastos } from "@/server/repositorios/gastos";

export const metadata = {
  title: "Gastos",
  robots: { index: false, follow: false },
};

/**
 * Gastos del negocio.
 *
 * Aquí se registran los gastos generales (arriendo, nómina, publicidad). Los de
 * una moto o de un empeño concreto se registran desde su ficha, para que queden
 * asociados y bajen la ganancia de esa operación; aquí aparecen todos.
 */
export default async function PaginaGastos(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");

  const parametros = await props.searchParams;
  const filtros = filtrosGastoSchema.safeParse(parametros).data ?? filtrosGastoSchema.parse({});
  const { filas, total, suma } = await listarGastos(sesion.tenantId, filtros);
  const hoy = hoyISO();
  const hayFiltros = Boolean(filtros.modulo || filtros.categoria || filtros.desde || filtros.hasta);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.025em]">Gastos</h1>
        <p className="text-sm text-muted-foreground">
          Los gastos de una moto se registran desde su ficha del inventario; los de un
          empeño, desde la ficha del empeño. Aquí van los generales.
        </p>
      </div>

      <section className="superficie p-4">
        <h2 className="mb-3 text-sm font-semibold">Registrar gasto general</h2>
        <FormularioGasto hoy={hoy} />
      </section>

      <form className="grid gap-3 superficie p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <Filtro etiqueta="Módulo" htmlFor="filtro-modulo">
          <Selector id="filtro-modulo" name="modulo" defaultValue={filtros.modulo ?? ""}>
            <option value="">Todos</option>
            {MODULOS.map((modulo) => (
              <option key={modulo} value={modulo}>
                {ETIQUETA_MODULO[modulo]}
              </option>
            ))}
          </Selector>
        </Filtro>
        <Filtro etiqueta="Categoría" htmlFor="filtro-categoria">
          <Selector id="filtro-categoria" name="categoria" defaultValue={filtros.categoria ?? ""}>
            <option value="">Todas</option>
            {CATEGORIAS_GASTO.map((categoria) => (
              <option key={categoria} value={categoria}>
                {ETIQUETA_CATEGORIA_GASTO[categoria]}
              </option>
            ))}
          </Selector>
        </Filtro>
        <Filtro etiqueta="Desde" htmlFor="filtro-desde">
          <Entrada id="filtro-desde" name="desde" type="date" defaultValue={filtros.desde ?? ""} max={hoy} />
        </Filtro>
        <Filtro etiqueta="Hasta" htmlFor="filtro-hasta">
          <Entrada id="filtro-hasta" name="hasta" type="date" defaultValue={filtros.hasta ?? ""} max={hoy} />
        </Filtro>
        <div className="flex items-end">
          <Boton type="submit" className="w-full">
            Filtrar
          </Boton>
        </div>
      </form>

      <section aria-labelledby="titulo-gastos" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-gastos" className="text-sm font-semibold">
            {hayFiltros ? "Gastos del filtro" : "Todos los gastos"}
          </h2>
          <p className="text-sm">
            <span className="text-muted-foreground">{total} gastos · </span>
            <span className="font-semibold tabular-nums">{formatearMoneda(suma)}</span>
          </p>
        </div>
        <div className="superficie">
          <TablaGastos
            gastos={filas}
            conReferencia
            mensajeVacio={hayFiltros ? "No hay gastos que coincidan con el filtro." : "Todavía no hay gastos registrados."}
          />
        </div>
        <Paginacion
          base="/app/gastos"
          pagina={filtros.pagina}
          totalPaginas={Math.max(1, Math.ceil(total / filtros.porPagina))}
          parametros={parametros}
        />
      </section>
    </div>
  );
}

function Filtro({
  etiqueta,
  htmlFor,
  children,
}: {
  etiqueta: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
