import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSessionAccess } from "@/lib/session-access";
import { log } from "@/lib/audit";
import { errorResponse, UnauthorizedError, HttpError } from "@/lib/errors";
import { CommitteeRole } from "@/lib/enums";

export const runtime = "nodejs";

const schema = z.object({ content: z.string().max(100_000) });

// Guardar (crear o actualizar) el contenido del acta. Solo secretario/presidente.
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const auser = await auth();
    if (!auser?.user) throw new UnauthorizedError();

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "Contenido inválido");

    await requireSessionAccess(
      auser.user.id,
      params.id,
      CommitteeRole.SECRETARY,
    );

    const existing = await prisma.minutes.findUnique({
      where: { sessionId: params.id },
    });

    if (existing?.status === "APPROVED") {
      throw new HttpError(400, "El acta ya está aprobada y no puede editarse.");
    }

    if (!existing) {
      await prisma.minutes.create({
        data: { sessionId: params.id, content: parsed.data.content },
      });
      await log({
        userId: auser.user.id,
        userName: auser.user.name ?? "",
        action: "minutes.create",
        resourceType: "session",
        resourceId: params.id,
        request: req,
      });
    } else {
      await prisma.minutes.update({
        where: { sessionId: params.id },
        data: { content: parsed.data.content },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
