import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserCommittees } from "@/lib/committees";
import { prisma } from "@/lib/prisma";
import {
  CommitteeRoleLabel,
  CommitteeTypeLabel,
  type CommitteeRole,
  type CommitteeType,
} from "@/lib/enums";

export default async function HomePage() {
  const session = await auth();
  const userId = session!.user.id;
  const committees = await getUserCommittees(userId);

  const committeeIds = committees.map((c) => c.id);

  // Próximas sesiones de los comités del usuario.
  const upcoming = await prisma.session.findMany({
    where: {
      committeeId: { in: committeeIds },
      scheduledAt: { gte: new Date() },
      status: { in: ["CONVENED", "IN_PROGRESS"] },
    },
    include: { committee: true },
    orderBy: { scheduledAt: "asc" },
    take: 5,
  });

  const firstName = (session!.user.name ?? "").split(" ")[0];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-gold">Panel principal</p>
        <h1 className="mt-1 text-3xl text-slate-100">
          Bienvenido{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-2 text-slate-400">
          Acceso seguro a tus cuerpos colegiados, documentos y reuniones.
        </p>
      </header>

      <section>
        <h2 className="mb-4 text-lg text-slate-200">Tus cuerpos colegiados</h2>
        {committees.length === 0 ? (
          <div className="card p-6 text-slate-400">
            Aún no perteneces a ningún comité. Contacta al administrador.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {committees.map((c) => (
              <Link
                key={c.id}
                href={`/committees/${c.id}`}
                className="card group p-5 transition-colors hover:border-gold/40"
              >
                <p className="text-xs uppercase tracking-wide text-gold">
                  {CommitteeTypeLabel[c.type as CommitteeType] ?? c.type}
                </p>
                <h3 className="mt-2 text-lg text-slate-100 group-hover:text-gold">
                  {c.name}
                </h3>
                {c.role && (
                  <span className="badge mt-3 bg-slate-800 text-slate-300">
                    {CommitteeRoleLabel[c.role as CommitteeRole] ?? c.role}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg text-slate-200">Próximas sesiones</h2>
        {upcoming.length === 0 ? (
          <div className="card p-6 text-slate-400">
            No hay sesiones convocadas próximamente.
          </div>
        ) : (
          <div className="card divide-y divide-slate-800">
            {upcoming.map((s) => (
              <Link
                key={s.id}
                href={`/committees/${s.committeeId}/sessions/${s.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-800/40"
              >
                <div>
                  <p className="text-slate-100">{s.title}</p>
                  <p className="text-xs text-slate-500">{s.committee.name}</p>
                </div>
                <p className="text-sm text-slate-400">
                  {new Date(s.scheduledAt).toLocaleString("es-CO", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
