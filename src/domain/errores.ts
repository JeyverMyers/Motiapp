/**
 * Error de una regla del negocio: "no se puede abonar a un empeño pagado",
 * "primero cobra el interés", etc.
 *
 * Su mensaje está escrito para el dueño y se le muestra tal cual. Cualquier otro
 * error es un fallo inesperado: se registra en el servidor y al usuario le llega
 * un mensaje genérico, para no filtrar detalles internos.
 */
export class ErrorNegocio extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorNegocio";
  }
}
