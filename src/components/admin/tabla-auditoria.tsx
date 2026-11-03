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
import { formatearFechaHora } from "@/lib/formato";
import { comoRuta } from "@/lib/rutas";

const ETIQUETA_ACCION: Record<string, string> = {
  crear_negocio: "Creó el negocio",
  editar_negocio: "Editó datos",
  cambiar_plan: "Cambió el plan",
  cambiar_estado: "Cambió el estado",
  asignar_dueno: "Dio acceso a un dueño",
  cambiar_acceso_usuario: "Cambió un acceso",
  eliminar_negocio: "Borró el negocio",
  iniciar_soporte: "Entró en modo soporte",
  terminar_soporte: "Salió del modo soporte",
};

type FilaAuditoria = {
  id: string;
  usuarioEmail: string;
  accion: string;
  negocioId: string | null;
  negocioNombre: string | null;
  detalle: Record<string, unknown>;
  creadoEn: Date;
};

/** Resume el detalle en una línea legible: «plan: basico → pro», «motivo: …». */
function resumenDetalle(detalle: Record<string, unknown>): string {
  return Object.entries(detalle)
    .map(([clave, valor]) => {
      if (valor && typeof valor === "object" && "antes" in valor && "despues" in valor) {
        const cambio = valor as { antes: unknown; despues: unknown };
        return `${clave}: ${String(cambio.antes ?? "—")} → ${String(cambio.despues ?? "—")}`;
      }
      return `${clave}: ${String(valor)}`;
    })
    .join(" · ");
}

export function TablaAuditoria({ filas, conNegocio = true }: { filas: FilaAuditoria[]; conNegocio?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Tabla>
        <TablaEncabezado>
          <TablaFila>
            <TablaCeldaEncabezado>Cuándo</TablaCeldaEncabezado>
            <TablaCeldaEncabezado>Quién</TablaCeldaEncabezado>
            <TablaCeldaEncabezado>Qué</TablaCeldaEncabezado>
            {conNegocio ? <TablaCeldaEncabezado>Negocio</TablaCeldaEncabezado> : null}
            <TablaCeldaEncabezado>Detalle</TablaCeldaEncabezado>
          </TablaFila>
        </TablaEncabezado>
        <TablaCuerpo>
          {filas.length === 0 ? (
            <TablaVacia columnas={conNegocio ? 5 : 4} mensaje="Sin movimientos registrados." />
          ) : (
            filas.map((fila) => (
              <TablaFila key={fila.id}>
                <TablaCelda className="whitespace-nowrap text-muted-foreground">{formatearFechaHora(fila.creadoEn)}</TablaCelda>
                <TablaCelda>{fila.usuarioEmail}</TablaCelda>
                <TablaCelda className="font-medium">{ETIQUETA_ACCION[fila.accion] ?? fila.accion}</TablaCelda>
                {conNegocio ? (
                  <TablaCelda>
                    {fila.negocioId && fila.accion !== "eliminar_negocio" ? (
                      <Link
                        href={comoRuta(`/admin/negocios/${fila.negocioId}`)}
                        className="underline-offset-4 hover:underline"
                      >
                        {fila.negocioNombre ?? "—"}
                      </Link>
                    ) : (
                      (fila.negocioNombre ?? "—")
                    )}
                  </TablaCelda>
                ) : null}
                <TablaCelda className="max-w-md text-xs text-muted-foreground">{resumenDetalle(fila.detalle) || "—"}</TablaCelda>
              </TablaFila>
            ))
          )}
        </TablaCuerpo>
      </Tabla>
    </div>
  );
}
