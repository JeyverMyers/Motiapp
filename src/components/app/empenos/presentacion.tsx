import { EtiquetaEstado } from "@/components/ui/etiqueta-estado";
import { ETIQUETA_ESTADO_DERIVADO, type EstadoEmpenoSegunFechas } from "@/domain/empeno";
import { ETIQUETA_TIPO_BIEN } from "@/domain/enums";
import { formatearMoneda, formatearPlaca } from "@/lib/formato";
import type { BienEmpenado } from "@/server/repositorios/empenos";

const TONO_ESTADO: Record<
  EstadoEmpenoSegunFechas,
  "neutro" | "exito" | "alerta" | "peligro" | "info"
> = {
  activo: "info",
  por_vencer: "alerta",
  vencido: "peligro",
  perdido: "neutro",
  pagado: "exito",
  renovado: "neutro",
};

/** Estado del empeño tal como lo ve el dueño (derivado de las fechas). */
export function EtiquetaEstadoEmpeno({ estado }: { estado: EstadoEmpenoSegunFechas }) {
  return <EtiquetaEstado variant={TONO_ESTADO[estado]}>{ETIQUETA_ESTADO_DERIVADO[estado]}</EtiquetaEstado>;
}

/** «Moto Yamaha FZ 2.0 2020, placa ABC 12D, color rojo». */
export function descripcionBien(bien: BienEmpenado | null): string {
  if (!bien) return "Bien sin datos";
  if (bien.tipo === "otro") {
    const detalles = [
      bien.identificador ? `serie o referencia ${bien.identificador}` : null,
      `tasado en ${formatearMoneda(bien.valorTasacion)}`,
    ].filter(Boolean);
    return `${bien.descripcion}, ${detalles.join(", ")}`;
  }
  if (bien.tipo === "telefono") {
    const detalles = [
      bien.capacidad,
      `color ${bien.color.toLowerCase()}`,
      bien.imei ? `IMEI ${bien.imei}` : null,
    ].filter(Boolean);
    return `Teléfono ${bien.marca} ${bien.modelo}, ${detalles.join(", ")}`;
  }
  const detalles = [
    `placa ${formatearPlaca(bien.placa)}`,
    `color ${bien.color.toLowerCase()}`,
    bien.numeroMotor ? `motor ${bien.numeroMotor}` : null,
    bien.numeroChasis ? `chasis ${bien.numeroChasis}` : null,
  ].filter(Boolean);
  return `${ETIQUETA_TIPO_BIEN[bien.tipo]} ${bien.marca} ${bien.modelo} ${bien.anio}, ${detalles.join(", ")}`;
}

/** Lo mínimo para reconocer el bien en una fila: placa, marca y modelo o qué es. */
export function resumenCortoBien(bien: BienEmpenado | null): string {
  if (!bien) return "";
  if (bien.tipo === "otro") return bien.descripcion;
  if (bien.tipo === "telefono") return `${bien.marca} ${bien.modelo}`;
  return formatearPlaca(bien.placa);
}

/** Lista de datos «etiqueta: valor», legible en el celular. */
export function ListaDatos({ filas }: { filas: { etiqueta: string; valor: string }[] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {filas.map((fila) => (
        <div key={fila.etiqueta} className="contents">
          <dt className="text-muted-foreground">{fila.etiqueta}</dt>
          <dd className="font-medium break-words">{fila.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
