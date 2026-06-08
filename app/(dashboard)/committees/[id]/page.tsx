import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCommitteeAccess, canManageCommittee } from "@/lib/permissions";
import AccessDenied from "@/components/AccessDenied";
import {
  CommitteeRoleLabel,
  CommitteeTypeLabel,
  SessionStatusLabel,
  type CommitteeRole,
  type CommitteeType,
  type SessionStatus,
} from "@/lib/enums";

export default async function CommitteePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  let membership;
  try {
    membership = await requireCommitteeAccess(session!.user.id, params.id);
  } catch {
    return <AccessDenied message="No perteneces a este cuerpo colegiado." />;
  }

  const committee = await prisma.committee.findUnique({
    where: { id: params.id },
    include: {
      members: {
        where: { isActive: true },
        include: { user: true },
        orderBy: { role: "asc" },
      },
      _count: { select: { documents: true, sessions: true } },
    },
  });
  if (!committee) return <AccessDenied message="Comité no encontrado." />;

  const recentSessions = await prisma.session.findMany({
    where: { committeeId: params.id },
    orderBy: { scheduledAt: "desc" },
    take: 5,
  });

  const canManage = canManageCommittee(membership.role);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-wide text-gold">
          {CommitteeTypeLabel[committee.type as CommitteeType] ?? committee.type}
        </p>
        <h1 className="mt-1 text-3xl text-slate-100">{committee.name}</h1>
        {committee.description && (
          <p className="mt-2 max-w-2xl text-slate-400">
            {committee.description}
          </p>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/committees/${committee.id}/documents`}
          className="card group flex items-center justify-between p-5 hover:border-gold/40"
        >
          <div>
            <h2 className="text-lg text-slate-100 group-hover:text-gold">
              Documentos
            </h2>
            <p className="text-sm text-slate-400">
              {committee._count.documents} documento(s)
            </p>
          </div>
          <span className="text-gold">→</span>
        </Link>

        <Link
          href={`/committees/${committee.id}/sessions`}
          className="card group flex items-center justify-between p-5 hover:border-gold/40"
        >
          <div>
            <h2 className="text-lg text-slate-100 group-hover:text-gold">
              Sesiones
            </h2>
            <p className="text-sm text-slate-400">
              {committee._count.sessions} sesión(es)
            </p>
          </div>
          <span className="text-gold">→</span>
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-lg text-slate-200">Sesiones recientes</h2>
        {recentSessions.length === 0 ? (
          <div className="card p-5 text-sm text-slate-400">
            Aún no hay sesiones.
          </div>
        ) : (
          <div className="card divide-y divide-slate-800">
            {recentSessions.map((s) => (
              <Link
                key={s.id}
                href={`/committees/${committee.id}/sessions/${s.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/40"
              >
                <span className="text-slate-100">{s.title}</span>
                <span className="badge bg-slate-800 text-slate-300">
                  {SessionStatusLabel[s.status as SessionStatus] ?? s.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg text-slate-200">
          Miembros ({committee.members.length})
        </h2>
        <div className="card divide-y divide-slate-800">
          {committee.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between px-5 py-3"
            >
              <span className="text-sm text-slate-300">{m.user.name}</span>
              <span className="badge bg-slate-800 text-slate-300">
                {CommitteeRoleLabel[m.role as CommitteeRole] ?? m.role}
              </span>
            </div>
          ))}
        </div>
        {canManage && (
          <p className="mt-2 text-xs text-slate-500">
            Tienes permisos de gestión en este comité.
          </p>
        )}
      </section>
    </div>
  );
}
