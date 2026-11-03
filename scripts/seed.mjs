/**
 * Datos de demostración para probar la app a mano.
 *
 *   pnpm db:seed                 crea usuarios + negocio demo (si no existen)
 *   pnpm db:seed --solo-datos    solo el negocio demo, sin tocar Neon Auth
 *   pnpm db:seed --reiniciar     borra el negocio demo y lo vuelve a crear
 *
 * ## Qué crea
 *
 * - Un super admin y un dueño en Neon Auth, con su perfil en `usuarios`.
 * - El negocio «Motos El Rápido» (plan Empresa —`pro`—, activo) con 20 clientes, 30 motos
 *   (disponibles, reservadas, en reparación y vendidas), 15 gastos de motos y
 *   10 empeños (al día, por vencer, vencidos y pagados) con sus abonos.
 *
 * ## Idempotente
 *
 * El negocio demo tiene un id fijo: si ya existe, sus datos no se tocan (salvo
 * con `--reiniciar`). Los usuarios se buscan por correo antes de crearlos.
 *
 * ## Credenciales
 *
 * Correos y contraseñas salen de `.env.local` (`SEED_SUPERADMIN_EMAIL`,
 * `SEED_SUPERADMIN_PASSWORD`, `SEED_DUENO_EMAIL`, `SEED_DUENO_PASSWORD`). Si no
 * hay contraseña, se genera una al azar y se imprime al final: guárdala, porque
 * en la siguiente corrida el usuario ya existe y no se vuelve a mostrar.
 *
 * ## Seguridad
 *
 * Escribe con el rol dueño (`DATABASE_URL_MIGRACIONES`), que no está sujeto a
 * RLS, así que cada fila lleva su `tenant_id` explícito. Se niega a correr si
 * encuentra negocios activos distintos del demo: eso es una base con datos
 * reales y aquí no se siembra nada.
 */

import { randomBytes } from "node:crypto";
import { Pool } from "pg";

/* ------------------------------------------------------------------ */
/* Configuración                                                       */
/* ------------------------------------------------------------------ */

const TENANT_DEMO_ID = "0de30000-0000-4000-8000-000000000001";
const ZONA_HORARIA = "America/Bogota";

const argumentos = new Set(process.argv.slice(2));
const SOLO_DATOS = argumentos.has("--solo-datos");
const REINICIAR = argumentos.has("--reiniciar");

const urlDueno = process.env.DATABASE_URL_MIGRACIONES;
const urlAuth = process.env.NEON_AUTH_BASE_URL;

if (!urlDueno) {
  console.error("Falta DATABASE_URL_MIGRACIONES en .env.local (rol dueño, rama desarrollo).");
  process.exit(1);
}
if (!SOLO_DATOS && !urlAuth) {
  console.error("Falta NEON_AUTH_BASE_URL en .env.local. Usa --solo-datos para sembrar sin usuarios.");
  process.exit(1);
}

const USUARIOS = {
  superAdmin: {
    email: (process.env.SEED_SUPERADMIN_EMAIL ?? "admin@motiapp.test").toLowerCase(),
    password: process.env.SEED_SUPERADMIN_PASSWORD || undefined,
    nombre: process.env.SEED_SUPERADMIN_NOMBRE ?? "Super Admin",
  },
  dueno: {
    email: (process.env.SEED_DUENO_EMAIL ?? "dueno@motoselrapido.test").toLowerCase(),
    password: process.env.SEED_DUENO_PASSWORD || undefined,
    nombre: process.env.SEED_DUENO_NOMBRE ?? "Carlos Restrepo",
  },
};

const pool = new Pool({ connectionString: urlDueno, max: 1 });

/* ------------------------------------------------------------------ */
/* Fechas (en la zona del negocio, como la app)                        */
/* ------------------------------------------------------------------ */

const HOY = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

/** AAAA-MM-DD corrido N días (negativo = hacia atrás). */
function dia(desplazamiento, base = HOY) {
  const fecha = new Date(`${base}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + desplazamiento);
  return fecha.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* Datos fijos (deterministas: la misma corrida da los mismos datos)  */
/* ------------------------------------------------------------------ */

const NOMBRES = [
  ["María Fernanda", "Gómez Ruiz"], ["Juan Camilo", "Restrepo Díaz"], ["Luisa", "Martínez Ospina"],
  ["Andrés Felipe", "Cardona López"], ["Daniela", "Henao Zapata"], ["Jhon Jairo", "Muñoz Arango"],
  ["Paola Andrea", "Vélez Castaño"], ["Sebastián", "Ríos Moreno"], ["Natalia", "Giraldo Torres"],
  ["Cristian David", "Quintero Gil"], ["Valentina", "Suárez Patiño"], ["Wilmar", "Agudelo Rendón"],
  ["Carolina", "Mejía Salazar"], ["Edwin Alexis", "Montoya Correa"], ["Yuliana", "Arias Bedoya"],
  ["Stiven", "Londoño Cano"], ["Diana Marcela", "Pineda Echeverri"], ["Óscar Iván", "Duque Marín"],
  ["Laura Sofía", "Hoyos Betancur"], ["Brayan Steven", "Valencia Ramírez"],
];

const MODELOS_MOTO = [
  ["Yamaha", "FZ 2.0", 150], ["Honda", "CB 125F", 125], ["Suzuki", "GN 125", 125],
  ["Bajaj", "Pulsar NS 200", 200], ["AKT", "NKD 125", 125], ["TVS", "Apache RTR 160", 160],
  ["Hero", "Eco Deluxe", 100], ["KTM", "Duke 200", 200], ["Yamaha", "XTZ 150", 150],
  ["Honda", "XR 150L", 150],
];

const COLORES = ["Negro", "Rojo", "Azul", "Blanco", "Gris", "Verde"];

/** Cédula colombiana: 10 dígitos, sin puntos (así la guarda la app). */
function cedula(indice) {
  return String(1_017_000_000 + indice * 104_729).slice(0, 10);
}

/** Celular colombiano: 10 dígitos que empiezan por 3. */
function celular(indice) {
  return `3${String(100_000_000 + indice * 7_654_321).slice(0, 9)}`;
}

/** Placa de moto colombiana: tres letras, dos números y una letra (ABC12D). */
function placaMoto(indice) {
  const letras = "BCDFGHJKLMNPRSTVWXYZ";
  const a = letras[indice % 20];
  const b = letras[(indice * 7) % 20];
  const c = letras[(indice * 13) % 20];
  const d = letras[(indice * 3 + 5) % 20];
  return `${a}${b}${c}${String(10 + indice).slice(-2)}${d}`;
}

/* ------------------------------------------------------------------ */
/* Usuarios en Neon Auth                                               */
/* ------------------------------------------------------------------ */

async function idDeUsuarioAuth(cliente, email) {
  const { rows } = await cliente.query(
    `select id from neon_auth."user" where lower(email) = lower($1) limit 1`,
    [email],
  );
  return rows[0]?.id ?? null;
}

/** ¿Ese correo entra con esa contraseña? Prueba un inicio de sesión real. */
async function contrasenaFunciona(email, password) {
  const respuesta = await fetch(`${urlAuth.replace(/\/$/, "")}/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify({ email, password }),
  });
  return respuesta.ok;
}

/**
 * Crea el usuario con la API de Neon Auth (la misma que usa el formulario de
 * registro), para que la contraseña quede con el hash que Neon espera. Nunca se
 * escribe directo en `neon_auth`: es del servicio, no nuestro.
 */
async function asegurarUsuarioAuth(cliente, usuario) {
  const existente = await idDeUsuarioAuth(cliente, usuario.email);
  if (existente) {
    // Better Auth no deja cambiar una contraseña sin la actual, un token de
    // correo o una sesión de admin; el seed no tiene ninguno. Lo que sí puede es
    // comprobar que la configurada funciona y avisar si no, en vez de imprimir
    // «ya existía» y dejar al usuario sin poder entrar.
    const funciona = usuario.password ? await contrasenaFunciona(usuario.email, usuario.password) : null;
    return { id: existente, creado: false, password: null, contrasenaFunciona: funciona };
  }

  const password = usuario.password ?? randomBytes(12).toString("base64url");
  const respuesta = await fetch(`${urlAuth.replace(/\/$/, "")}/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify({ email: usuario.email, password, name: usuario.nombre }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => "");
    throw new Error(
      `Neon Auth rechazó crear ${usuario.email} (HTTP ${respuesta.status}): ${detalle.slice(0, 300)}`,
    );
  }

  const cuerpo = await respuesta.json();
  const id = cuerpo?.user?.id ?? (await idDeUsuarioAuth(cliente, usuario.email));
  if (!id) throw new Error(`Neon Auth no devolvió el id de ${usuario.email}.`);
  return { id, creado: true, password };
}

/* ------------------------------------------------------------------ */
/* Negocio demo                                                        */
/* ------------------------------------------------------------------ */

async function sembrarNegocio(cliente) {
  const t = TENANT_DEMO_ID;

  await cliente.query(
    `insert into tenants (id, nombre, nit, telefono, email_contacto, ciudad, direccion, estado, plan, tasa_mensual_defecto)
     values ($1, 'Motos El Rápido', '901234567-1', '6045551234', 'contacto@motoselrapido.test',
             'Medellín', 'Cra. 52 #45-10', 'activo', 'pro', 10)`,
    [t],
  );

  // 20 clientes.
  const clientes = [];
  for (const [indice, [nombres, apellidos]] of NOMBRES.entries()) {
    const { rows } = await cliente.query(
      `insert into clientes (tenant_id, tipo_documento, numero_documento, nombres, apellidos, telefono, ciudad)
       values ($1, 'CC', $2, $3, $4, $5, 'Medellín') returning id`,
      [t, cedula(indice), nombres, apellidos, celular(indice)],
    );
    clientes.push({
      id: rows[0].id,
      nombre: `${nombres} ${apellidos}`,
      cedula: cedula(indice),
      telefono: celular(indice),
    });
  }

  // 30 motos: 14 disponibles, 4 reservadas, 2 en reparación, 10 vendidas.
  const ESTADOS = [
    ...Array(14).fill("disponible"),
    ...Array(4).fill("reservada"),
    ...Array(2).fill("en_reparacion"),
    ...Array(10).fill("vendida"),
  ];
  const motos = [];
  for (let indice = 0; indice < 30; indice += 1) {
    const [marca, modelo, cilindraje] = MODELOS_MOTO[indice % MODELOS_MOTO.length];
    const estado = ESTADOS[indice];
    // Compras repartidas en los últimos 5 meses: varias pasan de 60 días, que es
    // el umbral de «stock estancado» del panel.
    const fechaCompra = dia(-(5 + ((indice * 37) % 150)));
    const precioCompra = 3_500_000 + ((indice * 450_000) % 6_000_000);
    const proveedor = clientes[(indice + 5) % clientes.length];

    // Precio publicado: compra + 12 a 24 %. Una de cada tres ventas se cerró con
    // una rebaja, para que el reporte de descuentos tenga datos.
    const precioPublicado = Math.round((precioCompra * (1.12 + (indice % 5) * 0.03)) / 10_000) * 10_000;
    const vendida = estado === "vendida";

    const { rows } = await cliente.query(
      `insert into motos (tenant_id, placa, marca, modelo, anio, color, cilindraje,
                          precio_compra, fecha_compra, proveedor_nombre, proveedor_cedula, proveedor_telefono,
                          precio_publicado, estado)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       returning id, fecha_compra::text as fecha_compra`,
      [
        t, placaMoto(indice), marca, modelo, 2016 + (indice % 9), COLORES[indice % COLORES.length], cilindraje,
        precioCompra, fechaCompra, proveedor.nombre, proveedor.cedula, proveedor.telefono,
        precioPublicado, estado,
      ],
    );
    motos.push(rows[0]);

    if (vendida) {
      const comprador = clientes[(indice * 3) % clientes.length];
      const diasHastaVenta = 10 + ((indice * 11) % 40);
      const fechaVenta = [dia(diasHastaVenta, fechaCompra), dia(-1)].sort()[0];
      const rebaja = indice % 3 === 0 ? 100_000 : 0;
      await cliente.query(
        `insert into ventas (tenant_id, moto_id, cliente_id, precio_publicado, precio_pactado, fecha, metodo_pago)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [t, rows[0].id, comprador.id, precioPublicado, precioPublicado - rebaja, fechaVenta,
         indice % 2 === 0 ? "efectivo" : "transferencia"],
      );
    }
  }

  // 15 gastos asociados a motos, siempre después de la compra y no en el futuro.
  const CATEGORIAS = [
    ["reparacion", "Cambio de kit de arrastre"],
    ["repuestos", "Llanta trasera"],
    ["tramites", "Traspaso y SOAT"],
    ["transporte", "Grúa desde el proveedor"],
    ["reparacion", "Mantenimiento general"],
  ];
  for (let indice = 0; indice < 15; indice += 1) {
    const moto = motos[(indice * 2) % motos.length];
    const [categoria, descripcion] = CATEGORIAS[indice % CATEGORIAS.length];
    const fecha = [dia(3 + (indice % 4), moto.fecha_compra), HOY].sort()[0];
    await cliente.query(
      `insert into gastos (tenant_id, modulo, moto_id, monto, fecha, categoria, descripcion)
       values ($1, 'compra_venta', $2, $3, $4, $5, $6)`,
      [t, moto.id, 40_000 + indice * 15_000, fecha, categoria, descripcion],
    );
  }

  await sembrarEmpenos(cliente, clientes);

  return { clientes: clientes.length, motos: motos.length, gastos: 15, empenos: 10 };
}

/**
 * 10 empeños. Los capitales son múltiplos de 300.000 al 10% mensual, para que
 * el interés de cada tramo dé pesos exactos y los saldos de la app cuadren:
 * 30 días sobre C causan C/10, 10 días causan C/30.
 */
async function sembrarEmpenos(cliente, clientes) {
  const t = TENANT_DEMO_ID;
  const TASA = 10;

  const EMPENOS = [
    // Al día.
    { bien: "moto", capital: 1_500_000, inicio: -10, plazo: 30 },
    { bien: "telefono", capital: 600_000, inicio: -18, plazo: 30 },
    { bien: "carro", capital: 6_000_000, inicio: -5, plazo: 60 },
    { bien: "moto", capital: 2_100_000, inicio: -40, plazo: 60, abonos: [{ dias: 30, tipo: "interes" }] },
    // Por vencer (alerta de 7 días).
    { bien: "telefono", capital: 900_000, inicio: -27, plazo: 30 },
    { bien: "moto", capital: 1_800_000, inicio: -24, plazo: 30 },
    // Vencidos (activos con la fecha ya pasada).
    { bien: "moto", capital: 2_400_000, inicio: -35, plazo: 30, abonos: [{ dias: 30, tipo: "interes" }] },
    { bien: "telefono", capital: 1_200_000, inicio: -50, plazo: 30 },
    // Pagados: interés al mes y liquidación diez días después.
    { bien: "carro", capital: 4_500_000, inicio: -70, plazo: 30, pagado: true },
    { bien: "moto", capital: 1_500_000, inicio: -45, plazo: 30, pagado: true },
  ];

  for (const [indice, empeno] of EMPENOS.entries()) {
    const titular = clientes[(indice * 2 + 1) % clientes.length];
    const fechaInicio = dia(empeno.inicio);
    const fechaVencimiento = dia(empeno.plazo, fechaInicio);
    const limiteGracia = dia(30, fechaVencimiento);

    let vehiculoId = null;
    let telefonoId = null;
    if (empeno.bien === "telefono") {
      const { rows } = await cliente.query(
        `insert into telefonos_empeno (tenant_id, marca, modelo, imei, capacidad, color)
         values ($1, $2, $3, $4, '128 GB', $5) returning id`,
        [t, indice % 2 ? "Samsung" : "Xiaomi", indice % 2 ? "Galaxy A54" : "Redmi Note 13",
         `35${String(1_000_000_000_000 + indice * 7_777_777).slice(0, 13)}`, COLORES[indice % COLORES.length]],
      );
      telefonoId = rows[0].id;
    } else {
      const esCarro = empeno.bien === "carro";
      const { rows } = await cliente.query(
        `insert into vehiculos_empeno (tenant_id, tipo, placa, marca, modelo, anio, color)
         values ($1, $2, $3, $4, $5, $6, $7) returning id`,
        [t, empeno.bien, esCarro ? `EMP${100 + indice}` : placaMoto(40 + indice),
         esCarro ? "Chevrolet" : "Yamaha", esCarro ? "Spark GT" : "NMAX 155",
         2015 + (indice % 8), COLORES[(indice + 2) % COLORES.length]],
      );
      vehiculoId = rows[0].id;
    }

    const { rows } = await cliente.query(
      `insert into empenos (tenant_id, numero, cliente_id, cliente_nombre, cliente_cedula, cliente_telefono,
                            tipo_bien, vehiculo_id, telefono_id, capital, tasa_mensual,
                            fecha_inicio, fecha_vencimiento, fecha_limite_gracia, estado)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) returning id`,
      [t, String(indice + 1).padStart(4, "0"), titular.id, titular.nombre, titular.cedula, titular.telefono,
       empeno.bien, vehiculoId, telefonoId, empeno.capital, TASA,
       fechaInicio, fechaVencimiento, limiteGracia, empeno.pagado ? "pagado" : "activo"],
    );
    const empenoId = rows[0].id;

    const interesMes = empeno.capital / 10;
    for (const abono of empeno.abonos ?? []) {
      await cliente.query(
        `insert into abonos (tenant_id, empeno_id, monto, a_interes, a_capital, concepto, metodo_pago, fecha)
         values ($1, $2, $3, $3, 0, 'interes', 'efectivo', $4)`,
        [t, empenoId, interesMes, dia(abono.dias, fechaInicio)],
      );
    }

    if (empeno.pagado) {
      // Mes 1: paga el interés. Diez días después liquida: capital + 10 días.
      await cliente.query(
        `insert into abonos (tenant_id, empeno_id, monto, a_interes, a_capital, concepto, metodo_pago, fecha)
         values ($1, $2, $3, $3, 0, 'interes', 'efectivo', $4)`,
        [t, empenoId, interesMes, dia(30, fechaInicio)],
      );
      const interesDiezDias = empeno.capital / 30;
      await cliente.query(
        `insert into abonos (tenant_id, empeno_id, monto, a_interes, a_capital, concepto, metodo_pago, fecha, nota)
         values ($1, $2, $3, $4, $5, 'ambos', 'transferencia', $6, 'Liquidación: el cliente recuperó el bien')`,
        [t, empenoId, empeno.capital + interesDiezDias, interesDiezDias, empeno.capital, dia(40, fechaInicio)],
      );
    }
  }
}

/* ------------------------------------------------------------------ */
/* Principal                                                           */
/* ------------------------------------------------------------------ */

async function main() {
  const host = new URL(urlDueno).host;
  console.log(`\nSembrando en ${host}${SOLO_DATOS ? " (solo datos, sin usuarios)" : ""}\n`);

  const cliente = await pool.connect();
  try {
    const { rows: ajenos } = await cliente.query(
      `select count(*)::int as total from tenants where id <> $1 and estado = 'activo'`,
      [TENANT_DEMO_ID],
    );
    if (ajenos[0].total > 0) {
      throw new Error(
        `Hay ${ajenos[0].total} negocio(s) activo(s) además del demo: esto parece una base con datos reales. ` +
          "El seed es solo para la rama de desarrollo.",
      );
    }

    // Usuarios primero: si Neon Auth falla, no queda un negocio a medias. Con
    // --solo-datos no se crea nadie en Neon Auth, pero si los usuarios ya
    // existen se buscan por correo para volver a vincularlos (abajo).
    const resultadosUsuarios = {};
    if (!SOLO_DATOS) {
      resultadosUsuarios.superAdmin = await asegurarUsuarioAuth(cliente, USUARIOS.superAdmin);
      resultadosUsuarios.dueno = await asegurarUsuarioAuth(cliente, USUARIOS.dueno);
    } else {
      for (const clave of ["superAdmin", "dueno"]) {
        const id = await idDeUsuarioAuth(cliente, USUARIOS[clave].email);
        if (id) resultadosUsuarios[clave] = { id, creado: false, password: null };
      }
    }

    await cliente.query("begin");

    if (REINICIAR) {
      await cliente.query(`delete from tenants where id = $1`, [TENANT_DEMO_ID]);
      console.log("  Negocio demo borrado (--reiniciar).");
    }

    const { rows: existente } = await cliente.query(`select 1 from tenants where id = $1`, [TENANT_DEMO_ID]);
    let resumen = null;
    if (existente.length === 0) {
      resumen = await sembrarNegocio(cliente);
    }

    // Perfiles: `on conflict do update`, no `do nothing`. Si el perfil quedó de
    // una corrida anterior, o --reiniciar se lo llevó con el negocio, el usuario
    // de Neon Auth sigue existiendo y aquí se le vuelve a dar su rol y su
    // negocio. Correr el seed N veces deja siempre el mismo estado.
    const vinculos = [
      ["superAdmin", null, "super_admin"],
      ["dueno", TENANT_DEMO_ID, "owner"],
    ];
    for (const [clave, tenantId, rol] of vinculos) {
      const resultado = resultadosUsuarios[clave];
      if (!resultado) continue;
      // Si el usuario de Neon Auth se recreó, tiene otro id: el perfil que
      // existía con ese correo se reapunta en vez de quedar huérfano.
      await cliente.query(
        `update usuarios set auth_user_id = $1 where lower(email) = lower($2) and auth_user_id <> $1`,
        [resultado.id, USUARIOS[clave].email],
      );
      await cliente.query(
        `insert into usuarios (auth_user_id, tenant_id, email, nombre, rol, activo)
         values ($1, $2, $3, $4, $5, true)
         on conflict (auth_user_id) do update
           set tenant_id = excluded.tenant_id, email = excluded.email, nombre = excluded.nombre,
               rol = excluded.rol, activo = true`,
        [resultado.id, tenantId, USUARIOS[clave].email, USUARIOS[clave].nombre, rol],
      );
    }

    await cliente.query("commit");

    const sinVincular = ["superAdmin", "dueno"].filter((clave) => !resultadosUsuarios[clave]);
    console.log(
      sinVincular.length
        ? `  Sin usuario en Neon Auth para: ${sinVincular.map((clave) => USUARIOS[clave].email).join(", ")}. ` +
            "Corre «pnpm db:seed» sin --solo-datos para crearlos."
        : "  Perfiles vinculados: super admin sin negocio y dueño en «Motos El Rápido».",
    );

    console.log(
      resumen
        ? `  Negocio «Motos El Rápido»: ${resumen.clientes} clientes, ${resumen.motos} motos, ` +
            `${resumen.gastos} gastos, ${resumen.empenos} empeños.`
        : "  El negocio demo ya existía: no se tocó (usa --reiniciar para recrearlo).",
    );

    if (!SOLO_DATOS) {
      console.log("\n  Credenciales de prueba (entra en /login):\n");
      for (const [clave, rol] of [["superAdmin", "super_admin → /admin"], ["dueno", "owner → /app"]]) {
        const resultado = resultadosUsuarios[clave];
        const usuario = USUARIOS[clave];
        // Una contraseña configurada en .env.local no se imprime: ya está ahí.
        // Solo se muestra la generada al azar, que no queda en ninguna parte.
        const clave_ =
          resultado.creado && !usuario.password
            ? resultado.password
            : usuario.password
              ? resultado.contrasenaFunciona === false
                ? "⚠ la de SEED_*_PASSWORD NO funciona: el usuario se creó con otra (ver DEUDAS)"
                : "(la de SEED_*_PASSWORD en .env.local)"
              : "(ya existía: la que se imprimió la primera vez)";
        console.log(`    ${rol.padEnd(22)} ${usuario.email.padEnd(32)} ${clave_}`);
      }
      console.log("");
    }
  } catch (error) {
    await cliente.query("rollback").catch(() => {});
    throw error;
  } finally {
    cliente.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`\nNo se pudo sembrar: ${error.message}\n`);
  process.exit(1);
});
