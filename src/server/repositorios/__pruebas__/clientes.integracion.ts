/**
 * Catálogo de clientes contra Postgres de verdad: duplicados por negocio,
 * búsqueda, totales e historial, todo bajo RLS.
 */

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { cerrarPool, conTenant } from "@/db";
import { clientes, motos } from "@/db/schema";
import { crearClienteSchema, filtrosClientesSchema } from "@/domain/cliente";
import { ErrorNegocio } from "@/domain/errores";
import { hayBaseDeDatos, limpiarNegocios, sembrarNegocio } from "@/pruebas/base";
import {
  actualizarCliente,
  crearCliente,
  historialDeCliente,
  listarClientes,
  obtenerCliente,
} from "../clientes";
import { registrarVenta } from "../ventas";

const soloConBase = describe.skipIf(!hayBaseDeDatos());

const NUEVO = crearClienteSchema.parse({
  tipoDocumento: "NIT",
  numeroDocumento: "800.197.268-4",
  nombres: "Repuestos La 80",
  telefono: "3115556677",
});

soloConBase("catálogo de clientes", () => {
  let a: Awaited<ReturnType<typeof sembrarNegocio>>;
  let b: Awaited<ReturnType<typeof sembrarNegocio>>;
  let clienteSembradoA: string;
  let nuevoEnA: string;

  beforeAll(async () => {
    a = await sembrarNegocio("ClientesA");
    b = await sembrarNegocio("ClientesB");
    clienteSembradoA = (await conTenant(a.tenantId, (tx) => tx.select().from(clientes)))[0]!.id;
  });

  afterAll(async () => {
    await limpiarNegocios([a.tenantId, b.tenantId]);
    await cerrarPool();
  });

  it("crea un cliente y no deja repetir su documento en el mismo negocio", async () => {
    nuevoEnA = await crearCliente(a.tenantId, NUEVO);
    expect((await obtenerCliente(a.tenantId, nuevoEnA))?.numeroDocumento).toBe("8001972684");
    await expect(crearCliente(a.tenantId, NUEVO)).rejects.toBeInstanceOf(ErrorNegocio);
  });

  it("el mismo documento sí puede existir en otro negocio, y cada uno ve solo el suyo", async () => {
    const enB = await crearCliente(b.tenantId, NUEVO);
    expect(enB).not.toBe(nuevoEnA);
    expect(await obtenerCliente(b.tenantId, nuevoEnA)).toBeNull();
    expect(await obtenerCliente(a.tenantId, enB)).toBeNull();
  });

  it("no se puede cambiar el documento de un cliente al de otro del negocio", async () => {
    const sembrado = (await obtenerCliente(a.tenantId, clienteSembradoA))!;
    await expect(
      actualizarCliente(a.tenantId, {
        clienteId: clienteSembradoA,
        tipoDocumento: "NIT",
        numeroDocumento: "8001972684",
        nombres: sembrado.nombres,
        telefono: sembrado.telefono,
      }),
    ).rejects.toThrow(/Ya tienes un cliente/);
  });

  it("busca por nombre, por documento con puntos y por teléfono, y solo en su negocio", async () => {
    const buscar = (texto: string) => listarClientes(a.tenantId, filtrosClientesSchema.parse({ texto }));
    expect((await buscar("la 80")).filas.map((fila) => fila.id)).toEqual([nuevoEnA]);
    expect((await buscar("800.197")).filas.map((fila) => fila.id)).toEqual([nuevoEnA]);
    expect((await buscar("311 555")).filas.map((fila) => fila.id)).toEqual([nuevoEnA]);
    expect((await listarClientes(b.tenantId, filtrosClientesSchema.parse({}))).total).toBe(2);
  });

  it("los totales suman sus compras vigentes y el capital de sus empeños", async () => {
    const [moto] = await conTenant(a.tenantId, (tx) => tx.select().from(motos));
    await registrarVenta(a.tenantId, {
      motoId: moto!.id,
      precioPactado: 5_000_000,
      fecha: "2026-02-01",
      compradorNombre: "Cliente ClientesA",
      compradorCedula: a.numeroDocumento,
      compradorTelefono: "3001234567",
      metodoPago: "efectivo",
      observaciones: undefined,
    });

    const { filas } = await listarClientes(a.tenantId, filtrosClientesSchema.parse({ texto: a.numeroDocumento }));
    expect(filas[0]).toMatchObject({ id: clienteSembradoA, totalComprado: 5_000_000, totalEmpenado: 1_000_000 });
  });

  it("el historial reúne lo que compró, lo que nos vendió y sus empeños", async () => {
    // La moto sembrada no tiene proveedor: se le asigna el documento del cliente.
    const [moto] = await conTenant(a.tenantId, (tx) => tx.select().from(motos));
    await conTenant(a.tenantId, (tx) =>
      tx.update(motos).set({ proveedorCedula: a.numeroDocumento }).where(eq(motos.id, moto!.id)),
    );

    const historial = await historialDeCliente(a.tenantId, { id: clienteSembradoA, numeroDocumento: a.numeroDocumento });
    expect(historial.compras).toHaveLength(1);
    expect(historial.ventasAlNegocio.map((fila) => fila.motoId)).toEqual([moto!.id]);
    expect(historial.empenos.map((fila) => fila.numero)).toEqual([a.numeroEmpeno]);

    // Desde el otro negocio, el mismo cliente no tiene historia visible.
    const ajeno = await historialDeCliente(b.tenantId, { id: clienteSembradoA, numeroDocumento: a.numeroDocumento });
    expect(ajeno).toEqual({ compras: [], ventasAlNegocio: [], empenos: [] });
  });
});
