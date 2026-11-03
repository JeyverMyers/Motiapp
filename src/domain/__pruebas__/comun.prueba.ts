/**
 * Valores del negocio: placas, cédulas, teléfonos, montos y fechas.
 *
 * Estas funciones normalizan lo que el dueño escribe en el celular. Un error aquí
 * significa datos sucios en la base que después hay que limpiar a mano, así que
 * vale la pena probarlas.
 */

import { describe, expect, it } from "vitest";

import {
  anoSchema,
  cedulaSchema,
  colorSchema,
  emailSchema,
  fechaSchema,
  monto,
  montoDesdeTexto,
  placaSchema,
  telefonoSchema,
  textoOpcional,
  textoRequerido,
} from "../comun";

describe("placaSchema", () => {
  it("normaliza a mayúsculas y quita espacios y guiones", () => {
    expect(placaSchema.parse("abc 12d")).toBe("ABC12D");
    expect(placaSchema.parse("abc-12d")).toBe("ABC12D");
    expect(placaSchema.parse("  ABC12D  ")).toBe("ABC12D");
  });

  it("acepta placas de 5 a 7 caracteres alfanuméricos", () => {
    expect(placaSchema.parse("ABCDE")).toBe("ABCDE");
    expect(placaSchema.parse("ABC123")).toBe("ABC123");
    expect(placaSchema.parse("ABC12DE")).toBe("ABC12DE");
  });

  it("rechaza placas demasiado cortas o largas", () => {
    expect(placaSchema.safeParse("ABCD").success).toBe(false);
    expect(placaSchema.safeParse("ABCDEFGH").success).toBe(false);
  });

  it("rechaza placas con símbolos", () => {
    expect(placaSchema.safeParse("ABC@12D").success).toBe(false);
  });
});

describe("cedulaSchema", () => {
  it("quita puntos y espacios de la cédula", () => {
    expect(cedulaSchema.parse("71.234.567")).toBe("71234567");
    expect(cedulaSchema.parse("1 020 304 050")).toBe("1020304050");
  });

  it("rechaza cédulas de menos de 5 o más de 12 dígitos", () => {
    expect(cedulaSchema.safeParse("1234").success).toBe(false);
    expect(cedulaSchema.safeParse("1234567890123").success).toBe(false);
  });

  it("rechaza una cédula sin dígitos", () => {
    expect(cedulaSchema.safeParse("sin-numeros").success).toBe(false);
  });
});

describe("telefonoSchema", () => {
  it("acepta los 10 dígitos sin indicativo", () => {
    expect(telefonoSchema.parse("3001234567")).toBe("3001234567");
  });

  it("descarta el indicativo 57 si vienen 12 dígitos", () => {
    expect(telefonoSchema.parse("+57 300 123 4567")).toBe("3001234567");
  });

  it("quita espacios y guiones", () => {
    expect(telefonoSchema.parse("300-123-4567")).toBe("3001234567");
  });

  it("rechaza longitudes distintas de 10", () => {
    expect(telefonoSchema.safeParse("300123456").success).toBe(false);
    expect(telefonoSchema.safeParse("30012345678").success).toBe(false);
  });
});

describe("montoDesdeTexto", () => {
  const campo = montoDesdeTexto({ campo: "El precio", min: 1 });

  it("convierte texto con separadores de miles a entero", () => {
    expect(campo.parse("1.500.000")).toBe(1_500_000);
    expect(campo.parse("$ 1500000")).toBe(1_500_000);
    expect(campo.parse("1500000")).toBe(1_500_000);
  });

  it("rechaza texto sin números", () => {
    expect(campo.safeParse("mucho dinero").success).toBe(false);
  });

  it("aplica el mínimo pedido", () => {
    expect(campo.safeParse("0").success).toBe(false);
  });
});

describe("monto", () => {
  it("exige enteros: no se manejan centavos", () => {
    const schema = monto({ campo: "El capital" });
    expect(schema.parse(1_500_000)).toBe(1_500_000);
    expect(schema.safeParse(1500.5).success).toBe(false);
  });

  it("rechaza negativos", () => {
    expect(monto({ campo: "El capital" }).safeParse(-1).success).toBe(false);
  });
});

describe("textoRequerido", () => {
  it("recorta y aplica el mínimo después de recortar", () => {
    const schema = textoRequerido({ min: 3, campo: "El nombre" });
    expect(schema.parse("  Juan  ")).toBe("Juan");
    // Tres espacios no cuentan como tres caracteres.
    expect(schema.safeParse("   ").success).toBe(false);
  });

  it("aplica un tope por defecto si se olvida pasar max", () => {
    // Sin tope, un texto podría entrar sin límite en la base. Este caso existía
    // como bug: `max` sin valor producía el mensaje "no puede pasar de undefined
    // caracteres" y el esquema rechazaba CUALQUIER texto.
    const schema = textoRequerido({ campo: "El nombre" });
    expect(schema.parse("Juan")).toBe("Juan");
    expect(schema.safeParse("x".repeat(500)).success).toBe(false);
  });

  it("exige que el texto no esté vacío por defecto", () => {
    expect(textoRequerido({ campo: "El nombre" }).safeParse("").success).toBe(false);
  });

  it("respeta el max cuando se pasa", () => {
    const schema = textoRequerido({ max: 10, campo: "El nombre" });
    expect(schema.parse("1234567890")).toBe("1234567890");
    expect(schema.safeParse("12345678901").success).toBe(false);
  });
});

describe("anoSchema", () => {
  it("acepta el año como texto, que es como llega de un formulario", () => {
    // Bug que atraparon las pruebas: `crearMotoSchema` rechazaba el año "2021"
    // porque llegaba como string desde el formulario HTML.
    expect(anoSchema.parse("2021")).toBe(2021);
    expect(anoSchema.parse(2021)).toBe(2021);
  });

  it("rechaza años fuera de rango y no numéricos", () => {
    expect(anoSchema.safeParse("1900").success).toBe(false);
    expect(anoSchema.safeParse("3000").success).toBe(false);
    expect(anoSchema.safeParse("dos mil").success).toBe(false);
  });
});

describe("textoOpcional", () => {
  it("convierte la cadena vacía en undefined", () => {
    // Los inputs HTML entregan "" y no queremos guardar cadenas vacías.
    expect(textoOpcional(50, "El campo").parse("")).toBeUndefined();
    expect(textoOpcional(50, "El campo").parse("algo")).toBe("algo");
    expect(textoOpcional(50, "El campo").parse(undefined)).toBeUndefined();
  });
});

describe("colorSchema", () => {
  it("normaliza a mayúscula inicial y el resto en minúscula", () => {
    expect(colorSchema.parse("NEGRO")).toBe("Negro");
    expect(colorSchema.parse("azul oscuro")).toBe("Azul oscuro");
  });
});

describe("emailSchema", () => {
  it("normaliza a minúsculas y recorta", () => {
    expect(emailSchema.parse("  Juan@Negocio.CO  ")).toBe("juan@negocio.co");
  });

  it("rechaza correos inválidos", () => {
    expect(emailSchema.safeParse("no-es-un-correo").success).toBe(false);
  });
});

describe("fechaSchema", () => {
  it("acepta fechas en formato AAAA-MM-DD", () => {
    expect(fechaSchema.parse("2026-10-15")).toBe("2026-10-15");
  });

  it("rechaza otros formatos y fechas imposibles", () => {
    expect(fechaSchema.safeParse("15/10/2026").success).toBe(false);
    expect(fechaSchema.safeParse("2026-13-45").success).toBe(false);
  });
});
