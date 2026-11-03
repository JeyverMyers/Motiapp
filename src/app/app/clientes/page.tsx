import Link from "next/link";
import { redirect } from "next/navigation";

import { Paginacion } from "@/components/app/paginacion";
import { Boton } from "@/components/ui/boton";
import { Entrada } from "@/components/ui/formulario";
import {
  Tabla,
  TablaCelda,
  TablaCeldaEncabezado,
  TablaCuerpo,
  TablaEncabezado,
  TablaFila,
  TablaVacia,
} from "@/components/ui/tabla";
import { filtrosClientesSchema, formatearDocumento, nombreCompletoCliente } from "@/domain/cliente";
import { formatearMoneda, formatearTelefono } from "@/lib/formato";
import { comoRuta } from "@/lib/rutas";
import { sesionDeDueno } from "@/server/auth/sesion";
import { listarClientes } from "@/server/repositorios/clientes";

export const metadata = {
  title: "Clientes",
  robots: { index: false, follow: false },
};

/**
 * Catálogo de clientes, compartido por compra/venta y empeño. La búsqueda vive
 * en la URL y se resuelve en el servidor.
 */
export default async function PaginaClientes(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");

  const parametros = await props.searchParams;
  const filtros = filtrosClientesSchema.safeParse(parametros).data ?? filtrosClientesSchema.parse({});
  const { filas, total } = await listarClientes(sesion.tenantId, filtros);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em]">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Quienes te compran, te venden o empeñan. Cada cédula aparece una sola vez.
          </p>
        </div>
        <Boton asChild>
          <Link href="/app/clientes/nuevo">Nuevo cliente</Link>
        </Boton>
      </div>

      <form className="flex flex-col gap-3 superficie p-4 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="texto" className="text-xs font-medium text-muted-foreground">
            Buscar
          </label>
          <Entrada
            id="texto"
            name="texto"
            defaultValue={filtros.texto ?? ""}
            placeholder="Cédula, nombre o teléfono"
          />
        </div>
        <Boton type="submit">Buscar</Boton>
      </form>

      <div className="overflow-x-auto superficie">
        <Tabla>
          <TablaEncabezado>
            <TablaFila>
              <TablaCeldaEncabezado>Cliente</TablaCeldaEncabezado>
              <TablaCeldaEncabezado>Documento</TablaCeldaEncabezado>
              <TablaCeldaEncabezado>Teléfono</TablaCeldaEncabezado>
              <TablaCeldaEncabezado className="text-right">Total comprado</TablaCeldaEncabezado>
              <TablaCeldaEncabezado className="text-right">Total empeñado</TablaCeldaEncabezado>
            </TablaFila>
          </TablaEncabezado>
          <TablaCuerpo>
            {filas.length === 0 ? (
              <TablaVacia
                columnas={5}
                mensaje={filtros.texto ? "Ningún cliente coincide con la búsqueda." : "Todavía no hay clientes."}
              />
            ) : (
              filas.map((cliente) => (
                <TablaFila key={cliente.id}>
                  <TablaCelda>
                    <Link
                      href={comoRuta(`/app/clientes/${cliente.id}`)}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {nombreCompletoCliente(cliente)}
                    </Link>
                  </TablaCelda>
                  <TablaCelda className="whitespace-nowrap tabular-nums">
                    <span className="text-xs text-muted-foreground">{cliente.tipoDocumento}</span>{" "}
                    {formatearDocumento(cliente.tipoDocumento, cliente.numeroDocumento)}
                  </TablaCelda>
                  <TablaCelda className="whitespace-nowrap tabular-nums">{formatearTelefono(cliente.telefono)}</TablaCelda>
                  <TablaCelda className="text-right tabular-nums">
                    {cliente.totalComprado ? formatearMoneda(cliente.totalComprado) : "—"}
                  </TablaCelda>
                  <TablaCelda className="text-right tabular-nums">
                    {cliente.totalEmpenado ? formatearMoneda(cliente.totalEmpenado) : "—"}
                  </TablaCelda>
                </TablaFila>
              ))
            )}
          </TablaCuerpo>
        </Tabla>
      </div>

      <p className="text-xs text-muted-foreground">
        {total} clientes. «Total comprado» suma sus compras vigentes; «Total empeñado», el capital de todos sus
        empeños.
      </p>
      <Paginacion
        base="/app/clientes"
        pagina={filtros.pagina}
        totalPaginas={Math.max(1, Math.ceil(total / filtros.porPagina))}
        parametros={parametros}
      />
    </div>
  );
}
