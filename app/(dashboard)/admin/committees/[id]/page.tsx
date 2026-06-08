import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GlobalRole, CommitteeTypeLabel, type CommitteeType } from "@/lib/enums";
import AccessDenied from "@/components/AccessDenied";
import MembershipManager from "@/components/admin/MembershipManager";

export default async function AdminCommitteeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (session!.user.role !== GlobalRole.SUPER_ADMIN) {
    return <AccessDenied message="Solo el super administrador puede ver esta sección." />;
  }

  const committee = await prisma.committee.findUnique({
    where: { id: params.id },
    include: {
      members: {
        where: { isActive: true },
        include: { user: true },
        orderBy: { role: "asc" },
      },
    },
  });
  if (!committee) return <AccessDenied message="Comité no encontrado." />;

  const allUsers = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/committees"
          className="text-sm text-slate-400 hover:text-gold"
        >
          ← Volver a comités
        </Link>
        <p className="mt-1 text-xs uppercase tracking-wide text-gold">
          {CommitteeTypeLabel[committee.type as CommitteeType] ?? committee.type}
        </p>
        <h1 className="text-2xl text-slate-100">{committee.name}</h1>
        {committee.description && (
          <p className="mt-1 text-slate-400">{committee.description}</p>
        )}
      </header>

      <section>
        <h2 className="mb-3 text-lg text-slate-200">
          Miembros ({committee.members.length})
        </h2>
        <MembershipManager
          committeeId={committee.id}
          members={committee.members.map((m) => ({
            userId: m.userId,
            name: m.user.name,
            role: m.role,
          }))}
          allUsers={allUsers}
        />
      </section>
    </div>
  );
}
