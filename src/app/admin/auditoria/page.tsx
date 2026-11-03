import { TablaAuditoria } from "@/components/admin/tabla-auditoria";
import { listarAuditoria } from "@/server/repositorios/tenants";

export const metadata = {
  title: "Auditoría",
  robots: { index: false, follow: false },
};

/** Todo lo que ha hecho la super administración, del más reciente al más viejo. */
export default async function PaginaAuditoria() {
  const filas = await listarAuditoria({ limite: 200 });
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.025em]">Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Cada cambio de plan o estado, alta, acceso, borrado y entrada en modo soporte. No se puede editar ni borrar
          desde la app.
        </p>
      </div>
      <TablaAuditoria filas={filas} />
    </div>
  );
}
