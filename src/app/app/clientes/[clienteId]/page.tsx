import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EtiquetaEstadoEmpeno } from "@/components/app/empenos/presentacion";
import { EtiquetaEstadoMoto } from "@/components/app/inventario/estado-moto";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { formatearDocumento, nombreCompletoCliente } from "@/domain/cliente";
import { idSchema } from "@/domain/comun";
import { tieneModulo } from "@/domain/negocio";
import { estadoSegunFechas } from "@/domain/empeno";
import { ETIQUETA_TIPO_BIEN, ETIQUETA_TIPO_DOCUMENTO, type EstadoMoto, type TipoBien, type TipoDocumento } from "@/domain/enums";
import { hoyComoFecha } from "@/lib/fechas";
import { formatearFecha, formatearMoneda, formatearPlaca, formatearTelefono } from "@/lib/formato";
import { comoRuta } from "@/lib/rutas";
import { sesionDeDueno } from "@/server/auth/sesion";
import { historialDeCliente, obtenerCliente } from "@/server/repositorios/clientes";

export const metadata = {
  title: "Ficha del cliente",
  robots: { index: false, follow: false },
};

export default async function PaginaCliente(props: {
  params: Promise<{ clienteId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sesion = await sesionDeDueno();
  if (!sesion) redirect("/login");

  const { clienteId } = await props.params;
  if (!idSchema.safeParse(clienteId).success) notFound();

  const [cliente, parametros] = await Promise.all([obtenerCliente(sesion.tenantId, clienteId), props.searchParams]);
  // Si es de otro negocio, RLS lo hace invisible: 404 sin confirmar que existe.
  if (!cliente) notFound();

  const historial = await historialDeCliente(sesion.tenantId, cliente);
  const hoy = hoyComoFecha();
  const comprasVigentes = historial.compras.filter((compra) => compra.estado === "activa");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/app/clientes"
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Volver a clientes
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">{nombreCompletoCliente(cliente)}</h1>
          <p className="text-sm text-muted-foreground">
            {ETIQUETA_TIPO_DOCUMENTO[cliente.tipoDocumento as TipoDocumento] ?? cliente.tipoDocumento}{" "}
            {formatearDocumento(cliente.tipoDocumento, cliente.numeroDocumento)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton asChild variant="exito" size="sm">
            <Link href={comoRuta(`/app/ventas/nueva?clienteId=${cliente.id}`)}>Venderle una moto</Link>
          </Boton>
          {tieneModulo(sesion.plan, "empenos") ? (
            <Boton asChild variant="outline" size="sm">
              <Link href={comoRuta(`/app/empenos/nuevo?clienteId=${cliente.id}`)}>Registrar empeño</Link>
            </Boton>
          ) : null}
          <Boton asChild variant="outline" size="sm">
            <Link href={comoRuta(`/app/clientes/${cliente.id}/editar`)}>Editar datos</Link>
          </Boton>
        </div>
      </div>

      {parametros.actualizado === "1" ? <Aviso tono="exito">Datos del cliente actualizados.</Aviso> : null}

      <section className="superficie p-4">
        <h2 className="text-sm font-semibold">Contacto</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Dato etiqueta="Celular" valor={formatearTelefono(cliente.telefono)} />
          <Dato etiqueta="Otro teléfono" valor={cliente.telefonoAlterno ? formatearTelefono(cliente.telefonoAlterno) : null} />
          <Dato etiqueta="Correo" valor={cliente.email} />
          <Dato etiqueta="Ciudad" valor={cliente.ciudad} />
          <Dato etiqueta="Dirección" valor={cliente.direccion} />
          <Dato etiqueta="Notas" valor={cliente.notas} />
        </dl>
      </section>

      <Seccion
        titulo="Motos que compró"
        resumen={
          comprasVigentes.length
            ? formatearMoneda(comprasVigentes.reduce((suma, compra) => suma + compra.precioPactado, 0))
            : undefined
        }
        vacio="No le has vendido motos."
        cantidad={historial.compras.length}
      >
        {historial.compras.map((compra) => (
          <Fila
            key={compra.ventaId}
            href={comoRuta(`/app/inventario/${compra.motoId}`)}
            titulo={`${compra.marca} ${compra.modelo} ${compra.anio}`}
            detalle={`${formatearPlaca(compra.placa)} · ${formatearFecha(compra.fecha)}`}
            valor={formatearMoneda(compra.precioPactado)}
            nota={compra.estado === "devuelta" ? "Devuelta" : undefined}
          />
        ))}
      </Seccion>

      <Seccion
        titulo="Motos que le compraste"
        vacio="No te ha vendido motos."
        cantidad={historial.ventasAlNegocio.length}
        ayuda="Motos del inventario cuyo dueño anterior tiene este documento."
      >
        {historial.ventasAlNegocio.map((moto) => (
          <Fila
            key={moto.motoId}
            href={comoRuta(`/app/inventario/${moto.motoId}`)}
            titulo={`${moto.marca} ${moto.modelo} ${moto.anio}`}
            detalle={`${formatearPlaca(moto.placa)} · comprada el ${formatearFecha(moto.fechaCompra)}`}
            valor={formatearMoneda(moto.precioCompra)}
            etiqueta={<EtiquetaEstadoMoto estado={moto.estado as EstadoMoto} />}
          />
        ))}
      </Seccion>

      <Seccion titulo="Empeños" vacio="No tiene empeños." cantidad={historial.empenos.length}>
        {historial.empenos.map((empeno) => (
          <Fila
            key={empeno.id}
            href={comoRuta(`/app/empenos/${empeno.id}`)}
            titulo={`N.º ${empeno.numero} · ${ETIQUETA_TIPO_BIEN[empeno.tipoBien as TipoBien] ?? empeno.tipoBien}`}
            detalle={`${formatearFecha(empeno.fechaInicio)} → vence ${formatearFecha(empeno.fechaVencimiento)}`}
            valor={formatearMoneda(empeno.capital)}
            etiqueta={
              <EtiquetaEstadoEmpeno
                estado={estadoSegunFechas({
                  estado: empeno.estado as Parameters<typeof estadoSegunFechas>[0]["estado"],
                  fechaVencimiento: empeno.fechaVencimiento,
                  hoy,
                })}
              />
            }
          />
        ))}
      </Seccion>
    </div>
  );
}

function Seccion({
  titulo,
  cantidad,
  vacio,
  resumen,
  ayuda,
  children,
}: {
  titulo: string;
  cantidad: number;
  vacio: string;
  resumen?: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="superficie p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">
          {titulo} <span className="font-normal text-muted-foreground">({cantidad})</span>
        </h2>
        {resumen ? <span className="text-sm font-semibold tabular-nums">{resumen}</span> : null}
      </div>
      {ayuda ? <p className="mt-1 text-xs text-muted-foreground">{ayuda}</p> : null}
      {cantidad === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{vacio}</p>
      ) : (
        <ul className="mt-3 divide-y">{children}</ul>
      )}
    </section>
  );
}

function Fila({
  href,
  titulo,
  detalle,
  valor,
  nota,
  etiqueta,
}: {
  href: ReturnType<typeof comoRuta>;
  titulo: string;
  detalle: string;
  valor: string;
  nota?: string;
  etiqueta?: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
      <div className="min-w-0">
        <Link href={href} className="font-medium underline-offset-4 hover:underline">
          {titulo}
        </Link>
        <p className="text-xs text-muted-foreground">{detalle}</p>
      </div>
      <div className="flex items-center gap-2">
        {etiqueta}
        {nota ? <span className="text-xs font-medium text-destructive">{nota}</span> : null}
        <span className="font-semibold tabular-nums">{valor}</span>
      </div>
    </li>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground">{etiqueta}:</dt>
      <dd className="font-medium">{valor ?? "—"}</dd>
    </div>
  );
}
