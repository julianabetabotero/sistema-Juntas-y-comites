import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/permissions";
import { log } from "@/lib/audit";
import { errorResponse, UnauthorizedError, HttpError } from "@/lib/errors";
import { CommitteeRole } from "@/lib/enums";

export const runtime = "nodejs";

const addSchema = z.object({
  userId: z.string().min(1),
  committeeId: z.string().min(1),
  role: z.enum([
    CommitteeRole.PRESIDENT,
    CommitteeRole.SECRETARY,
    CommitteeRole.MEMBER,
    CommitteeRole.AUDITOR,
  ]),
});

const removeSchema = z.object({
  userId: z.string().min(1),
  committeeId: z.string().min(1),
});

// Agregar o reactivar una membresía (con rol).
export async function POST(req: Request) {
  try {
    const auser = await auth();
    if (!auser?.user) throw new UnauthorizedError();
    await requireSuperAdmin(auser.user.id);

    const body = await req.json().catch(() => null);
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "Datos inválidos");

    const { userId, committeeId, role } = parsed.data;

    const [user, committee] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.committee.findUnique({ where: { id: committeeId } }),
    ]);
    if (!user || !committee) throw new HttpError(404, "Usuario o comité no existe.");

    await prisma.membership.upsert({
      where: { userId_committeeId: { userId, committeeId } },
      update: { role, isActive: true, leftAt: null },
      create: { userId, committeeId, role, isActive: true },
    });

    await log({
      userId: auser.user.id,
      userName: auser.user.name ?? "",
      action: "membership.add",
      resourceType: "committee",
      resourceId: committeeId,
      metadata: { member: user.name, role },
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

// Quitar (desactivar) una membresía.
export async function DELETE(req: Request) {
  try {
    const auser = await auth();
    if (!auser?.user) throw new UnauthorizedError();
    await requireSuperAdmin(auser.user.id);

    const body = await req.json().catch(() => null);
    const parsed = removeSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "Datos inválidos");

    const membership = await prisma.membership.findUnique({
      where: {
        userId_committeeId: {
          userId: parsed.data.userId,
          committeeId: parsed.data.committeeId,
        },
      },
    });
    if (!membership) throw new HttpError(404, "Membresía no encontrada.");

    await prisma.membership.update({
      where: { id: membership.id },
      data: { isActive: false, leftAt: new Date() },
    });

    await log({
      userId: auser.user.id,
      userName: auser.user.name ?? "",
      action: "membership.remove",
      resourceType: "committee",
      resourceId: parsed.data.committeeId,
      metadata: { userId: parsed.data.userId },
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
