import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewAudit } from "@/lib/audit-access";
import AccessDenied from "@/components/AccessDenied";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 30;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { action?: string; user?: string; from?: string; to?: string; page?: string };
}) {
  const session = await auth();
  const allowed = await canViewAudit(session!.user.id);
  if (!allowed) {
    return <AccessDenied message="Solo administradores y auditores pueden ver la auditoría." />;
  }

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const where: Prisma.AuditLogWhereInput = {};
  if (searchParams.action) where.action = { contains: searchParams.action };
  if (searchParams.user) where.userName = { contains: searchParams.user };
  if (searchParams.from || searchParams.to) {
    where.createdAt = {};
    if (searchParams.from) where.createdAt.gte = new Date(searchParams.from);
    if (searchParams.to) where.createdAt.lte = new Date(searchParams.to + "T23:59:59");
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v) as [string, string][],
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-slate-100">Log de auditoría</h1>
          <p className="mt-1 text-sm text-slate-400">
            Registro inmutable de todas las acciones críticas ({total} eventos).
          </p>
        </div>
        <a
          href={`/api/audit/export?${qs.toString()}`}
          className="btn-secondary"
        >
          Exportar CSV
        </a>
      </header>

      <form className="card grid gap-3 p-4 sm:grid-cols-4" method="get">
        <input
          name="user"
          defaultValue={searchParams.user ?? ""}
          placeholder="Usuario"
          className="input"
        />
        <input
          name="action"
          defaultValue={searchParams.action ?? ""}
          placeholder="Acción (ej: document.view)"
          className="input"
        />
        <input
          name="from"
          type="date"
          defaultValue={searchParams.from ?? ""}
          className="input"
        />
        <div className="flex gap-2">
          <input
            name="to"
            type="date"
            defaultValue={searchParams.to ?? ""}
            className="input"
          />
          <button type="submit" className="btn-primary">
            Filtrar
          </button>
        </div>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Recurso</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No hay registros que coincidan.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/30">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                    {new Date(l.createdAt).toLocaleString("es-CO")}
                  </td>
                  <td className="px-4 py-3 text-slate-200">{l.userName}</td>
                  <td className="px-4 py-3">
                    <span className="badge bg-slate-800 text-gold">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {l.resourceType ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {l.ipAddress ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>
          Página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <a
              className="btn-ghost"
              href={`/audit?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(page - 1) }).toString()}`}
            >
              ← Anterior
            </a>
          )}
          {page < totalPages && (
            <a
              className="btn-ghost"
              href={`/audit?${new URLSearchParams({ ...Object.fromEntries(qs), page: String(page + 1) }).toString()}`}
            >
              Siguiente →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
