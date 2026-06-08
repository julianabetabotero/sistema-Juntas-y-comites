import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSessionAccess } from "@/lib/session-access";
import { log } from "@/lib/audit";
import { errorResponse, UnauthorizedError, HttpError } from "@/lib/errors";
import { CommitteeRole } from "@/lib/enums";

export const runtime = "nodejs";

const schema = z.object({
  sessionId: z.string().min(1),
  question: z.string().min(1).max(500),
});

// Crear una votación dentro de una sesión en curso (solo secretario/presidente).
export async function POST(req: Request) {
  try {
    const auser = await auth();
    if (!auser?.user) throw new UnauthorizedError();

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "Datos inválidos");

    const { session } = await requireSessionAccess(
      auser.user.id,
      parsed.data.sessionId,
      CommitteeRole.SECRETARY,
    );

    if (session.status !== "IN_PROGRESS") {
      throw new HttpError(400, "La sesión debe estar en curso para votar.");
    }

    const vote = await prisma.vote.create({
      data: {
        sessionId: session.id,
        question: parsed.data.question,
        status: "OPEN",
      },
    });

    await log({
      userId: auser.user.id,
      userName: auser.user.name ?? "",
      action: "vote.create",
      resourceType: "vote",
      resourceId: vote.id,
      metadata: { question: parsed.data.question },
      request: req,
    });

    return NextResponse.json({ id: vote.id });
  } catch (err) {
    return errorResponse(err);
  }
}
