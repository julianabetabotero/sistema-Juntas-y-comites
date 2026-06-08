import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCommitteeAccess, canManageCommittee } from "@/lib/permissions";
import AccessDenied from "@/components/AccessDenied";
import { SessionStatusLabel, type SessionStatus } from "@/lib/enums";

export default async function SessionsPage({
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

  const sessions = await prisma.session.findMany({
    where: { committeeId: params.id },
    orderBy: { scheduledAt: "desc" },
  });
  const canManage = canManageCommittee(membership.role);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <Link
            href={`/committees/${params.id}`}
            className="text-sm text-slate-400 hover:text-gold"
          >
            ← Volver al comité
          </Link>
          <h1 className="mt-1 text-2xl text-slate-100">Sesiones</h1>
        </div>
        {canManage && (
          <Link
            href={`/committees/${params.id}/sessions/new`}
            className="btn-primary"
          >
            Nueva sesión
          </Link>
        )}
      </header>

      {sessions.length === 0 ? (
        <div className="card p-6 text-slate-400">
          Aún no hay sesiones registradas.
        </div>
      ) : (
        <div className="card divide-y divide-slate-800">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/committees/${params.id}/sessions/${s.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-800/40"
            >
              <div>
                <p className="text-slate-100">{s.title}</p>
                <p className="text-xs text-slate-500">
                  {new Date(s.scheduledAt).toLocaleString("es-CO")}
                </p>
              </div>
              <span className="badge bg-slate-800 text-slate-300">
                {SessionStatusLabel[s.status as SessionStatus] ?? s.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
