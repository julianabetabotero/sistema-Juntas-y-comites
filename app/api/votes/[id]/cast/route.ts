import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSessionAccess } from "@/lib/session-access";
import { log } from "@/lib/audit";
import { errorResponse, UnauthorizedError, HttpError, NotFoundError } from "@/lib/errors";
import { CommitteeRole } from "@/lib/enums";

export const runtime = "nodejs";

const schema = z.object({ value: z.enum(["YES", "NO", "ABSTAIN"]) });

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const auser = await auth();
    if (!auser?.user) throw new UnauthorizedError();

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "Valor de voto inválido");

    const vote = await prisma.vote.findUnique({ where: { id: params.id } });
    if (!vote) throw new NotFoundError("Votación no encontrada");
    if (vote.status !== "OPEN") {
      throw new HttpError(400, "La votación está cerrada.");
    }

    // Acceso al comité de la sesión + obtención del rol.
    const { membership } = await requireSessionAccess(
      auser.user.id,
      vote.sessionId,
    );

    // Los auditores no votan (requisito de gobierno corporativo).
    if (membership.role === CommitteeRole.AUDITOR) {
      throw new HttpError(403, "Los auditores no pueden votar.");
    }

    // Un voto por usuario (constraint único voteId+userId).
    const existing = await prisma.voteResponse.findUnique({
      where: { voteId_userId: { voteId: vote.id, userId: auser.user.id } },
    });
    if (existing) throw new HttpError(400, "Ya emitiste tu voto.");

    await prisma.voteResponse.create({
      data: {
        voteId: vote.id,
        userId: auser.user.id,
        userName: auser.user.name ?? "",
        value: parsed.data.value,
      },
    });

    await log({
      userId: auser.user.id,
      userName: auser.user.name ?? "",
      action: "vote.cast",
      resourceType: "vote",
      resourceId: vote.id,
      metadata: { value: parsed.data.value },
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
