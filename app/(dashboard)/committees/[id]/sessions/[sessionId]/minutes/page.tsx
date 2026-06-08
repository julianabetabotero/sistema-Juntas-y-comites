import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCommitteeAccess, canManageCommittee } from "@/lib/permissions";
import AccessDenied from "@/components/AccessDenied";
import MinutesEditor from "@/components/sessions/MinutesEditor";
import { CommitteeRole, GlobalRole } from "@/lib/enums";

function buildPrefill(
  title: string,
  scheduledAt: Date,
  attendees: { userName: string; status: string }[],
  agenda: { order: number; title: string }[],
): string {
  const present = attendees
    .filter((a) => a.status === "CONFIRMED")
    .map((a) => `<li>${a.userName}</li>`)
    .join("");
  const agendaHtml = agenda
    .map((a) => `<li>${a.title}</li>`)
    .join("");
  return `
    <h2>Acta — ${title}</h2>
    <p><strong>Fecha:</strong> ${scheduledAt.toLocaleString("es-CO")}</p>
    <p><strong>Asistentes:</strong></p>
    <ul>${present || "<li>—</li>"}</ul>
    <p><strong>Orden del día:</strong></p>
    <ol>${agendaHtml || "<li>—</li>"}</ol>
    <p><strong>Desarrollo:</strong></p>
    <p></p>
  `;
}

export default async function MinutesPage({
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
      minutes: true,
      attendances: true,
      agenda: { orderBy: { order: "asc" } },
    },
  });
  if (!session || session.committeeId !== params.id) {
    return <AccessDenied message="Sesión no encontrada." />;
  }

  const canEdit = canManageCommittee(membership.role);
  const canApprove =
    membership.role === CommitteeRole.PRESIDENT ||
    auser!.user.role === GlobalRole.SUPER_ADMIN;

  const initialContent =
    session.minutes?.content ??
    buildPrefill(
      session.title,
      session.scheduledAt,
      session.attendances.map((a) => ({
        userName: a.userName,
        status: a.status,
      })),
      session.agenda.map((a) => ({ order: a.order, title: a.title })),
    );

  return (
    <div className="space-y-6">
      <header>
        <Link
          href={`/committees/${params.id}/sessions/${params.sessionId}`}
          className="text-sm text-slate-400 hover:text-gold"
        >
          ← Volver a la sesión
        </Link>
        <h1 className="mt-1 text-2xl text-slate-100">Acta de la sesión</h1>
      </header>

      <MinutesEditor
        sessionId={session.id}
        initialContent={initialContent}
        status={session.minutes?.status ?? null}
        canEdit={canEdit}
        canApprove={canApprove}
        approvedBy={session.minutes?.approvedBy}
        approvedAt={session.minutes?.approvedAt?.toISOString() ?? null}
        aiSummary={session.minutes?.aiSummary}
      />
    </div>
  );
}
