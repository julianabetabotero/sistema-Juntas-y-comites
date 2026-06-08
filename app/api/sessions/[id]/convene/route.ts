import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSessionAccess } from "@/lib/session-access";
import { log } from "@/lib/audit";
import { sendMail, buildConvocationEmail } from "@/lib/email";
import { errorResponse, UnauthorizedError, HttpError } from "@/lib/errors";
import { CommitteeRole } from "@/lib/enums";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const auser = await auth();
    if (!auser?.user) throw new UnauthorizedError();

    const { session } = await requireSessionAccess(
      auser.user.id,
      params.id,
      CommitteeRole.SECRETARY,
    );

    if (session.status !== "DRAFT") {
      throw new HttpError(400, "Solo se puede convocar una sesión en borrador.");
    }

    const [committee, members, agenda] = await Promise.all([
      prisma.committee.findUnique({ where: { id: session.committeeId } }),
      prisma.membership.findMany({
        where: { committeeId: session.committeeId, isActive: true },
        include: { user: true },
      }),
      prisma.agendaItem.findMany({ where: { sessionId: session.id } }),
    ]);

    // Crear asistencias INVITED (evitando duplicados).
    for (const m of members) {
      const exists = await prisma.attendance.findFirst({
        where: { sessionId: session.id, userId: m.userId },
      });
      if (!exists) {
        await prisma.attendance.create({
          data: {
            sessionId: session.id,
            userId: m.userId,
            userName: m.user.name,
            status: "INVITED",
          },
        });
      }
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { status: "CONVENED" },
    });

    // Enviar citaciones (best-effort).
    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const html = buildConvocationEmail({
      committeeName: committee?.name ?? "Comité",
      title: session.title,
      scheduledAt: session.scheduledAt,
      location: session.location,
      agenda: agenda.map((a) => ({ order: a.order, title: a.title })),
      appUrl: `${appUrl}/committees/${session.committeeId}/sessions/${session.id}`,
    });
    const result = await sendMail({
      to: members.map((m) => m.user.email),
      subject: `Citación: ${session.title}`,
      html,
    });

    await log({
      userId: auser.user.id,
      userName: auser.user.name ?? "",
      action: "session.convene",
      resourceType: "session",
      resourceId: session.id,
      metadata: { recipients: members.length, emailSent: result.sent },
      request: req,
    });

    return NextResponse.json({
      ok: true,
      invited: members.length,
      emailSent: result.sent,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
