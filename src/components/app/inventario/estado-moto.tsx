import { EtiquetaEstado } from "@/components/ui/etiqueta-estado";
import { ETIQUETA_ESTADO_MOTO, type EstadoMoto } from "@/domain/enums";

const TONO: Record<EstadoMoto, "neutro" | "exito" | "alerta" | "peligro" | "info"> = {
  disponible: "exito",
  reservada: "info",
  en_reparacion: "alerta",
  vendida: "neutro",
  devuelta: "alerta",
  dada_de_baja: "peligro",
};

/** Estados desde los que se puede registrar la venta. */
export const ESTADOS_VENDIBLES: readonly EstadoMoto[] = ["disponible", "reservada", "en_reparacion", "devuelta"];

export function EtiquetaEstadoMoto({ estado }: { estado: EstadoMoto }) {
  return <EtiquetaEstado variant={TONO[estado]}>{ETIQUETA_ESTADO_MOTO[estado]}</EtiquetaEstado>;
}
