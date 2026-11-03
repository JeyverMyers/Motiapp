"use client";

import { useFormularioAccion } from "@/components/app/use-formulario-accion";
import { Aviso } from "@/components/ui/aviso";
import { Boton } from "@/components/ui/boton";
import { accionDevolverVenta } from "@/server/acciones/motos";

/**
 * Registra que el comprador devolvió la moto. Pide confirmación: la venta deja
 * de contar como ingreso y la moto vuelve al inventario como «Devuelta».
 */
export function BotonDevolucion({ ventaId }: { ventaId: string }) {
  const { estado, enviando, alEnviar } = useFormularioAccion(accionDevolverVenta);

  return (
    <div className="flex flex-col gap-1">
      <form
        onSubmit={(evento) => {
          if (
            !window.confirm(
              "¿El comprador devolvió la moto? La venta queda registrada como devuelta, deja de contar en la ganancia y la moto vuelve al inventario.",
            )
          ) {
            evento.preventDefault();
            return;
          }
          alEnviar(evento);
        }}
      >
        <input type="hidden" name="ventaId" value={ventaId} />
        <Boton type="submit" variant="ghost" size="sm" disabled={enviando} className="text-destructive">
          {enviando ? "Registrando…" : "Registrar devolución"}
        </Boton>
      </form>
      {estado.mensaje ? <Aviso tono="error">{estado.mensaje}</Aviso> : null}
    </div>
  );
}
