/**
 * Solicitudes de demo.
 *
 * `solicitudes_demo` es la única tabla sin `tenant_id`: vive en la landing, que
 * es anónima. Su política RLS deja insertar a cualquiera y leer solo al super
 * admin, así que la inserción funciona sin contexto de tenant y sin exponer
 * prospectos a los dueños.
 */

import { randomUUID } from "node:crypto";
import { desc } from "drizzle-orm";

import { conAdmin, sinContexto } from "@/db";
import { solicitudesDemo } from "@/db/schema";
import type { SolicitudDemoInput } from "@/domain/solicitud-demo";

/**
 * Sin `returning`: en Postgres, `INSERT ... RETURNING` exige que la fila pase
 * también la política de LECTURA, y aquí leer es solo del super admin. Con
 * `returning` la inserción pública fallaba siempre (comprobado contra Neon). El
 * id se genera aquí para poder devolverlo sin volver a leer la fila.
 */
export async function registrarSolicitud(datos: SolicitudDemoInput): Promise<{ id: string }> {
  const id = randomUUID();
  await sinContexto((tx) =>
    tx.insert(solicitudesDemo).values({
      id,
      nombre: datos.nombre,
      negocio: datos.negocio,
      telefono: datos.telefono,
      email: datos.email,
      ciudad: datos.ciudad,
      mensaje: datos.mensaje,
      aceptaTratamientoDatos: datos.aceptaTratamientoDatos,
      aceptaComunicaciones: datos.aceptaComunicaciones,
      consentimientoEn: new Date(),
    }),
  );
  return { id };
}

/** Listado para el panel de super administración. */
export async function listarSolicitudes(limite = 50) {
  return conAdmin(async (tx) =>
    tx
      .select()
      .from(solicitudesDemo)
      .orderBy(desc(solicitudesDemo.creadoEn))
      .limit(limite),
  );
}
