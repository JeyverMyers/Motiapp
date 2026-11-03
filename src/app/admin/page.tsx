import Link from "next/link";

import { TarjetaIndicador } from "@/components/app/tarjeta-indicador";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { EtiquetaEstado } from "@/components/ui/etiqueta-estado";
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
  ETIQUETA_ESTADO_TENANT,
  ETIQUETA_PLAN,
  type EstadoTenant,
  type Plan,
} from "@/domain/enums";
import { formatearFecha } from "@/lib/formato";
import { listarTenants, metricasGlobales } from "@/server/repositorios/tenants";

export const metadata = {
  title: "Negocios",
  robots: { index: false, follow: false },
};

const TONO_ESTADO: Record<EstadoTenant, "exito" | "alerta" | "peligro"> = {
  activo: "exito",
  prueba: "alerta",
  suspendido: "peligro",
};

export default async function PaginaAdmin(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [negocios, metricas, parametros] = await Promise.all([
    listarTenants(),
    metricasGlobales(),
    props.searchParams,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em]">Negocios</h1>
          <p className="text-sm text-muted-foreground">
            {metricas.negocios === 1
              ? "1 negocio en la plataforma"
              : `${metricas.negocios} negocios en la plataforma`}
          </p>
        </div>
        <Boton asChild>
          <Link href="/admin/negocios/nuevo">Nuevo negocio</Link>
        </Boton>
      </div>

      {parametros.eliminado === "1" ? (
        <Aviso tono="exito">Negocio borrado. Queda registrado en la auditoría.</Aviso>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TarjetaIndicador
          etiqueta="Negocios activos"
          valor={String(metricas.activos)}
          detalle={`${metricas.enPrueba} en prueba · ${metricas.suspendidos} suspendidos`}
          tono="exito"
        />
        <TarjetaIndicador
          etiqueta="Motos registradas"
          valor={String(metricas.motosTotales)}
          detalle="En todos los negocios"
        />
        <TarjetaIndicador
          etiqueta="Empeños registrados"
          valor={String(metricas.empenosTotales)}
        />
        <TarjetaIndicador
          etiqueta="Usuarios"
          valor={String(metricas.usuariosTotales)}
          detalle={`${metricas.clientesTotales} clientes en total`}
        />
      </section>

      <div className="superficie">
        <Tabla>
          <TablaEncabezado>
            <TablaFila>
              <TablaCeldaEncabezado>Negocio</TablaCeldaEncabezado>
              <TablaCeldaEncabezado>Plan</TablaCeldaEncabezado>
              <TablaCeldaEncabezado>Estado</TablaCeldaEncabezado>
              <TablaCeldaEncabezado className="text-right">Usuarios</TablaCeldaEncabezado>
              <TablaCeldaEncabezado className="text-right">Inventario</TablaCeldaEncabezado>
              <TablaCeldaEncabezado className="text-right">Empeños</TablaCeldaEncabezado>
              <TablaCeldaEncabezado>Alta</TablaCeldaEncabezado>
            </TablaFila>
          </TablaEncabezado>
          <TablaCuerpo>
            {negocios.length === 0 ? (
              <TablaVacia columnas={7} mensaje="Todavía no hay negocios creados." />
            ) : (
              negocios.map((negocio) => (
                <TablaFila key={negocio.id}>
                  <TablaCelda>
                    <Link
                      href={`/admin/negocios/${negocio.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {negocio.nombre}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {[negocio.ciudad, negocio.nit].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </TablaCelda>
                  <TablaCelda>{ETIQUETA_PLAN[negocio.plan as Plan] ?? negocio.plan}</TablaCelda>
                  <TablaCelda>
                    <EtiquetaEstado
                      variant={TONO_ESTADO[negocio.estado as EstadoTenant] ?? "neutro"}
                    >
                      {ETIQUETA_ESTADO_TENANT[negocio.estado as EstadoTenant] ??
                        negocio.estado}
                    </EtiquetaEstado>
                  </TablaCelda>
                  <TablaCelda className="text-right tabular-nums">
                    {negocio.usuariosActivos}
                  </TablaCelda>
                  <TablaCelda className="text-right tabular-nums">
                    {negocio.motosEnInventario}
                  </TablaCelda>
                  <TablaCelda className="text-right tabular-nums">
                    {negocio.empenosActivos}
                  </TablaCelda>
                  <TablaCelda className="whitespace-nowrap text-muted-foreground">
                    {formatearFecha(negocio.creadoEn)}
                  </TablaCelda>
                </TablaFila>
              ))
            )}
          </TablaCuerpo>
        </Tabla>
      </div>

      <p className="text-xs text-muted-foreground">
        Crear negocios, asignar dueños, gestionar planes e impersonar un negocio para
        soporte están anotados en <code className="rounded bg-muted px-1 py-0.5">DEUDAS.md</code>.
      </p>
    </div>
  );
}
