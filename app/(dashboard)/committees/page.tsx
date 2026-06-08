import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserCommittees } from "@/lib/committees";
import {
  CommitteeRoleLabel,
  CommitteeTypeLabel,
  type CommitteeRole,
  type CommitteeType,
} from "@/lib/enums";

export default async function CommitteesPage() {
  const session = await auth();
  const committees = await getUserCommittees(session!.user.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl text-slate-100">Mis comités</h1>
        <p className="mt-1 text-slate-400">
          Cuerpos colegiados a los que tienes acceso.
        </p>
      </header>

      {committees.length === 0 ? (
        <div className="card p-6 text-slate-400">
          No perteneces a ningún comité.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {committees.map((c) => (
            <Link
              key={c.id}
              href={`/committees/${c.id}`}
              className="card group p-5 transition-colors hover:border-gold/40"
            >
              <p className="text-xs uppercase tracking-wide text-gold">
                {CommitteeTypeLabel[c.type as CommitteeType] ?? c.type}
              </p>
              <h2 className="mt-2 text-lg text-slate-100 group-hover:text-gold">
                {c.name}
              </h2>
              {c.role && (
                <span className="badge mt-3 bg-slate-800 text-slate-300">
                  {CommitteeRoleLabel[c.role as CommitteeRole] ?? c.role}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
