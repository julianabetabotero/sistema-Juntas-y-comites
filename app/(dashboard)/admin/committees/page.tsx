import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CommitteeTypeLabel,
  GlobalRole,
  type CommitteeType,
} from "@/lib/enums";
import Link from "next/link";
import AccessDenied from "@/components/AccessDenied";
import NewCommitteeForm from "@/components/admin/NewCommitteeForm";

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
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl text-slate-100">Comités</h1>
          <p className="mt-1 text-sm text-slate-500">
            {committees.length} cuerpo(s) colegiado(s).
          </p>
        </div>
        <NewCommitteeForm />
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {committees.map((c) => (
          <Link
            key={c.id}
            href={`/admin/committees/${c.id}`}
            className="card p-5 transition-colors hover:border-gold/40"
          >
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
          </Link>
        ))}
      </div>
    </div>
  );
}
