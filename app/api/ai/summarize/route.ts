import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSessionAccess } from "@/lib/session-access";
import { summarizeMinutes } from "@/lib/ai";
import { log } from "@/lib/audit";
import { errorResponse, UnauthorizedError, HttpError } from "@/lib/errors";
import { CommitteeRole } from "@/lib/enums";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({ sessionId: z.string().min(1) });

// Genera un resumen ejecutivo del acta con IA y lo guarda en Minutes.aiSummary.
// Requiere secretario/presidente del comité.
export async function POST(req: Request) {
  try {
    const auser = await auth();
    if (!auser?.user) throw new UnauthorizedError();

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "Datos inválidos");

    await requireSessionAccess(
      auser.user.id,
      parsed.data.sessionId,
      CommitteeRole.SECRETARY,
    );

    const minutes = await prisma.minutes.findUnique({
      where: { sessionId: parsed.data.sessionId },
    });
    if (!minutes || !minutes.content.trim()) {
      throw new HttpError(400, "El acta aún no tiene contenido para resumir.");
    }

    const summary = await summarizeMinutes(minutes.content);

    await prisma.minutes.update({
      where: { sessionId: parsed.data.sessionId },
      data: { aiSummary: summary },
    });

    await log({
      userId: auser.user.id,
      userName: auser.user.name ?? "",
      action: "ai.summarize",
      resourceType: "session",
      resourceId: parsed.data.sessionId,
      request: req,
    });

    return NextResponse.json({ summary });
  } catch (err) {
    return errorResponse(err);
  }
}
