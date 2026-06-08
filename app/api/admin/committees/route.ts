import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/permissions";
import { log } from "@/lib/audit";
import { errorResponse, UnauthorizedError, HttpError } from "@/lib/errors";
import { CommitteeType } from "@/lib/enums";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  type: z.enum([
    CommitteeType.BOARD_OF_DIRECTORS,
    CommitteeType.COMMITTEE,
    CommitteeType.ASSEMBLY,
  ]),
  quorumPercentage: z.number().int().min(1).max(100).default(50),
});

export async function POST(req: Request) {
  try {
    const auser = await auth();
    if (!auser?.user) throw new UnauthorizedError();
    await requireSuperAdmin(auser.user.id);

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "Datos inválidos");

    const committee = await prisma.committee.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        type: parsed.data.type,
        quorumPercentage: parsed.data.quorumPercentage,
      },
    });

    await log({
      userId: auser.user.id,
      userName: auser.user.name ?? "",
      action: "committee.create",
      resourceType: "committee",
      resourceId: committee.id,
      metadata: { name: committee.name },
      request: req,
    });

    return NextResponse.json({ id: committee.id });
  } catch (err) {
    return errorResponse(err);
  }
}
