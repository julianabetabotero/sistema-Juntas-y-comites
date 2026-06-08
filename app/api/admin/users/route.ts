import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/permissions";
import { log } from "@/lib/audit";
import { errorResponse, UnauthorizedError, HttpError } from "@/lib/errors";
import { GlobalRole } from "@/lib/enums";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z
    .enum([GlobalRole.SUPER_ADMIN, GlobalRole.MEMBER])
    .default(GlobalRole.MEMBER),
});

export async function POST(req: Request) {
  try {
    const auser = await auth();
    if (!auser?.user) throw new UnauthorizedError();
    await requireSuperAdmin(auser.user.id);

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "Datos inválidos");

    const email = parsed.data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, "Ya existe un usuario con ese email.");

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
        role: parsed.data.role,
      },
    });

    await log({
      userId: auser.user.id,
      userName: auser.user.name ?? "",
      action: "user.create",
      resourceType: "user",
      resourceId: user.id,
      metadata: { email, role: parsed.data.role },
      request: req,
    });

    return NextResponse.json({ id: user.id });
  } catch (err) {
    return errorResponse(err);
  }
}
