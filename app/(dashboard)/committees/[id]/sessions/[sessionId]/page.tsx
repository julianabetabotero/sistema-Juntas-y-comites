import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCommitteeAccess, canManageCommittee } from "@/lib/permissions";
import AccessDenied from "@/components/AccessDenied";
import SessionTimeline from "@/components/sessions/SessionTimeline";
import SessionActions from "@/components/sessions/SessionActions";
import AttendanceSheet from "@/components/sessions/AttendanceSheet";
import { SessionStatusLabel, type SessionStatus } from "@/lib/enums";

export default async function SessionDetailPage({
  params,
}: {
  params: { id: string; sessionId: string };
}) {
  const auser = await auth();

  let membership;
  try {
    membership = await requireCommitteeAccess(auser!.user.id, params.id);
  } catch {
    return <AccessDenied message="No perteneces a este cuerpo colegiado." />;
  }

  const session = await prisma.session.findUnique({
    where: { id: params.sessionId },
    include: {
      agenda: { orderBy: { order: "asc" } },
      attendances: { orderBy: { userName: "asc" } },
      minutes: true,
      votes: { orderBy: { createdAt: "desc" } },
      committee: true,
    },
  });

  if (!session || session.committeeId !== params.id) {
    return <AccessDenied message="Sesión no encontrada." />;
  }

  const totalMembers = await prisma.membership.count({
    where: { committeeId: params.id, isActive: true },
  });

  const canManage = canManageCommittee(membership.role);
  const base = `/committees/${params.id}/sessions/${params.sessionId}`;

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/committees/${params.id}/sessions`}
              className="text-sm text-slate-400 hover:text-gold"
            >
              ← Volver a sesiones
            </Link>
            <h1 className="mt-1 text-2xl text-slate-100">{session.title}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {new Date(session.scheduledAt).toLocaleString("es-CO", {
                dateStyle: "full",
                timeStyle: "short",
              })}
              {session.location ? ` · ${session.location}` : ""}
            </p>
          </div>
          <span className="badge bg-slate-800 text-gold">
            {SessionStatusLabel[session.status as SessionStatus] ??
              session.status}
          </span>
        </div>

        <div className="card p-5">
          <SessionTimeline status={session.status} />
        </div>

        <SessionActions
          sessionId={session.id}
          status={session.status}
          canManage={canManage}
        />
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg text-slate-200">Orden del día</h2>
          {session.agenda.length === 0 ? (
            <div className="card p-5 text-sm text-slate-400">Sin agenda.</div>
          ) : (
            <ol className="card divide-y divide-slate-800">
              {session.agenda.map((a) => (
                <li key={a.id} className="px-5 py-3">
                  <p className="text-slate-100">
                    {a.order}. {a.title}
                  </p>
                  {a.description && (
                    <p className="mt-1 text-sm text-slate-500">
                      {a.description}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg text-slate-200">Asistencia</h2>
          <AttendanceSheet
            sessionId={session.id}
            rows={session.attendances.map((a) => ({
              userId: a.userId,
              userName: a.userName,
              status: a.status,
            }))}
            canManage={canManage}
            quorumPercentage={session.committee.quorumPercentage}
            totalMembers={totalMembers}
          />
        </section>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`${base}/votes`}
          className="card group flex items-center justify-between p-5 hover:border-gold/40"
        >
          <div>
            <h2 className="text-lg text-slate-100 group-hover:text-gold">
              Votaciones
            </h2>
            <p className="text-sm text-slate-400">
              {session.votes.length} votación(es)
            </p>
          </div>
          <span className="text-gold">→</span>
        </Link>

        <Link
          href={`${base}/minutes`}
          className="card group flex items-center justify-between p-5 hover:border-gold/40"
        >
          <div>
            <h2 className="text-lg text-slate-100 group-hover:text-gold">
              Acta
            </h2>
            <p className="text-sm text-slate-400">
              {session.minutes
                ? SessionStatusLabel[session.minutes.status as SessionStatus] ??
                  session.minutes.status
                : "Sin redactar"}
            </p>
          </div>
          <span className="text-gold">→</span>
        </Link>
      </div>
    </div>
  );
}
