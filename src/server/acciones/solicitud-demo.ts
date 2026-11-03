"use server";

import { solicitudDemoSchema, type SolicitudDemoInput } from "@/domain/solicitud-demo";
import { CAMPO_TRAMPA } from "@/domain/solicitud-demo";
import { registrarSolicitud } from "@/server/repositorios/solicitudes";

export type EstadoFormulario = {
  ok: boolean;
  /** Errores por campo, listos para pintar junto a cada input. */
  errores?: Partial<Record<keyof SolicitudDemoInput, string>>;
  /** Error general, cuando no es culpa de un campo. */
  mensaje?: string;
};

/**
 * Server Action del formulario de demo.
 *
 * Valida en el servidor con el MISMO esquema Zod que usa el cliente: la
 * validación del navegador es comodidad, la del servidor es la que cuenta.
 */
export async function enviarSolicitudDemo(
  _estadoPrevio: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const crudo = Object.fromEntries(formData);

  // Campo trampa: invisible para las personas, los robots lo llenan. Se responde
  // como si se hubiera guardado para que el robot no aprenda a evitarlo.
  if (String(crudo[CAMPO_TRAMPA] ?? "").trim() !== "") return { ok: true };

  const resultado = solicitudDemoSchema.safeParse(crudo);
  if (!resultado.success) {
    const errores: EstadoFormulario["errores"] = {};
    for (const problema of resultado.error.issues) {
      const campo = problema.path[0];
      if (typeof campo === "string" && !(campo in errores)) {
        errores[campo as keyof SolicitudDemoInput] = problema.message;
      }
    }
    return { ok: false, errores };
  }

  try {
    await registrarSolicitud(resultado.data);
    return { ok: true };
  } catch (error) {
    console.error("[solicitud-demo] no se pudo guardar", error);
    return {
      ok: false,
      mensaje: "No pudimos guardar tu solicitud. Intenta de nuevo en un momento.",
    };
  }
}
