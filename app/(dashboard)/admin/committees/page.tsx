import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CommitteeTypeLabel,
  GlobalRole,
  type CommitteeType,
} from "@/lib/enums";
import AccessDenied from "@/components/AccessDenied";

export default async function AdminCommitteesPage() {
  const session = await auth();
  if (session!.user.role !== GlobalRole.SUPER_ADMIN) {
    return <AccessDenied message="Solo el super administrador puede ver esta sección." />;
  }

  const committees = await prisma.committee.findMany({
    include: {
      _count: {
        select: { members: true, sessions: true, documents: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl text-slate-100">Comités</h1>
        <p className="mt-1 text-sm text-slate-500">
          {committees.length} cuerpo(s) colegiado(s). La creación desde la
          interfaz llega en la siguiente iteración.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {committees.map((c) => (
          <div key={c.id} className="card p-5">
            <p className="text-xs uppercase tracking-wide text-gold">
              {CommitteeTypeLabel[c.type as CommitteeType] ?? c.type}
            </p>
            <h2 className="mt-1 text-lg text-slate-100">{c.name}</h2>
            {c.description && (
              <p className="mt-1 text-sm text-slate-400">{c.description}</p>
            )}
            <div className="mt-3 flex gap-4 text-xs text-slate-500">
              <span>{c._count.members} miembros</span>
              <span>{c._count.sessions} sesiones</span>
              <span>{c._count.documents} documentos</span>
              <span>Quórum {c.quorumPercentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
