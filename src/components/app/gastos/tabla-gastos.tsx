import Link from "next/link";

import {
  Tabla,
  TablaCelda,
  TablaCeldaEncabezado,
  TablaCuerpo,
  TablaEncabezado,
  TablaFila,
  TablaVacia,
} from "@/components/ui/tabla";
import {
  ETIQUETA_CATEGORIA_GASTO,
  ETIQUETA_MODULO,
  type CategoriaGasto,
  type Modulo,
} from "@/domain/enums";
import { formatearFecha, formatearMoneda, formatearPlaca } from "@/lib/formato";
import { comoRuta } from "@/lib/rutas";
import type { GastoListado } from "@/server/repositorios/gastos";

import { BotonEliminarGasto } from "./boton-eliminar-gasto";

/**
 * Tabla de gastos. `conReferencia` muestra a qué moto o empeño pertenece cada
 * uno; en la ficha de una moto no hace falta, porque todos son de esa moto.
 */
export function TablaGastos({
  gastos,
  conReferencia = false,
  mensajeVacio = "No hay gastos registrados.",
}: {
  gastos: GastoListado[];
  conReferencia?: boolean;
  mensajeVacio?: string;
}) {
  const columnas = conReferencia ? 6 : 5;

  return (
    <Tabla>
      <TablaEncabezado>
        <TablaFila>
          <TablaCeldaEncabezado>Fecha</TablaCeldaEncabezado>
          <TablaCeldaEncabezado>Categoría</TablaCeldaEncabezado>
          <TablaCeldaEncabezado>Descripción</TablaCeldaEncabezado>
          {conReferencia ? <TablaCeldaEncabezado>De</TablaCeldaEncabezado> : null}
          <TablaCeldaEncabezado className="text-right">Monto</TablaCeldaEncabezado>
          <TablaCeldaEncabezado>
            <span className="sr-only">Acciones</span>
          </TablaCeldaEncabezado>
        </TablaFila>
      </TablaEncabezado>
      <TablaCuerpo>
        {gastos.length === 0 ? (
          <TablaVacia columnas={columnas} mensaje={mensajeVacio} />
        ) : (
          gastos.map((gasto) => (
            <TablaFila key={gasto.id}>
              <TablaCelda className="whitespace-nowrap">{formatearFecha(gasto.fecha)}</TablaCelda>
              <TablaCelda>{ETIQUETA_CATEGORIA_GASTO[gasto.categoria as CategoriaGasto]}</TablaCelda>
              <TablaCelda className="text-muted-foreground">{gasto.descripcion ?? "—"}</TablaCelda>
              {conReferencia ? (
                <TablaCelda className="whitespace-nowrap">
                  <Referencia gasto={gasto} />
                </TablaCelda>
              ) : null}
              <TablaCelda className="text-right font-medium tabular-nums whitespace-nowrap">
                {formatearMoneda(gasto.monto)}
              </TablaCelda>
              <TablaCelda className="w-12">
                <BotonEliminarGasto gastoId={gasto.id} monto={gasto.monto} />
              </TablaCelda>
            </TablaFila>
          ))
        )}
      </TablaCuerpo>
    </Tabla>
  );
}

function Referencia({ gasto }: { gasto: GastoListado }) {
  if (gasto.motoId && gasto.motoPlaca) {
    return (
      <Link href={comoRuta(`/app/inventario/${gasto.motoId}`)} className="underline-offset-4 hover:underline">
        Moto {formatearPlaca(gasto.motoPlaca)}
      </Link>
    );
  }
  if (gasto.empenoId && gasto.empenoNumero) {
    return (
      <Link href={comoRuta(`/app/empenos/${gasto.empenoId}`)} className="underline-offset-4 hover:underline">
        Empeño {gasto.empenoNumero}
      </Link>
    );
  }
  return <span className="text-muted-foreground">General · {ETIQUETA_MODULO[gasto.modulo as Modulo]}</span>;
}
