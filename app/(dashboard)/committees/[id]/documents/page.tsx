import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCommitteeAccess, canManageCommittee } from "@/lib/permissions";
import AccessDenied from "@/components/AccessDenied";
import UploadZone from "@/components/documents/UploadZone";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function DocumentsPage({
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

  const documents = await prisma.document.findMany({
    where: { committeeId: params.id },
    orderBy: { createdAt: "desc" },
  });

  const canManage = canManageCommittee(membership.role);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <Link
            href={`/committees/${params.id}`}
            className="text-sm text-slate-400 hover:text-gold"
          >
            ← Volver al comité
          </Link>
          <h1 className="mt-1 text-2xl text-slate-100">Documentos</h1>
        </div>
      </header>

      {canManage && <UploadZone committeeId={params.id} />}

      {documents.length === 0 ? (
        <div className="card p-6 text-slate-400">
          Aún no hay documentos en este comité.
        </div>
      ) : (
        <div className="card divide-y divide-slate-800">
          {documents.map((d) => (
            <Link
              key={d.id}
              href={`/committees/${params.id}/documents/${d.id}/view`}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-800/40"
            >
              <div className="min-w-0">
                <p className="truncate text-slate-100">{d.name}</p>
                <p className="text-xs text-slate-500">
                  {formatSize(d.sizeBytes)} ·{" "}
                  {new Date(d.createdAt).toLocaleDateString("es-CO")} · v
                  {d.version}
                </p>
              </div>
              <span className="text-gold">Ver →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
