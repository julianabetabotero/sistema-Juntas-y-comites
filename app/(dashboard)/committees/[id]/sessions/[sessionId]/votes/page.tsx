import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCommitteeAccess, canManageCommittee } from "@/lib/permissions";
import AccessDenied from "@/components/AccessDenied";
import VotePanel from "@/components/sessions/VotePanel";
import CreateVote from "@/components/sessions/CreateVote";
import { CommitteeRole } from "@/lib/enums";

export default async function VotesPage({
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
    include: { votes: { orderBy: { createdAt: "desc" } } },
  });
  if (!session || session.committeeId !== params.id) {
    return <AccessDenied message="Sesión no encontrada." />;
  }

  const canManage = canManageCommittee(membership.role);
  const canVote = membership.role !== CommitteeRole.AUDITOR;
  const inProgress = session.status === "IN_PROGRESS";

  return (
    <div className="space-y-6">
      <header>
        <Link
          href={`/committees/${params.id}/sessions/${params.sessionId}`}
          className="text-sm text-slate-400 hover:text-gold"
        >
          ← Volver a la sesión
        </Link>
        <h1 className="mt-1 text-2xl text-slate-100">Votaciones</h1>
        <p className="mt-1 text-sm text-slate-500">
          Votos nominativos · resultados visibles solo al cerrar cada votación.
        </p>
      </header>

      {canManage &&
        (inProgress ? (
          <CreateVote sessionId={session.id} />
        ) : (
          <div className="card p-4 text-sm text-slate-400">
            Para crear votaciones, la sesión debe estar <strong>en curso</strong>.
          </div>
        ))}

      <VotePanel
        voteIds={session.votes.map((v) => v.id)}
        canManage={canManage}
        canVote={canVote}
      />
    </div>
  );
}
