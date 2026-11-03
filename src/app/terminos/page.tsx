import type { Metadata } from "next";
import Link from "next/link";

import { PaginaLegal } from "@/components/landing/pagina-legal";
import { APP } from "@/lib/constantes";

export const metadata: Metadata = {
  title: "Términos de uso",
  description: `Condiciones de uso de ${APP.nombre}.`,
};

export default function PaginaTerminos() {
  return (
    <PaginaLegal titulo="Términos de uso" actualizado="21 de octubre de 2026">
      <p>
        {APP.nombre} es un software en línea para que negocios de compra y venta de motos y de empeño lleven su
        inventario, ventas, clientes, empeños y gastos. Al usarlo aceptas estas condiciones.
      </p>
      <h2>Cuentas y acceso</h2>
      <p>
        El acceso es por invitación: el administrador de {APP.nombre} habilita cada negocio y a su dueño. Cuidas tu
        contraseña y respondes por lo que se haga con tu cuenta. Podemos suspender un negocio por falta de pago o
        por uso indebido; sus datos no se borran por la suspensión.
      </p>
      <h2>Tus datos</h2>
      <p>
        Lo que registras es de tu negocio. Cada negocio ve solo su información. Puedes pedir una copia o el retiro
        de tus datos escribiendo a soporte. Cómo los tratamos está en la{" "}
        <Link href="/privacidad" className="font-bold underline">
          política de privacidad
        </Link>
        .
      </p>
      <h2>Lo que hace y lo que no hace el software</h2>
      <p>
        Los cálculos de ganancia, intereses y vencimientos se hacen con los datos que registras; revisa que sean
        correctos. Los contratos y recibos en PDF son plantillas de apoyo y no reemplazan la asesoría de un abogado.
      </p>
      <h2>Servicio</h2>
      <p>
        Procuramos que el servicio esté disponible y respaldado, pero puede tener interrupciones por mantenimiento
        o causas ajenas. Si cambiamos estas condiciones, lo avisaremos en el panel.
      </p>
    </PaginaLegal>
  );
}
