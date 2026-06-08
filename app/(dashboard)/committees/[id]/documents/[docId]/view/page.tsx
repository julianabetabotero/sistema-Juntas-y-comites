import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireDocumentAccess } from "@/lib/permissions";
import { buildWatermarkText } from "@/lib/watermark";
import AccessDenied from "@/components/AccessDenied";
import DocumentViewerClient from "@/components/documents/DocumentViewerClient";

export default async function DocumentViewPage({
  params,
}: {
  params: { id: string; docId: string };
}) {
  const session = await auth();

  let document;
  try {
    const access = await requireDocumentAccess(session!.user.id, params.docId);
    document = access.document;
  } catch {
    return <AccessDenied message="No tienes acceso a este documento." />;
  }

  const uploader = await prisma.user.findUnique({
    where: { id: document.uploadedBy },
    select: { name: true },
  });

  const watermarkText = buildWatermarkText(session!.user.name ?? "Usuario");
  const isPdf = document.mimeType === "application/pdf";

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <Link
            href={`/committees/${params.id}/documents`}
            className="text-sm text-slate-400 hover:text-gold"
          >
            ← Volver a documentos
          </Link>
          <h1 className="mt-1 truncate text-2xl text-slate-100">
            {document.name}
          </h1>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div>
          {isPdf ? (
            <DocumentViewerClient
              documentId={document.id}
              watermarkText={watermarkText}
            />
          ) : (
            <div className="card p-6 text-sm text-slate-400">
              Este formato ({document.mimeType}) no se previsualiza con marca de
              agua en el MVP. La conversión a PDF de DOCX/XLSX/PPTX está prevista
              para una fase posterior.
            </div>
          )}
        </div>

        <aside className="card h-fit space-y-3 p-5 text-sm">
          <h2 className="font-serif text-base text-slate-100">Información</h2>
          <div>
            <p className="text-xs text-slate-500">Subido por</p>
            <p className="text-slate-200">{uploader?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Fecha</p>
            <p className="text-slate-200">
              {new Date(document.createdAt).toLocaleString("es-CO")}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Versión</p>
            <p className="text-slate-200">v{document.version}</p>
          </div>
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-gold">
            Este documento lleva una marca de agua con tu nombre y la fecha/hora
            de apertura. Todo acceso queda registrado en auditoría.
          </div>
        </aside>
      </div>
    </div>
  );
}
