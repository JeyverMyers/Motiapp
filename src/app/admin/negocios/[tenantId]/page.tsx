import Link from "next/link";
import { notFound } from "next/navigation";

import {
  BotonAccesoUsuario,
  BotonSuspension,
  FormularioAsignarDueno,
  FormularioDatosNegocio,
  FormularioEliminarNegocio,
  FormularioPlanYEstado,
  FormularioSoporte,
} from "@/components/admin/formularios-negocio";
import { TablaAuditoria } from "@/components/admin/tabla-auditoria";
import { Aviso } from "@/components/ui/aviso";
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
import { idSchema } from "@/domain/comun";
import { formatearDocumento } from "@/domain/cliente";
import {
  ETIQUETA_ESTADO_TENANT,
  ETIQUETA_PLAN,
  ETIQUETA_ROL,
  type EstadoTenant,
  type Plan,
  type Rol,
} from "@/domain/enums";
import { negocioEstaVacio } from "@/domain/negocio";
import { formatearFechaHora } from "@/lib/formato";
import {
  conteoDeNegocio,
  listarAuditoria,
  listarUsuariosDeTenant,
  obtenerTenant,
} from "@/server/repositorios/tenants";

export const metadata = {
  title: "Detalle del negocio",
  robots: { index: false, follow: false },
};

const TONO_ESTADO: Record<EstadoTenant, "exito" | "alerta" | "peligro"> = {
  activo: "exito",
  prueba: "alerta",
  suspendido: "peligro",
};

/**
 * Ficha de un negocio en super administración: estado (suspender/reactivar),
 * plan, datos, usuarios, modo soporte, auditoría y, si está vacío, borrado.
 * El layout de /admin ya exige super admin; las acciones lo vuelven a exigir.
 */
export default async function PaginaNegocio(props: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tenantId } = await props.params;
  if (!idSchema.safeParse(tenantId).success) notFound();

  const negocio = await obtenerTenant(tenantId);
  if (!negocio) notFound();

  const [usuarios, conteo, auditoria, parametros] = await Promise.all([
    listarUsuariosDeTenant(tenantId),
    conteoDeNegocio(tenantId),
    listarAuditoria({ negocioId: tenantId, limite: 30 }),
    props.searchParams,
  ]);
  const suspendido = negocio.estado === "suspendido";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Volver a negocios
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.025em]">{negocio.nombre}</h1>
            <EtiquetaEstado variant={TONO_ESTADO[negocio.estado as EstadoTenant] ?? "alerta"}>
              {ETIQUETA_ESTADO_TENANT[negocio.estado as EstadoTenant] ?? negocio.estado}
            </EtiquetaEstado>
            <EtiquetaEstado variant="contorno">{ETIQUETA_PLAN[negocio.plan as Plan] ?? negocio.plan}</EtiquetaEstado>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {negocio.nit ? `NIT ${formatearDocumento("NIT", negocio.nit)} · ` : ""}Alta {formatearFechaHora(negocio.creadoEn)}
          </p>
        </div>
        <BotonSuspension negocio={negocio} />
      </div>

      {parametros.creado === "1" ? (
        <Aviso tono="exito">Negocio creado. Falta darle acceso a su dueño (sección Usuarios).</Aviso>
      ) : null}
      {suspendido ? (
        <Aviso tono="error">
          Negocio suspendido: sus usuarios no pueden entrar a /app ni registrar nada. Sus datos se conservan intactos.
        </Aviso>
      ) : null}

      <Seccion titulo="Plan y estado" descripcion="El plan decide qué módulos ve el negocio.">
        <FormularioPlanYEstado negocio={negocio} />
      </Seccion>

      <Seccion titulo="Datos del negocio">
        <FormularioDatosNegocio negocio={negocio} />
      </Seccion>

      <Seccion titulo="Usuarios" descripcion="Quién puede entrar a /app de este negocio.">
        <div className="overflow-x-auto rounded-md border">
          <Tabla>
            <TablaEncabezado>
              <TablaFila>
                <TablaCeldaEncabezado>Nombre</TablaCeldaEncabezado>
                <TablaCeldaEncabezado>Correo</TablaCeldaEncabezado>
                <TablaCeldaEncabezado>Rol</TablaCeldaEncabezado>
                <TablaCeldaEncabezado>Último acceso</TablaCeldaEncabezado>
                <TablaCeldaEncabezado className="text-right">Acceso</TablaCeldaEncabezado>
              </TablaFila>
            </TablaEncabezado>
            <TablaCuerpo>
              {usuarios.length === 0 ? (
                <TablaVacia columnas={5} mensaje="Este negocio todavía no tiene usuarios. Asígnale su dueño abajo." />
              ) : (
                usuarios.map((usuario) => (
                  <TablaFila key={usuario.id}>
                    <TablaCelda className="font-medium">{usuario.nombre}</TablaCelda>
                    <TablaCelda>{usuario.email}</TablaCelda>
                    <TablaCelda>{ETIQUETA_ROL[usuario.rol as Rol] ?? usuario.rol}</TablaCelda>
                    <TablaCelda className="text-muted-foreground">
                      {usuario.ultimoAcceso ? formatearFechaHora(usuario.ultimoAcceso) : "Nunca"}
                    </TablaCelda>
                    <TablaCelda className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <EtiquetaEstado variant={usuario.activo ? "exito" : "neutro"}>
                          {usuario.activo ? "Activo" : "Sin acceso"}
                        </EtiquetaEstado>
                        <BotonAccesoUsuario negocioId={negocio.id} usuarioId={usuario.id} activo={usuario.activo} />
                      </div>
                    </TablaCelda>
                  </TablaFila>
                ))
              )}
            </TablaCuerpo>
          </Tabla>
        </div>
        <div className="mt-4">
          <FormularioAsignarDueno negocioId={negocio.id} />
        </div>
      </Seccion>

      <Seccion
        titulo="Modo soporte"
        descripcion="Mira el panel del negocio tal como lo ve su dueño, en solo lectura y por 2 horas. Queda en la auditoría."
      >
        <FormularioSoporte negocioId={negocio.id} />
      </Seccion>

      <Seccion titulo="Auditoría de este negocio" descripcion="Lo que la super administración ha hecho aquí.">
        <TablaAuditoria filas={auditoria} conNegocio={false} />
      </Seccion>

      <Seccion
        titulo="Borrar"
        descripcion={
          negocioEstaVacio(conteo)
            ? "El negocio no tiene operación: se puede borrar. Para uno con datos, suspéndelo."
            : `Tiene operación (${conteo.clientes} clientes, ${conteo.motos} motos, ${conteo.ventas} ventas, ${conteo.empenos} empeños, ${conteo.gastos} gastos): no se borra, se suspende.`
        }
      >
        {negocioEstaVacio(conteo) ? <FormularioEliminarNegocio negocioId={negocio.id} nombre={negocio.nombre} /> : null}
      </Seccion>
    </div>
  );
}

function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="superficie p-4 sm:p-5">
      <h2 className="text-sm font-semibold">{titulo}</h2>
      {descripcion ? <p className="mt-1 text-xs text-muted-foreground">{descripcion}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
