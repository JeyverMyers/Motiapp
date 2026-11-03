"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

import {
  Tabla,
  TablaCelda,
  TablaCeldaEncabezado,
  TablaCuerpo,
  TablaEncabezado,
  TablaFila,
  TablaVacia,
} from "@/components/ui/tabla";
import type { EstadoMoto } from "@/domain/enums";
import { diasEnInventario, gananciaDeMoto, ORDENES_INVENTARIO, type OrdenInventario } from "@/domain/moto";
import { formatearFecha, formatearMoneda, formatearPlaca } from "@/lib/formato";
import { comoRuta } from "@/lib/rutas";
import type { MotoListada } from "@/server/repositorios/motos";

import { EtiquetaEstadoMoto } from "./estado-moto";

const COLUMNAS: ColumnDef<MotoListada>[] = [
  {
    id: "placa",
    header: "Placa",
    cell: ({ row }) => (
      <Link
        href={comoRuta(`/app/inventario/${row.original.id}`)}
        className="font-medium whitespace-nowrap underline-offset-4 hover:underline"
      >
        {formatearPlaca(row.original.placa)}
      </Link>
    ),
  },
  {
    id: "marca",
    header: "Moto",
    cell: ({ row }) => (
      <>
        {row.original.marca} {row.original.modelo}
        <span className="block text-xs text-muted-foreground">{row.original.color}</span>
      </>
    ),
  },
  { id: "anio", header: "Año", cell: ({ row }) => row.original.anio },
  {
    id: "estado",
    header: "Estado",
    enableSorting: false,
    cell: ({ row }) => <EtiquetaEstadoMoto estado={row.original.estado as EstadoMoto} />,
  },
  {
    id: "precioCompra",
    header: "Compra",
    cell: ({ row }) => (
      <span className="tabular-nums whitespace-nowrap">
        {formatearMoneda(row.original.precioCompra)}
        <span className="block text-xs text-muted-foreground">
          {row.original.proveedorNombre ?? "Sin proveedor"}
        </span>
      </span>
    ),
  },
  {
    id: "fechaCompra",
    header: "Comprada",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {formatearFecha(row.original.fechaCompra)}
        {row.original.estado !== "vendida" ? (
          <span className="block text-xs text-muted-foreground">
            {diasEnInventario({ fechaCompra: row.original.fechaCompra })} días
          </span>
        ) : null}
      </span>
    ),
  },
  {
    id: "ganancia",
    header: "Ganancia",
    enableSorting: false,
    cell: ({ row }) => {
      const ganancia = gananciaDeMoto(
        { precioCompra: row.original.precioCompra, precioVenta: row.original.precioVenta ?? undefined },
        row.original.gastosAsociados,
      );
      return ganancia === null ? (
        <span className="text-xs text-muted-foreground">Sin vender</span>
      ) : (
        <span className={`tabular-nums whitespace-nowrap ${ganancia >= 0 ? "text-exito" : "text-destructive"}`}>
          {formatearMoneda(ganancia)}
        </span>
      );
    },
  },
];

function esOrden(id: string): id is OrdenInventario {
  return (ORDENES_INVENTARIO as readonly string[]).includes(id);
}

/**
 * Tabla del inventario con TanStack Table.
 *
 * Los datos ya vienen paginados, filtrados y ordenados del servidor
 * (`manualSorting`, `manualPagination`): la página sigue siendo un Server
 * Component y los filtros viven en la URL. TanStack pone las columnas y el
 * ordenamiento por encabezado; al hacer clic se cambia la URL y el servidor
 * vuelve a consultar.
 */
export function TablaInventario({
  filas,
  orden,
  dir,
}: {
  filas: MotoListada[];
  orden: OrdenInventario;
  dir: "asc" | "desc";
}) {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  const sorting: SortingState = [{ id: orden, desc: dir === "desc" }];

  // TanStack devuelve funciones nuevas en cada render, así que el compilador de
  // React no memoiza este componente. Es lo esperado con esta librería y la
  // tabla tiene como mucho 100 filas: no hay costo que justifique otra cosa.
  // eslint-disable-next-line react-hooks/incompatible-library
  const tabla = useReactTable({
    data: filas,
    columns: COLUMNAS,
    state: { sorting },
    manualSorting: true,
    manualPagination: true,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: (actualizar) => {
      const siguiente = typeof actualizar === "function" ? actualizar(sorting) : actualizar;
      const columna = siguiente[0];
      if (!columna || !esOrden(columna.id)) return;
      const nuevos = new URLSearchParams(parametros.toString());
      nuevos.set("orden", columna.id);
      nuevos.set("dir", columna.desc ? "desc" : "asc");
      nuevos.delete("pagina");
      router.push(comoRuta(`${ruta}?${nuevos.toString()}`));
    },
  });

  return (
    <Tabla>
      <TablaEncabezado>
        {tabla.getHeaderGroups().map((grupo) => (
          <TablaFila key={grupo.id}>
            {grupo.headers.map((encabezado) => {
              const ordenable = encabezado.column.getCanSort() && esOrden(encabezado.column.id);
              const sentido = encabezado.column.getIsSorted();
              const Icono = sentido === "asc" ? ArrowUp : sentido === "desc" ? ArrowDown : ArrowUpDown;
              const titulo = flexRender(encabezado.column.columnDef.header, encabezado.getContext());
              return (
                <TablaCeldaEncabezado
                  key={encabezado.id}
                  aria-sort={sentido === "asc" ? "ascending" : sentido === "desc" ? "descending" : undefined}
                >
                  {ordenable ? (
                    <button
                      type="button"
                      onClick={encabezado.column.getToggleSortingHandler()}
                      className="inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {titulo}
                      <Icono className={`size-3.5 ${sentido ? "text-foreground" : "opacity-50"}`} aria-hidden="true" />
                    </button>
                  ) : (
                    titulo
                  )}
                </TablaCeldaEncabezado>
              );
            })}
          </TablaFila>
        ))}
      </TablaEncabezado>
      <TablaCuerpo>
        {tabla.getRowModel().rows.length === 0 ? (
          <TablaVacia columnas={COLUMNAS.length} mensaje="No hay motos que coincidan con la búsqueda." />
        ) : (
          tabla.getRowModel().rows.map((fila) => (
            <TablaFila key={fila.id}>
              {fila.getVisibleCells().map((celda) => (
                <TablaCelda key={celda.id}>{flexRender(celda.column.columnDef.cell, celda.getContext())}</TablaCelda>
              ))}
            </TablaFila>
          ))
        )}
      </TablaCuerpo>
    </Tabla>
  );
}
