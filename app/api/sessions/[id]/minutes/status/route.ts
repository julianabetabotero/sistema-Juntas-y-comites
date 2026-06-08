import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSessionAccess } from "@/lib/session-access";
import { log } from "@/lib/audit";
import { errorResponse, UnauthorizedError, HttpError } from "@/lib/errors";
import { CommitteeRole } from "@/lib/enums";

export const runtime = "nodejs";

const schema = z.object({ action: z.enum(["submit", "approve"]) });

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

    const minutes = await prisma.minutes.findUnique({
      where: { sessionId: params.id },
    });
    if (!minutes) throw new HttpError(400, "Primero redacta el acta.");

    if (parsed.data.action === "submit") {
      // Secretario envía a revisión.
      await requireSessionAccess(
        auser.user.id,
        params.id,
        CommitteeRole.SECRETARY,
      );
      if (minutes.status !== "DRAFT") {
        throw new HttpError(400, "El acta no está en borrador.");
      }
      await prisma.minutes.update({
        where: { sessionId: params.id },
        data: { status: "UNDER_REVIEW" },
      });
      return NextResponse.json({ ok: true, status: "UNDER_REVIEW" });
    }

    // approve — solo presidente/super_admin.
    await requireSessionAccess(
      auser.user.id,
      params.id,
      CommitteeRole.PRESIDENT,
    );
    if (minutes.status !== "UNDER_REVIEW") {
      throw new HttpError(400, "El acta debe estar en revisión para aprobarse.");
    }

    await prisma.$transaction([
      prisma.minutes.update({
        where: { sessionId: params.id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedBy: auser.user.name ?? "",
        },
      }),
      prisma.session.update({
        where: { id: params.id },
        data: { status: "APPROVED" },
      }),
    ]);

    await log({
      userId: auser.user.id,
      userName: auser.user.name ?? "",
      action: "minutes.approve",
      resourceType: "session",
      resourceId: params.id,
      request: req,
    });

    return NextResponse.json({ ok: true, status: "APPROVED" });
  } catch (err) {
    return errorResponse(err);
  }
}
