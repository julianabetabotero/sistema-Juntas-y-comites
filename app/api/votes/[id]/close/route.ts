import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSessionAccess } from "@/lib/session-access";
import { log } from "@/lib/audit";
import { errorResponse, UnauthorizedError, HttpError, NotFoundError } from "@/lib/errors";
import { CommitteeRole } from "@/lib/enums";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const auser = await auth();
    if (!auser?.user) throw new UnauthorizedError();

    const vote = await prisma.vote.findUnique({ where: { id: params.id } });
    if (!vote) throw new NotFoundError("Votación no encontrada");

    await requireSessionAccess(
      auser.user.id,
      vote.sessionId,
      CommitteeRole.SECRETARY,
    );

    if (vote.status !== "OPEN") throw new HttpError(400, "Ya está cerrada.");

    await prisma.vote.update({
      where: { id: vote.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    await log({
      userId: auser.user.id,
      userName: auser.user.name ?? "",
      action: "vote.close",
      resourceType: "vote",
      resourceId: vote.id,
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
