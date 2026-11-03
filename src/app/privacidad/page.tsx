import type { Metadata } from "next";

import { PaginaLegal } from "@/components/landing/pagina-legal";
import { APP } from "@/lib/constantes";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: `Cómo ${APP.nombre} trata los datos personales.`,
};

export default function PaginaPrivacidad() {
  return (
    <PaginaLegal titulo="Política de privacidad" actualizado="21 de octubre de 2026">
      <p>
        Tratamos los datos personales conforme a la Ley 1581 de 2012 de Colombia y sus decretos reglamentarios.
      </p>
      <h2>Qué datos tratamos</h2>
      <p>
        De quien solicita acceso: nombre, negocio, teléfono, correo y ciudad. De los usuarios: correo y nombre. De
        los clientes de cada negocio: los que ese negocio registra (nombre, documento, teléfono, compras y empeños).
        El negocio es el responsable de esos datos de sus clientes; {APP.nombre} los guarda por encargo suyo.
      </p>
      <h2>Para qué</h2>
      <p>
        Para prestar el servicio, contactarte por tu solicitud de acceso y, solo si lo autorizaste, enviarte
        comunicaciones comerciales. No vendemos ni cedemos datos a terceros. Cada negocio está aislado de los demás.
      </p>
      <h2>Tus derechos</h2>
      <p>
        Puedes conocer, actualizar, rectificar y pedir la supresión de tus datos, o revocar la autorización,
        escribiendo a soporte. Respondemos en los plazos de ley.
      </p>
    </PaginaLegal>
  );
}
