import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { FormularioVenta } from "@/components/app/formulario-venta";
import { FormularioGasto } from "@/components/app/gastos/formulario-gasto";
import { TablaGastos } from "@/components/app/gastos/tabla-gastos";
import { ControlesMoto } from "@/components/app/inventario/controles-moto";
import { BotonDevolucion } from "@/components/app/ventas/boton-devolucion";
import { BotonRecibo } from "@/components/app/ventas/boton-recibo";
import { ESTADOS_VENDIBLES, EtiquetaEstadoMoto } from "@/components/app/inventario/estado-moto";
import { Aviso } from "@/components/ui/aviso";
import { idSchema } from "@/domain/comun";
import type { EstadoMoto } from "@/domain/enums";
import { diasEnInventario, gananciaDeMoto, margenDeMoto } from "@/domain/moto";
import { hoyISO } from "@/lib/fechas";
import { formatearFecha, formatearMoneda, formatearPlaca } from "@/lib/formato";
import { sesionDeDueno } from "@/server/auth/sesion";
import { gastosDe } from "@/server/repositorios/gastos";
import { obtenerMoto } from "@/server/repositorios/motos";
import { datosDelNegocio } from "@/server/repositorios/negocio";
import { historialDeVentasDeMoto, ventaActivaDeMoto } from "@/server/repositorios/ventas";

export const metadata = {
  title: "Detalle de la moto",
  robots: { index: false, follow: false },
};

export default async function PaginaMoto(props: {
  params: Promise<{ motoId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");

  const { motoId } = await props.params;
  // Un id mal formado no debe llegar a Postgres como error de sintaxis.
  if (!idSchema.safeParse(motoId).success) notFound();

  const [moto, gastosMoto, negocio, venta, historial, parametros] = await Promise.all([
    obtenerMoto(sesion.tenantId, motoId),
    gastosDe(sesion.tenantId, { motoId }),
    datosDelNegocio(sesion.tenantId),
    ventaActivaDeMoto(sesion.tenantId, motoId),
    historialDeVentasDeMoto(sesion.tenantId, motoId),
    props.searchParams,
  ]);

  // Si la moto es de otro negocio, RLS la hace invisible y esto devuelve 404.
  // Es la respuesta correcta: no confirmamos que exista.
  if (!moto) notFound();

  const precios = { precioCompra: moto.precioCompra, precioVenta: venta?.precioPactado };
  const ganancia = gananciaDeMoto(precios, gastosMoto.suma);
  const margen = margenDeMoto(precios, gastosMoto.suma);
  const dias = diasEnInventario({
    fechaCompra: moto.fechaCompra,
    fechaVenta: venta?.fecha,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/app/inventario"
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Volver al inventario
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.025em]">
              {moto.marca} {moto.modelo} {moto.anio}
            </h1>
            <EtiquetaEstadoMoto estado={moto.estado as EstadoMoto} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatearPlaca(moto.placa)} · {moto.color}
            {moto.cilindraje ? ` · ${moto.cilindraje} cc` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {venta && negocio ? (
            <BotonRecibo
              datos={{
                negocio,
                moto,
                comprador: {
                  nombre: venta.compradorNombre,
                  cedula: venta.compradorCedula,
                  telefono: venta.compradorTelefono,
                },
                precioVenta: venta.precioPactado,
                fechaVenta: venta.fecha,
                metodoPago: venta.metodoPago,
                observaciones: venta.observaciones,
              }}
            />
          ) : null}
          {venta ? <BotonDevolucion ventaId={venta.id} /> : null}
          <ControlesMoto motoId={moto.id} estado={moto.estado as EstadoMoto} />
        </div>
      </div>

      {parametros.vendida === "1" && venta ? (
        <Aviso tono="exito">Venta registrada. Descarga el recibo para el comprador.</Aviso>
      ) : null}
      {parametros.devuelta === "1" && !venta ? (
        <Aviso tono="exito">
          Devolución registrada. La venta ya no cuenta en la ganancia y la moto se puede vender de nuevo.
        </Aviso>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Dato etiqueta="Precio de compra" valor={formatearMoneda(moto.precioCompra)} detalle={formatearFecha(moto.fechaCompra)} />
        {venta ? (
          <Dato
            etiqueta="Precio de venta"
            valor={formatearMoneda(venta.precioPactado)}
            detalle={
              venta.descuentoAplicado > 0
                ? `${formatearFecha(venta.fecha)} · descuento ${formatearMoneda(venta.descuentoAplicado)}`
                : formatearFecha(venta.fecha)
            }
          />
        ) : (
          <Dato
            etiqueta="Precio publicado"
            valor={moto.precioPublicado === null ? "Sin precio" : formatearMoneda(moto.precioPublicado)}
            detalle="Sin vender"
          />
        )}
        <Dato
          etiqueta="Ganancia"
          valor={ganancia === null ? "—" : formatearMoneda(ganancia)}
          detalle={
            ganancia === null
              ? `Gastos hasta hoy ${formatearMoneda(gastosMoto.suma)}`
              : `Margen ${margen?.toFixed(1)} % · gastos ${formatearMoneda(gastosMoto.suma)}`
          }
          tono={ganancia === null ? "neutro" : ganancia >= 0 ? "exito" : "peligro"}
        />
        <Dato
          etiqueta={moto.estado === "vendida" ? "Días hasta la venta" : "Días en inventario"}
          valor={String(dias)}
        />
      </div>

      <section className="superficie p-4">
        <h2 className="text-sm font-semibold">Datos del vehículo</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <DatoLista etiqueta="Placa" valor={moto.placa} />
          <DatoLista etiqueta="Número de motor" valor={moto.numeroMotor} />
          <DatoLista etiqueta="Número de chasis" valor={moto.numeroChasis} />
          <DatoLista etiqueta="Descripción" valor={moto.descripcion} />
        </dl>
      </section>

      {venta ? (
        <section className="superficie p-4">
          <h2 className="text-sm font-semibold">Comprador</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <DatoLista etiqueta="Nombre" valor={venta.compradorNombre} />
            <DatoLista etiqueta="Cédula" valor={venta.compradorCedula} />
            <DatoLista etiqueta="Teléfono" valor={venta.compradorTelefono} />
            <DatoLista etiqueta="Observaciones" valor={venta.observaciones} />
          </dl>
        </section>
      ) : null}

      {historial.some((fila) => fila.estado === "devuelta") ? (
        <section className="superficie p-4">
          <h2 className="text-sm font-semibold">Historial de ventas</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {historial.map((fila) => (
              <li key={fila.id} className="flex flex-wrap items-baseline justify-between gap-2">
                <span>
                  {formatearFecha(fila.fecha)} · {fila.compradorNombre}
                </span>
                <span className="tabular-nums">
                  {formatearMoneda(fila.precioPactado)}{" "}
                  <span className={fila.estado === "devuelta" ? "text-destructive" : "text-exito"}>
                    {fila.estado === "devuelta" ? `devuelta el ${formatearFecha(fila.devueltaEn)}` : "activa"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="superficie p-4">
        <h2 className="text-sm font-semibold">Proveedor</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <DatoLista etiqueta="Nombre" valor={moto.proveedorNombre} />
          <DatoLista etiqueta="Cédula" valor={moto.proveedorCedula} />
          <DatoLista etiqueta="Teléfono" valor={moto.proveedorTelefono} />
        </dl>
      </section>

      <section className="superficie p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Gastos de esta moto</h2>
          <span className="text-sm font-semibold tabular-nums">{formatearMoneda(gastosMoto.suma)}</span>
        </div>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">
          Arreglos, trámites, lavado… Cada gasto baja la ganancia de esta moto.
        </p>
        <FormularioGasto hoy={hoyISO()} fijo={{ modulo: "compra_venta", motoId: moto.id }} />
        <div className="mt-4 rounded-md border">
          <TablaGastos gastos={gastosMoto.filas} mensajeVacio="Esta moto no tiene gastos registrados." />
        </div>
      </section>

      {!ESTADOS_VENDIBLES.includes(moto.estado as EstadoMoto) ? null : (
        <section className="superficie p-4">
          <h2 className="text-sm font-semibold">Registrar la venta</h2>
          <p className="mt-1 mb-4 text-xs text-muted-foreground">
            Al guardar, la moto pasa a «Vendida» y deja de aparecer como disponible.
            Solo se puede vender una vez.
          </p>
          <FormularioVenta
            hoy={hoyISO()}
            motoFija={moto.id}
            motos={[
              {
                id: moto.id,
                placa: moto.placa,
                marca: moto.marca,
                modelo: moto.modelo,
                anio: moto.anio,
                precioCompra: moto.precioCompra,
                precioPublicado: moto.precioPublicado,
                gastos: gastosMoto.suma,
              },
            ]}
          />
        </section>
      )}
    </div>
  );
}

function Dato({
  etiqueta,
  valor,
  detalle,
  tono = "neutro",
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  tono?: "neutro" | "exito" | "peligro";
}) {
  return (
    <div className="superficie p-4">
      <span className="text-xs font-medium text-muted-foreground">{etiqueta}</span>
      <p
        className={`mt-1.5 text-xl font-semibold tabular-nums ${
          tono === "exito" ? "text-exito" : tono === "peligro" ? "text-destructive" : ""
        }`}
      >
        {valor}
      </p>
      {detalle ? <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p> : null}
    </div>
  );
}

function DatoLista({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground">{etiqueta}:</dt>
      <dd className="font-medium">{valor ?? "—"}</dd>
    </div>
  );
}
