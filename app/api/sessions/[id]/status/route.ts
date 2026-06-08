import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSessionAccess } from "@/lib/session-access";
import { log } from "@/lib/audit";
import { errorResponse, UnauthorizedError, HttpError } from "@/lib/errors";
import { CommitteeRole } from "@/lib/enums";

export const runtime = "nodejs";

const schema = z.object({ action: z.enum(["start", "close"]) });

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const auser = await auth();
    if (!auser?.user) throw new UnauthorizedError();

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "Acción inválida");

    const { session } = await requireSessionAccess(
      auser.user.id,
      params.id,
      CommitteeRole.SECRETARY,
    );

    let newStatus: string;
    let action: string;
    if (parsed.data.action === "start") {
      if (session.status !== "CONVENED") {
        throw new HttpError(400, "La sesión debe estar convocada para iniciarse.");
      }
      newStatus = "IN_PROGRESS";
      action = "session.start";
    } else {
      if (session.status !== "IN_PROGRESS") {
        throw new HttpError(400, "Solo se puede cerrar una sesión en curso.");
      }
      newStatus = "CLOSED";
      action = "session.close";
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { status: newStatus },
    });

    await log({
      userId: auser.user.id,
      userName: auser.user.name ?? "",
      action,
      resourceType: "session",
      resourceId: session.id,
      request: req,
    });

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (err) {
    return errorResponse(err);
  }
}
