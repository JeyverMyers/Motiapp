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
import { formatearFechaHora, formatearTelefono } from "@/lib/formato";
import { listarSolicitudes } from "@/server/repositorios/solicitudes";

export const metadata = {
  title: "Solicitudes de demo",
  robots: { index: false, follow: false },
};

/** Solicitudes que dejaron en la landing pública. No tienen negocio asociado. */
export default async function PaginaSolicitudes() {
  const solicitudes = await listarSolicitudes();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.025em]">Solicitudes de demo</h1>
        <p className="text-sm text-muted-foreground">
          Llegan desde la landing. Solo las ve la super administración.
        </p>
      </div>

      <div className="superficie">
        <Tabla>
          <TablaEncabezado>
            <TablaFila>
              <TablaCeldaEncabezado>Contacto</TablaCeldaEncabezado>
              <TablaCeldaEncabezado>Negocio</TablaCeldaEncabezado>
              <TablaCeldaEncabezado>Mensaje</TablaCeldaEncabezado>
              <TablaCeldaEncabezado>Estado</TablaCeldaEncabezado>
              <TablaCeldaEncabezado>Recibida</TablaCeldaEncabezado>
            </TablaFila>
          </TablaEncabezado>
          <TablaCuerpo>
            {solicitudes.length === 0 ? (
              <TablaVacia columnas={5} mensaje="Todavía no hay solicitudes." />
            ) : (
              solicitudes.map((solicitud) => (
                <TablaFila key={solicitud.id}>
                  <TablaCelda>
                    <span className="font-medium">{solicitud.nombre}</span>
                    <span className="block text-xs text-muted-foreground">
                      <a href={`tel:${solicitud.telefono}`} className="underline-offset-4 hover:underline">
                        {formatearTelefono(solicitud.telefono)}
                      </a>
                      {solicitud.email ? ` · ${solicitud.email}` : ""}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {solicitud.aceptaComunicaciones
                        ? "Acepta comunicaciones comerciales"
                        : solicitud.consentimientoEn
                          ? "Sin comunicaciones comerciales"
                          : "Sin constancia de autorización (anterior a 0005)"}
                    </span>
                  </TablaCelda>
                  <TablaCelda>
                    {solicitud.negocio}
                    <span className="block text-xs text-muted-foreground">
                      {solicitud.ciudad ?? "—"}
                    </span>
                  </TablaCelda>
                  <TablaCelda className="max-w-md text-sm text-muted-foreground">
                    {solicitud.mensaje ?? "—"}
                  </TablaCelda>
                  <TablaCelda>
                    <EtiquetaEstado
                      variant={
                        solicitud.estado === "nueva"
                          ? "info"
                          : solicitud.estado === "convertida"
                            ? "exito"
                            : "neutro"
                      }
                    >
                      {solicitud.estado}
                    </EtiquetaEstado>
                  </TablaCelda>
                  <TablaCelda className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatearFechaHora(solicitud.creadoEn)}
                  </TablaCelda>
                </TablaFila>
              ))
            )}
          </TablaCuerpo>
        </Tabla>
      </div>
    </div>
  );
}
