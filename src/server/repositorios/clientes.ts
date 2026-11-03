/**
 * Clientes.
 *
 * En el mostrador el cliente casi siempre es nuevo, así que la operación
 * principal no es "crear" sino "encontrar o crear": el formulario de empeño pide
 * la cédula y el nombre, y aquí se decide si reutilizar la ficha existente o
 * abrir una nueva.
 */

import { and, asc, count, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";

import { conTenant } from "@/db";
import { clientes, empenos, motos, ventas } from "@/db/schema";
import type { CrearClienteInput, EditarClienteInput, FiltrosClientes } from "@/domain/cliente";
import type { DatosClienteEmpeno } from "@/domain/empeno";
import { ErrorNegocio } from "@/domain/errores";

export type ClienteResumen = {
  id: string;
  nombres: string;
  apellidos: string | null;
  numeroDocumento: string;
  telefono: string;
};

/** Busca clientes por nombre, apellido o cédula. */
export async function buscarClientes(
  tenantId: string,
  texto: string,
  limite = 30,
): Promise<ClienteResumen[]> {
  const termino = texto.trim();
  if (termino === "") return [];

  return conTenant(tenantId, async (tx) =>
    tx
      .select({
        id: clientes.id,
        nombres: clientes.nombres,
        apellidos: clientes.apellidos,
        numeroDocumento: clientes.numeroDocumento,
        telefono: clientes.telefono,
      })
      .from(clientes)
      .where(
        or(
          ilike(clientes.nombres, `%${termino}%`),
          ilike(clientes.apellidos, `%${termino}%`),
          ilike(clientes.numeroDocumento, `%${termino}%`),
        ),
      )
      .limit(limite),
  );
}

/**
 * Devuelve el cliente con esa cédula, creándolo si no existe.
 *
 * La unicidad la garantiza el índice `(tenant_id, numero_documento)`. Si dos
 * peticiones intentan crear el mismo cliente a la vez, una falla con
 * `unique_violation`; en ese caso se vuelve a leer, porque el cliente que
 * queríamos ya existe y ese es el resultado correcto.
 */
export async function buscarOCrearCliente(
  tenantId: string,
  datos: DatosClienteEmpeno,
): Promise<string> {
  return conTenant(tenantId, async (tx) => {
    const [existente] = await tx
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.numeroDocumento, datos.cedula))
      .limit(1);

    if (existente) {
      // Se completan los datos que hayan cambiado: el cliente pudo cambiar de
      // teléfono desde la última vez.
      await tx
        .update(clientes)
        .set({
          nombres: datos.nombres,
          apellidos: datos.apellidos,
          telefono: datos.telefono,
          email: datos.email,
          actualizadoEn: new Date(),
        })
        .where(eq(clientes.id, existente.id));

      return existente.id;
    }

    const [creado] = await tx
      .insert(clientes)
      .values({
        tenantId,
        numeroDocumento: datos.cedula,
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        telefono: datos.telefono,
        email: datos.email,
      })
      .returning({ id: clientes.id });

    if (!creado) throw new Error("No se pudo registrar el cliente.");
    return creado.id;
  });
}

/* ------------------------------------------------------------------ */
/* Catálogo (Bloque 4)                                                 */
/* ------------------------------------------------------------------ */

export type ClienteListado = ClienteResumen & {
  tipoDocumento: string;
  /** Suma de sus compras activas (tabla `ventas`). */
  totalComprado: number;
  /** Capital de todos sus empeños, activos y cerrados. */
  totalEmpenado: number;
};

/**
 * Listado paginado con búsqueda en una sola caja (documento, nombre completo o
 * teléfono) y los totales de cada cliente. Los totales salen de dos subconsultas
 * agrupadas que se unen una vez por cliente: no hay una consulta por fila.
 */
export async function listarClientes(
  tenantId: string,
  filtros: FiltrosClientes,
): Promise<{ filas: ClienteListado[]; total: number }> {
  return conTenant(tenantId, async (tx) => {
    const texto = filtros.texto?.trim();
    const digitos = texto?.replace(/\D/g, "") ?? "";
    const donde = texto
      ? or(
          ilike(sql`concat_ws(' ', ${clientes.nombres}, ${clientes.apellidos})`, `%${texto}%`),
          ilike(clientes.numeroDocumento, `%${texto}%`),
          // «1.020.304» o «300 123» también encuentran: se busca por los dígitos.
          digitos.length >= 3 ? ilike(clientes.numeroDocumento, `%${digitos}%`) : undefined,
          digitos.length >= 3 ? ilike(clientes.telefono, `%${digitos}%`) : undefined,
        )
      : undefined;

    const compras = tx
      .select({
        clienteId: ventas.clienteId,
        total: sql<number>`sum(${ventas.precioPactado})::bigint`.as("total_comprado"),
      })
      .from(ventas)
      .where(eq(ventas.estado, "activa"))
      .groupBy(ventas.clienteId)
      .as("compras");
    const prestamos = tx
      .select({
        clienteId: empenos.clienteId,
        total: sql<number>`sum(${empenos.capital})::bigint`.as("total_empenado"),
      })
      .from(empenos)
      .groupBy(empenos.clienteId)
      .as("prestamos");

    const filas = await tx
      .select({
        id: clientes.id,
        tipoDocumento: clientes.tipoDocumento,
        numeroDocumento: clientes.numeroDocumento,
        nombres: clientes.nombres,
        apellidos: clientes.apellidos,
        telefono: clientes.telefono,
        totalComprado: sql<number>`coalesce(${compras.total}, 0)::bigint`,
        totalEmpenado: sql<number>`coalesce(${prestamos.total}, 0)::bigint`,
      })
      .from(clientes)
      .leftJoin(compras, eq(compras.clienteId, clientes.id))
      .leftJoin(prestamos, eq(prestamos.clienteId, clientes.id))
      .where(donde)
      .orderBy(asc(clientes.nombres), asc(clientes.apellidos), asc(clientes.id))
      .limit(filtros.porPagina)
      .offset((filtros.pagina - 1) * filtros.porPagina);

    const [conteo] = await tx.select({ total: count() }).from(clientes).where(donde);

    return {
      filas: filas.map((fila) => ({
        ...fila,
        totalComprado: Number(fila.totalComprado),
        totalEmpenado: Number(fila.totalEmpenado),
      })),
      total: Number(conteo?.total ?? 0),
    };
  });
}

/** Ficha completa. `null` si no existe o es de otro negocio (RLS). */
export async function obtenerCliente(tenantId: string, clienteId: string) {
  return conTenant(tenantId, async (tx) => {
    const [fila] = await tx.select().from(clientes).where(eq(clientes.id, clienteId)).limit(1);
    return fila ?? null;
  });
}

/** Mensaje cuando el documento ya pertenece a otro cliente del negocio. */
function documentoRepetido(numero: string): ErrorNegocio {
  return new ErrorNegocio(`Ya tienes un cliente con el documento ${numero}. Búscalo en el listado.`);
}

/**
 * Crea un cliente. El índice `(tenant_id, numero_documento)` es la garantía
 * contra duplicados; la consulta previa solo está para dar un mensaje claro.
 */
export async function crearCliente(tenantId: string, datos: CrearClienteInput): Promise<string> {
  return conTenant(tenantId, async (tx) => {
    const [existente] = await tx
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.numeroDocumento, datos.numeroDocumento))
      .limit(1);
    if (existente) throw documentoRepetido(datos.numeroDocumento);

    const [creado] = await tx
      .insert(clientes)
      .values({ tenantId, ...datos })
      .returning({ id: clientes.id });
    if (!creado) throw new Error("No se pudo registrar el cliente.");
    return creado.id;
  });
}

/** Corrige los datos de un cliente. Un opcional vacío borra el valor anterior. */
export async function actualizarCliente(tenantId: string, datos: EditarClienteInput) {
  const { clienteId, ...cambios } = datos;
  return conTenant(tenantId, async (tx) => {
    const [otro] = await tx
      .select({ id: clientes.id })
      .from(clientes)
      .where(and(eq(clientes.numeroDocumento, cambios.numeroDocumento), ne(clientes.id, clienteId)))
      .limit(1);
    if (otro) throw documentoRepetido(cambios.numeroDocumento);

    const [fila] = await tx
      .update(clientes)
      .set({
        ...cambios,
        apellidos: cambios.apellidos ?? null,
        telefonoAlterno: cambios.telefonoAlterno ?? null,
        email: cambios.email ?? null,
        direccion: cambios.direccion ?? null,
        ciudad: cambios.ciudad ?? null,
        notas: cambios.notas ?? null,
        actualizadoEn: new Date(),
      })
      .where(eq(clientes.id, clienteId))
      .returning({ id: clientes.id });
    return fila ?? null;
  });
}

/**
 * Historial unificado del cliente:
 *
 * - **compras**: motos que le vendimos (`ventas`, activas y devueltas).
 * - **ventasAlNegocio**: motos que nos vendió. `motos` guarda al proveedor en
 *   línea (sin `cliente_id`), así que se relacionan por documento.
 * - **empenos**: todos, abiertos y cerrados.
 */
export async function historialDeCliente(tenantId: string, cliente: { id: string; numeroDocumento: string }) {
  return conTenant(tenantId, async (tx) => {
    const compras = await tx
      .select({
        ventaId: ventas.id,
        motoId: motos.id,
        placa: motos.placa,
        marca: motos.marca,
        modelo: motos.modelo,
        anio: motos.anio,
        fecha: ventas.fecha,
        precioPactado: ventas.precioPactado,
        estado: ventas.estado,
      })
      .from(ventas)
      .innerJoin(motos, eq(motos.id, ventas.motoId))
      .where(eq(ventas.clienteId, cliente.id))
      .orderBy(desc(ventas.fecha), desc(ventas.creadoEn));

    const ventasAlNegocio = await tx
      .select({
        motoId: motos.id,
        placa: motos.placa,
        marca: motos.marca,
        modelo: motos.modelo,
        anio: motos.anio,
        fechaCompra: motos.fechaCompra,
        precioCompra: motos.precioCompra,
        estado: motos.estado,
      })
      .from(motos)
      .where(and(eq(motos.proveedorCedula, cliente.numeroDocumento), isNull(motos.eliminadaEn)))
      .orderBy(desc(motos.fechaCompra));

    const empenosDelCliente = await tx
      .select({
        id: empenos.id,
        numero: empenos.numero,
        tipoBien: empenos.tipoBien,
        capital: empenos.capital,
        fechaInicio: empenos.fechaInicio,
        fechaVencimiento: empenos.fechaVencimiento,
        estado: empenos.estado,
      })
      .from(empenos)
      .where(eq(empenos.clienteId, cliente.id))
      .orderBy(desc(empenos.fechaInicio));

    return { compras, ventasAlNegocio, empenos: empenosDelCliente };
  });
}
