import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSessionAccess } from "@/lib/session-access";
import { errorResponse, UnauthorizedError, HttpError } from "@/lib/errors";
import { CommitteeRole } from "@/lib/enums";

export const runtime = "nodejs";

const schema = z.object({
  userId: z.string().min(1),
  status: z.enum(["INVITED", "CONFIRMED", "ABSENT", "EXCUSED"]),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const auser = await auth();
    if (!auser?.user) throw new UnauthorizedError();

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "Datos inválidos");

    await requireSessionAccess(
      auser.user.id,
      params.id,
      CommitteeRole.SECRETARY,
    );

    const attendance = await prisma.attendance.findFirst({
      where: { sessionId: params.id, userId: parsed.data.userId },
    });
    if (!attendance) throw new HttpError(404, "Asistente no encontrado");

    await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        status: parsed.data.status,
        confirmedAt: parsed.data.status === "CONFIRMED" ? new Date() : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
