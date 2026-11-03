"use client";

import { useState } from "react";

import { useFormularioAccion } from "@/components/app/use-formulario-accion";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo, Entrada, Selector } from "@/components/ui/formulario";
import { DIAS_MES_COMERCIAL, sumarDiasISO } from "@/domain/empeno";
import { ETIQUETA_FRECUENCIA_PAGO, ETIQUETA_TIPO_BIEN, FRECUENCIAS_PAGO, TIPOS_BIEN, type TipoBien } from "@/domain/enums";
import { hoyISO } from "@/lib/fechas";
import { accionCrearEmpeno } from "@/server/acciones/empenos";

/** Ejemplos por tipo de bien, para que el dueño sepa qué escribir. */
const EJEMPLO_MARCA: Record<"moto" | "carro" | "telefono", { marca: string; modelo: string }> = {
  moto: { marca: "Yamaha", modelo: "FZ 2.0" },
  carro: { marca: "Chevrolet", modelo: "Spark GT" },
  telefono: { marca: "Samsung", modelo: "Galaxy A54" },
};

/**
 * Alta de un empeño: cliente, bien, préstamo y condiciones. Los nombres de los
 * campos son los que lee `validarFormularioEmpeno` en la acción; el bien va
 * aplanado y la acción lo anida según `tipoBien`.
 *
 * Los campos del bien cambian con el tipo (B5.4): vehículo con placa y año,
 * teléfono con IMEI, y «otro» solo con qué es, su valor y una referencia
 * opcional. El número no se escribe: se asigna al guardar (B5.2).
 */
export function FormularioNuevoEmpeno({
  tasaDefecto,
  proximoNumero,
  cliente,
}: {
  tasaDefecto: number;
  /** El número que probablemente recibirá; el definitivo se toma al guardar. */
  proximoNumero: string;
  /** Cliente precargado desde su ficha. */
  cliente?: { cedula: string; nombres: string; apellidos: string | null; telefono: string };
}) {
  const { estado, enviando, formulario, alEnviar } = useFormularioAccion(accionCrearEmpeno);
  const [tipoBien, setTipoBien] = useState<TipoBien>("moto");
  const [fechaInicio, setFechaInicio] = useState(hoyISO);
  const error = (campo: string) => estado.errores?.[campo];

  return (
    <form ref={formulario} onSubmit={alEnviar} className="flex flex-col gap-5" noValidate>
      {estado.mensaje ? <Aviso tono="error">{estado.mensaje}</Aviso> : null}

      <Seccion titulo="El cliente">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Cédula" htmlFor="cedula" requerido ayuda="Si ya es cliente, se reutiliza su ficha" error={error("cedula")}>
            <Entrada id="cedula" name="cedula" inputMode="numeric" placeholder="1020304050" defaultValue={cliente?.cedula} />
          </Campo>
          <Campo etiqueta="Celular" htmlFor="telefono" requerido ayuda="10 dígitos" error={error("telefono")}>
            <Entrada id="telefono" name="telefono" type="tel" inputMode="numeric" placeholder="3001234567" defaultValue={cliente?.telefono} />
          </Campo>
          <Campo etiqueta="Nombres" htmlFor="nombres" requerido error={error("nombres")}>
            <Entrada id="nombres" name="nombres" placeholder="María" defaultValue={cliente?.nombres} />
          </Campo>
          <Campo etiqueta="Apellidos" htmlFor="apellidos" ayuda="Opcional" error={error("apellidos")}>
            <Entrada id="apellidos" name="apellidos" placeholder="Gómez Ruiz" defaultValue={cliente?.apellidos ?? ""} />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="El bien empeñado">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Tipo de bien" htmlFor="tipoBien" requerido error={error("tipoBien")}>
            <Selector id="tipoBien" name="tipoBien" value={tipoBien} onChange={(evento) => setTipoBien(evento.target.value as TipoBien)}>
              {TIPOS_BIEN.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {ETIQUETA_TIPO_BIEN[tipo]}
                </option>
              ))}
            </Selector>
          </Campo>
          {/* `key` por tipo: al cambiarlo, los campos del tipo anterior se vacían en vez de viajar ocultos. */}
          <CamposDelBien key={tipoBien} tipoBien={tipoBien} error={error} />
        </div>
      </Seccion>

      <Seccion titulo="El préstamo">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Número de empeño</span>
            <p className="flex h-10 items-center rounded-lg border border-dashed bg-muted/40 px-3 text-sm font-semibold tabular-nums">
              {proximoNumero}
            </p>
            <span className="text-xs text-muted-foreground">Se asigna solo al guardar</span>
          </div>
          <Campo etiqueta="Capital prestado" htmlFor="capital" requerido ayuda="En pesos" error={error("capital")}>
            <Entrada id="capital" name="capital" inputMode="numeric" placeholder="1500000" />
          </Campo>
          <Campo etiqueta="Interés mensual (%)" htmlFor="tasaMensual" requerido error={error("tasaMensual")}>
            <Entrada
              id="tasaMensual"
              name="tasaMensual"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={0}
              max={100}
              defaultValue={tasaDefecto}
            />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Condiciones">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo etiqueta="Frecuencia de pago" htmlFor="frecuenciaPago" requerido error={error("frecuenciaPago")}>
            <Selector id="frecuenciaPago" name="frecuenciaPago" defaultValue="mensual">
              {FRECUENCIAS_PAGO.map((frecuencia) => (
                <option key={frecuencia} value={frecuencia}>
                  {ETIQUETA_FRECUENCIA_PAGO[frecuencia]}
                </option>
              ))}
            </Selector>
          </Campo>
          <Campo etiqueta="Fecha del empeño" htmlFor="fechaInicio" requerido error={error("fechaInicio")}>
            <Entrada
              id="fechaInicio"
              name="fechaInicio"
              type="date"
              value={fechaInicio}
              onChange={(evento) => setFechaInicio(evento.target.value)}
            />
          </Campo>
          <Campo
            etiqueta="Vence el"
            htmlFor="fechaVencimiento"
            ayuda={`Si lo dejas vacío: ${DIAS_MES_COMERCIAL} días después`}
            error={error("fechaVencimiento")}
          >
            <Entrada
              key={fechaInicio}
              id="fechaVencimiento"
              name="fechaVencimiento"
              type="date"
              defaultValue={fechaInicio ? sumarDiasISO(fechaInicio, DIAS_MES_COMERCIAL) : ""}
            />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Garante y notas" opcional>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo etiqueta="Nombre del garante" htmlFor="garanteNombre" error={error("garanteNombre")}>
            <Entrada id="garanteNombre" name="garanteNombre" />
          </Campo>
          <Campo etiqueta="Cédula del garante" htmlFor="garanteCedula" error={error("garanteCedula")}>
            <Entrada id="garanteCedula" name="garanteCedula" inputMode="numeric" />
          </Campo>
          <Campo etiqueta="Teléfono del garante" htmlFor="garanteTelefono" error={error("garanteTelefono")}>
            <Entrada id="garanteTelefono" name="garanteTelefono" type="tel" inputMode="numeric" />
          </Campo>
          <Campo etiqueta="Observaciones" htmlFor="observaciones" error={error("observaciones")} className="sm:col-span-3">
            <AreaTexto id="observaciones" name="observaciones" placeholder="Estado del bien, accesorios que deja…" />
          </Campo>
        </div>
      </Seccion>

      <div>
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Registrando…" : "Registrar empeño"}
        </Boton>
      </div>
    </form>
  );
}

/** Los campos que pide cada tipo de bien. */
function CamposDelBien({ tipoBien, error }: { tipoBien: TipoBien; error: (campo: string) => string | undefined }) {
  if (tipoBien === "otro") {
    return (
      <>
        <Campo
          etiqueta="¿Qué es?"
          htmlFor="descripcion"
          requerido
          ayuda="Lo que identifica el bien, como irá en el contrato"
          error={error("descripcion")}
          className="sm:col-span-2"
        >
          <Entrada id="descripcion" name="descripcion" placeholder="Taladro percutor DeWalt 20V con dos baterías" />
        </Campo>
        <Campo etiqueta="Valor de tasación" htmlFor="valorTasacion" requerido ayuda="En pesos" error={error("valorTasacion")}>
          <Entrada id="valorTasacion" name="valorTasacion" inputMode="numeric" placeholder="800000" />
        </Campo>
        <Campo etiqueta="Serie o referencia" htmlFor="identificador" ayuda="Opcional" error={error("identificador")}>
          <Entrada id="identificador" name="identificador" />
        </Campo>
      </>
    );
  }

  const ejemplo = EJEMPLO_MARCA[tipoBien];
  const esTelefono = tipoBien === "telefono";

  return (
    <>
      {esTelefono ? null : (
        <Campo etiqueta="Placa" htmlFor="placa" requerido error={error("placa")}>
          <Entrada id="placa" name="placa" placeholder="ABC12D" autoCapitalize="characters" className="uppercase" />
        </Campo>
      )}
      <Campo etiqueta="Marca" htmlFor="marca" requerido error={error("marca")}>
        <Entrada id="marca" name="marca" placeholder={ejemplo.marca} />
      </Campo>
      <Campo etiqueta="Modelo" htmlFor="modelo" requerido error={error("modelo")}>
        <Entrada id="modelo" name="modelo" placeholder={ejemplo.modelo} />
      </Campo>
      <Campo etiqueta="Color" htmlFor="color" requerido error={error("color")}>
        <Entrada id="color" name="color" placeholder="Negro" />
      </Campo>
      {esTelefono ? (
        <>
          <Campo etiqueta="IMEI" htmlFor="imei" ayuda="Opcional" error={error("imei")}>
            <Entrada id="imei" name="imei" inputMode="numeric" />
          </Campo>
          <Campo etiqueta="Capacidad" htmlFor="capacidad" ayuda="Opcional, por ejemplo 128 GB" error={error("capacidad")}>
            <Entrada id="capacidad" name="capacidad" />
          </Campo>
        </>
      ) : (
        <>
          <Campo etiqueta="Año" htmlFor="anio" requerido error={error("anio")}>
            <Entrada id="anio" name="anio" type="number" inputMode="numeric" placeholder="2020" />
          </Campo>
          <Campo etiqueta="Número de motor" htmlFor="numeroMotor" ayuda="Opcional" error={error("numeroMotor")}>
            <Entrada id="numeroMotor" name="numeroMotor" />
          </Campo>
          <Campo etiqueta="Número de chasis" htmlFor="numeroChasis" ayuda="Opcional" error={error("numeroChasis")}>
            <Entrada id="numeroChasis" name="numeroChasis" />
          </Campo>
        </>
      )}
    </>
  );
}

/** Cada bloque del formulario en su propia tarjeta: se separan sin líneas sueltas (B5.5). */
function Seccion({ titulo, opcional = false, children }: { titulo: string; opcional?: boolean; children: React.ReactNode }) {
  return (
    <fieldset className="superficie flex flex-col gap-4 p-4 sm:p-5">
      <legend className="float-left mb-1 w-full text-sm font-semibold">
        {titulo}
        {opcional ? <span className="ml-1.5 font-normal text-muted-foreground">(opcional)</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}
