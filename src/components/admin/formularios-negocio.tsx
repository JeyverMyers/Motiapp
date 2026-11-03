"use client";

import { useFormularioAccion } from "@/components/app/use-formulario-accion";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { AreaTexto, Campo, Entrada, Selector } from "@/components/ui/formulario";
import { ESTADOS_TENANT, ETIQUETA_ESTADO_TENANT, ETIQUETA_PLAN, PLANES } from "@/domain/enums";
import {
  accionAsignarDueno,
  accionCambiarAcceso,
  accionCrearNegocio,
  accionEditarNegocio,
  accionEliminarNegocio,
  accionIniciarSoporte,
  accionPlanYEstado,
} from "@/server/acciones/admin";
import type { EstadoAccion } from "@/server/acciones/comun";

/**
 * Formularios del panel /admin. Todos van por Server Actions que verifican el
 * rol de super admin en el servidor y dejan su fila en la auditoría.
 */

function Resultado({ estado }: { estado: EstadoAccion }) {
  if (!estado.mensaje) return null;
  return <Aviso tono={estado.ok ? "exito" : "error"}>{estado.mensaje}</Aviso>;
}

export type DatosNegocioFormulario = {
  id: string;
  nombre: string;
  nit: string | null;
  telefono: string | null;
  emailContacto: string | null;
  ciudad: string | null;
  direccion: string | null;
  plan: string;
  estado: string;
  notasInternas: string | null;
};

/* ------------------------------------------------------------------ */
/* Suspender / reactivar                                               */
/* ------------------------------------------------------------------ */

/**
 * Un solo botón según el estado actual. Suspender corta el acceso de sus
 * usuarios a /app en la siguiente petición (lo revisa `sesionDeDueno`), sin
 * borrar ningún dato. Conserva plan y notas: solo cambia el estado.
 */
export function BotonSuspension({ negocio }: { negocio: DatosNegocioFormulario }) {
  const { estado, enviando, alEnviar } = useFormularioAccion(accionPlanYEstado);
  const suspendido = negocio.estado === "suspendido";

  return (
    <div className="flex flex-col items-start gap-2">
      <form
        onSubmit={(evento) => {
          const pregunta = suspendido
            ? `¿Reactivar «${negocio.nombre}»? Sus usuarios vuelven a entrar de inmediato.`
            : `¿Suspender «${negocio.nombre}»? Sus usuarios pierden el acceso a /app en la siguiente página que abran. No se borra ningún dato.`;
          if (!window.confirm(pregunta)) {
            evento.preventDefault();
            return;
          }
          alEnviar(evento);
        }}
      >
        <input type="hidden" name="negocioId" value={negocio.id} />
        <input type="hidden" name="plan" value={negocio.plan} />
        <input type="hidden" name="notasInternas" value={negocio.notasInternas ?? ""} />
        <input type="hidden" name="estado" value={suspendido ? "activo" : "suspendido"} />
        <Boton type="submit" variant={suspendido ? "exito" : "destructive"} disabled={enviando}>
          {enviando ? "Guardando…" : suspendido ? "Reactivar negocio" : "Suspender negocio"}
        </Boton>
      </form>
      <Resultado estado={estado} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plan, estado y notas                                                */
/* ------------------------------------------------------------------ */

export function FormularioPlanYEstado({ negocio }: { negocio: DatosNegocioFormulario }) {
  const { estado, enviando, alEnviar } = useFormularioAccion(accionPlanYEstado);
  return (
    <form onSubmit={alEnviar} className="flex flex-col gap-4">
      <input type="hidden" name="negocioId" value={negocio.id} />
      <Resultado estado={estado} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Plan"
          htmlFor="plan"
          ayuda="Negociante: compra/venta. Empresa: además empeños."
          error={estado.errores?.plan}
        >
          <Selector id="plan" name="plan" defaultValue={negocio.plan}>
            {PLANES.map((plan) => (
              <option key={plan} value={plan}>
                {ETIQUETA_PLAN[plan]}
              </option>
            ))}
          </Selector>
        </Campo>
        <Campo etiqueta="Estado" htmlFor="estado" error={estado.errores?.estado}>
          <Selector id="estado" name="estado" defaultValue={negocio.estado}>
            {ESTADOS_TENANT.map((opcion) => (
              <option key={opcion} value={opcion}>
                {ETIQUETA_ESTADO_TENANT[opcion]}
              </option>
            ))}
          </Selector>
        </Campo>
        <Campo
          etiqueta="Notas internas"
          htmlFor="notasInternas"
          ayuda="Solo las ve la super administración"
          error={estado.errores?.notasInternas}
          className="sm:col-span-2"
        >
          <AreaTexto id="notasInternas" name="notasInternas" defaultValue={negocio.notasInternas ?? ""} />
        </Campo>
      </div>
      <div>
        <Boton type="submit" variant="outline" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar plan y estado"}
        </Boton>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Datos del negocio (alta y edición)                                  */
/* ------------------------------------------------------------------ */

export function FormularioDatosNegocio({ negocio }: { negocio?: DatosNegocioFormulario }) {
  const { estado, enviando, formulario, alEnviar } = useFormularioAccion(
    negocio ? accionEditarNegocio : accionCrearNegocio,
  );
  const error = (campo: string) => estado.errores?.[campo];
  return (
    <form ref={formulario} onSubmit={alEnviar} className="flex flex-col gap-4" noValidate>
      {negocio ? <input type="hidden" name="negocioId" value={negocio.id} /> : null}
      <Resultado estado={estado} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre del negocio" htmlFor="nombre" requerido error={error("nombre")}>
          <Entrada id="nombre" name="nombre" defaultValue={negocio?.nombre ?? ""} />
        </Campo>
        <Campo etiqueta="NIT" htmlFor="nit" ayuda="Opcional, con dígito de verificación" error={error("nit")}>
          <Entrada id="nit" name="nit" inputMode="numeric" placeholder="900123456-8" defaultValue={negocio?.nit ?? ""} />
        </Campo>
        <Campo etiqueta="Teléfono" htmlFor="telefono" ayuda="Opcional" error={error("telefono")}>
          <Entrada id="telefono" name="telefono" type="tel" inputMode="numeric" defaultValue={negocio?.telefono ?? ""} />
        </Campo>
        <Campo etiqueta="Correo de contacto" htmlFor="emailContacto" ayuda="Opcional" error={error("emailContacto")}>
          <Entrada id="emailContacto" name="emailContacto" type="email" defaultValue={negocio?.emailContacto ?? ""} />
        </Campo>
        <Campo etiqueta="Ciudad" htmlFor="ciudad" ayuda="Opcional" error={error("ciudad")}>
          <Entrada id="ciudad" name="ciudad" defaultValue={negocio?.ciudad ?? ""} />
        </Campo>
        <Campo etiqueta="Dirección" htmlFor="direccion" ayuda="Opcional" error={error("direccion")}>
          <Entrada id="direccion" name="direccion" defaultValue={negocio?.direccion ?? ""} />
        </Campo>
        {negocio ? null : (
          <>
            <Campo etiqueta="Plan" htmlFor="plan" error={error("plan")}>
              <Selector id="plan" name="plan" defaultValue="pro">
                {PLANES.map((plan) => (
                  <option key={plan} value={plan}>
                    {ETIQUETA_PLAN[plan]}
                  </option>
                ))}
              </Selector>
            </Campo>
            <Campo etiqueta="Estado inicial" htmlFor="estado" error={error("estado")}>
              <Selector id="estado" name="estado" defaultValue="prueba">
                {ESTADOS_TENANT.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {ETIQUETA_ESTADO_TENANT[opcion]}
                  </option>
                ))}
              </Selector>
            </Campo>
          </>
        )}
      </div>
      <div>
        <Boton type="submit" variant={negocio ? "outline" : "default"} disabled={enviando}>
          {enviando ? "Guardando…" : negocio ? "Guardar datos" : "Crear negocio"}
        </Boton>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Usuarios                                                            */
/* ------------------------------------------------------------------ */

export function FormularioAsignarDueno({ negocioId }: { negocioId: string }) {
  const { estado, enviando, formulario, alEnviar } = useFormularioAccion(accionAsignarDueno);
  return (
    <form ref={formulario} onSubmit={alEnviar} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="negocioId" value={negocioId} />
      <Resultado estado={estado} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Campo etiqueta="Correo" htmlFor="email" requerido error={estado.errores?.email}>
          <Entrada id="email" name="email" type="email" placeholder="dueno@negocio.com" />
        </Campo>
        <Campo etiqueta="Nombre" htmlFor="nombre-dueno" requerido error={estado.errores?.nombre}>
          <Entrada id="nombre-dueno" name="nombre" />
        </Campo>
        <Boton type="submit" variant="outline" disabled={enviando}>
          {enviando ? "Asignando…" : "Dar acceso"}
        </Boton>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" name="confirmarCuentaExistente" className="mt-0.5 size-4 accent-primary" />
        <span>Si ese correo ya tiene cuenta, confirmo que es de esta persona.</span>
      </label>
      {estado.errores?.confirmarCuentaExistente ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {estado.errores.confirmarCuentaExistente}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Si el correo no tiene cuenta, se crea aquí con una contraseña temporal que verás una sola vez.
      </p>
    </form>
  );
}

export function BotonAccesoUsuario({
  negocioId,
  usuarioId,
  activo,
}: {
  negocioId: string;
  usuarioId: string;
  activo: boolean;
}) {
  const { estado, enviando, alEnviar } = useFormularioAccion(accionCambiarAcceso);
  return (
    <form onSubmit={alEnviar} className="flex items-center gap-2">
      <input type="hidden" name="negocioId" value={negocioId} />
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <input type="hidden" name="activo" value={activo ? "false" : "true"} />
      <Boton type="submit" size="sm" variant="ghost" disabled={enviando} className={activo ? "text-destructive" : undefined}>
        {activo ? "Quitar acceso" : "Devolver acceso"}
      </Boton>
      {estado.mensaje && !estado.ok ? <span className="text-xs text-destructive">{estado.mensaje}</span> : null}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Soporte y borrado                                                   */
/* ------------------------------------------------------------------ */

export function FormularioSoporte({ negocioId }: { negocioId: string }) {
  const { estado, enviando, alEnviar } = useFormularioAccion(accionIniciarSoporte);
  return (
    <form onSubmit={alEnviar} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="negocioId" value={negocioId} />
      <Resultado estado={estado} />
      <Campo
        etiqueta="Motivo"
        htmlFor="motivo"
        requerido
        ayuda="Queda en la auditoría. Ejemplo: el dueño reporta que el reporte de ventas no cuadra."
        error={estado.errores?.motivo}
      >
        <Entrada id="motivo" name="motivo" />
      </Campo>
      <div>
        <Boton type="submit" variant="outline" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar en modo soporte"}
        </Boton>
      </div>
    </form>
  );
}

export function FormularioEliminarNegocio({ negocioId, nombre }: { negocioId: string; nombre: string }) {
  const { estado, enviando, alEnviar } = useFormularioAccion(accionEliminarNegocio);
  return (
    <form onSubmit={alEnviar} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="negocioId" value={negocioId} />
      <Resultado estado={estado} />
      <Campo
        etiqueta={`Escribe «${nombre}» para confirmar`}
        htmlFor="confirmacion"
        requerido
        error={estado.errores?.confirmacion}
      >
        <Entrada id="confirmacion" name="confirmacion" autoComplete="off" />
      </Campo>
      <div>
        <Boton type="submit" variant="destructive" disabled={enviando}>
          {enviando ? "Borrando…" : "Borrar negocio vacío"}
        </Boton>
      </div>
    </form>
  );
}
