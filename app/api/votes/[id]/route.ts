import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSessionAccess } from "@/lib/session-access";
import { errorResponse, UnauthorizedError, NotFoundError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const auser = await auth();
    if (!auser?.user) throw new UnauthorizedError();

    const vote = await prisma.vote.findUnique({
      where: { id: params.id },
      include: { responses: true },
    });
    if (!vote) throw new NotFoundError("Votación no encontrada");

    await requireSessionAccess(auser.user.id, vote.sessionId);

    const mine = vote.responses.find((r) => r.userId === auser.user!.id);
    const closed = vote.status === "CLOSED";

    // Resultados nominativos SOLO cuando la votación está cerrada.
    const results = closed
      ? {
          counts: {
            YES: vote.responses.filter((r) => r.value === "YES").length,
            NO: vote.responses.filter((r) => r.value === "NO").length,
            ABSTAIN: vote.responses.filter((r) => r.value === "ABSTAIN").length,
          },
          responses: vote.responses.map((r) => ({
            userName: r.userName,
            value: r.value,
          })),
        }
      : null;

    return NextResponse.json({
      id: vote.id,
      question: vote.question,
      status: vote.status,
      castCount: vote.responses.length,
      youVoted: !!mine,
      yourValue: mine?.value ?? null,
      results,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
