/**
 * Datos del propio negocio, vistos por su dueño.
 *
 * Va aparte de `tenants.ts` porque aquel es de super administración (`conAdmin`,
 * cruza negocios). Aquí se lee con `conTenant`: la política de `tenants` solo deja
 * ver la fila del negocio de la sesión.
 */

import { conTenant } from "@/db";
import { tenants } from "@/db/schema";

export type DatosNegocio = {
  nombre: string;
  nit: string | null;
  telefono: string | null;
  ciudad: string | null;
  direccion: string | null;
};

export async function datosDelNegocio(tenantId: string): Promise<DatosNegocio | null> {
  return conTenant(tenantId, async (tx) => {
    const [fila] = await tx
      .select({
        nombre: tenants.nombre,
        nit: tenants.nit,
        telefono: tenants.telefono,
        ciudad: tenants.ciudad,
        direccion: tenants.direccion,
      })
      .from(tenants)
      .limit(1);
    return fila ?? null;
  });
}
