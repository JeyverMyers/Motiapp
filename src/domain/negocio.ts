/**
 * Negocios (tenants) vistos desde la super administración: planes, acceso y
 * los formularios del panel /admin.
 *
 * ## Planes (DN1)
 *
 * - **Negociante** (`basico`): todo compra/venta. Sin límites artificiales de
 *   motos ni de clientes: está prohibido por la regla de balance.
 * - **Empresa** (`pro`) e **Ilimitado** (`ilimitado`, plan heredado): lo
 *   anterior más el módulo de empeños.
 *
 * El plan se aplica en el servidor (páginas y acciones), no solo ocultando un
 * enlace del menú.
 */

import { z } from "zod";

import { normalizarDocumento } from "./cliente";
import { emailSchema, idSchema, telefonoSchema, textoOpcional, textoRequerido } from "./comun";
import { ESTADOS_TENANT, PLANES, type EstadoTenant, type Plan } from "./enums";

const vacioComoIndefinido = (valor: unknown) =>
  typeof valor === "string" && valor.trim() === "" ? undefined : valor;

/* ------------------------------------------------------------------ */
/* Planes y acceso                                                     */
/* ------------------------------------------------------------------ */

export const MODULOS = ["compra_venta", "empenos"] as const;
export type ModuloNegocio = (typeof MODULOS)[number];

const MODULOS_POR_PLAN: Record<Plan, readonly ModuloNegocio[]> = {
  basico: ["compra_venta"],
  pro: ["compra_venta", "empenos"],
  ilimitado: ["compra_venta", "empenos"],
};

/** ¿El plan incluye el módulo? Un plan desconocido no incluye nada extra. */
export function tieneModulo(plan: string | null | undefined, modulo: ModuloNegocio): boolean {
  if (modulo === "compra_venta") return true;
  return (MODULOS_POR_PLAN[plan as Plan] ?? ["compra_venta"]).includes(modulo);
}

/** Un negocio suspendido no entra; uno en prueba sí. */
export function negocioPuedeEntrar(estado: string | null | undefined): boolean {
  return estado === "activo" || estado === "prueba";
}

/** Cuánto dura una sesión de soporte antes de cerrarse sola. */
export const HORAS_SESION_SOPORTE = 2;

/* ------------------------------------------------------------------ */
/* Formularios del panel /admin                                        */
/* ------------------------------------------------------------------ */

const nitOpcional = z.preprocess(
  vacioComoIndefinido,
  z
    .string()
    .trim()
    .transform((valor, contexto) => {
      const resultado = normalizarDocumento("NIT", valor);
      if (!resultado.ok) {
        contexto.addIssue({ code: "custom", message: resultado.error });
        return z.NEVER;
      }
      return resultado.numero;
    })
    .optional(),
);

const datosNegocio = {
  nombre: textoRequerido({ min: 3, max: 120, campo: "El nombre del negocio" }),
  nit: nitOpcional,
  telefono: z.preprocess(vacioComoIndefinido, telefonoSchema.optional()),
  emailContacto: z.preprocess(vacioComoIndefinido, emailSchema.optional()),
  ciudad: textoOpcional(80, "La ciudad"),
  direccion: textoOpcional(200, "La dirección"),
};

export const crearNegocioSchema = z.object({
  ...datosNegocio,
  plan: z.enum(PLANES).default("pro"),
  estado: z.enum(ESTADOS_TENANT).default("prueba"),
});

export const editarNegocioSchema = z.object({ negocioId: idSchema, ...datosNegocio });

export const planYEstadoSchema = z.object({
  negocioId: idSchema,
  plan: z.enum(PLANES),
  estado: z.enum(ESTADOS_TENANT),
  notasInternas: textoOpcional(1000, "Las notas internas"),
});

export const asignarDuenoSchema = z.object({
  negocioId: idSchema,
  email: emailSchema,
  nombre: textoRequerido({ min: 3, max: 120, campo: "El nombre del dueño" }),
  /** Casilla: el administrador confirma que una cuenta ya existente es de esta persona. */
  confirmarCuentaExistente: z
    .union([z.literal("on"), z.literal("")])
    .optional()
    .transform((valor) => valor === "on"),
});

export const cambiarAccesoUsuarioSchema = z.object({
  negocioId: idSchema,
  usuarioId: idSchema,
  activo: z.enum(["true", "false"]).transform((valor) => valor === "true"),
});

export const iniciarSoporteSchema = z.object({
  negocioId: idSchema,
  motivo: textoRequerido({ min: 10, max: 300, campo: "El motivo" }),
});

export const eliminarNegocioSchema = z.object({
  negocioId: idSchema,
  confirmacion: textoRequerido({ max: 120, campo: "La confirmación" }),
});

export type CrearNegocioInput = z.infer<typeof crearNegocioSchema>;
export type EditarNegocioInput = z.infer<typeof editarNegocioSchema>;
export type PlanYEstadoInput = z.infer<typeof planYEstadoSchema>;

/** Para borrar hay que escribir el nombre exacto (sin importar mayúsculas). */
export function confirmacionCoincide(nombre: string, confirmacion: string): boolean {
  const normalizar = (texto: string) => texto.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
  return normalizar(nombre) === normalizar(confirmacion);
}

export type ConteoNegocio = {
  clientes: number;
  motos: number;
  ventas: number;
  empenos: number;
  gastos: number;
};

/**
 * Solo un negocio sin operación se puede borrar: borrar uno con datos se lleva
 * en cascada su historia (y la de sus clientes). Para los demás, suspender.
 */
export function negocioEstaVacio(conteo: ConteoNegocio): boolean {
  return Object.values(conteo).every((valor) => valor === 0);
}

/** Qué cambió entre dos versiones, para el detalle de la auditoría. */
export function cambiosEntre<T extends Record<string, unknown>>(
  antes: T,
  despues: Partial<T>,
): Record<string, { antes: unknown; despues: unknown }> {
  const cambios: Record<string, { antes: unknown; despues: unknown }> = {};
  for (const [clave, valor] of Object.entries(despues)) {
    const anterior = antes[clave] ?? null;
    const nuevo = valor ?? null;
    if (anterior !== nuevo) cambios[clave] = { antes: anterior, despues: nuevo };
  }
  return cambios;
}

export type { EstadoTenant, Plan };
