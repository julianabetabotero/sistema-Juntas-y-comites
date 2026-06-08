import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCommitteeAccess } from "@/lib/permissions";
import { log } from "@/lib/audit";
import { errorResponse, UnauthorizedError, HttpError } from "@/lib/errors";
import { CommitteeRole } from "@/lib/enums";

export const runtime = "nodejs";

const schema = z.object({
  committeeId: z.string().min(1),
  title: z.string().min(1).max(200),
  scheduledAt: z.string().min(1),
  location: z.string().max(300).optional().nullable(),
  agenda: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(1000).optional().nullable(),
      }),
    )
    .default([]),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "Datos inválidos");

    const { committeeId, title, scheduledAt, location, agenda } = parsed.data;

    // Solo secretario/presidente (o super_admin) crean sesiones.
    await requireCommitteeAccess(
      session.user.id,
      committeeId,
      CommitteeRole.SECRETARY,
    );

    const when = new Date(scheduledAt);
    if (isNaN(when.getTime())) throw new HttpError(400, "Fecha inválida");

    const created = await prisma.session.create({
      data: {
        committeeId,
        title,
        scheduledAt: when,
        location: location ?? null,
        status: "DRAFT",
        agenda: {
          create: agenda.map((a, i) => ({
            order: i + 1,
            title: a.title,
            description: a.description ?? null,
          })),
        },
      },
    });

    await log({
      userId: session.user.id,
      userName: session.user.name ?? "",
      action: "session.create",
      resourceType: "session",
      resourceId: created.id,
      metadata: { title, committeeId },
      request: req,
    });

    return NextResponse.json({ id: created.id });
  } catch (err) {
    return errorResponse(err);
  }
}
