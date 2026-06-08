import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { verifyTotp } from "@/lib/totp";
import { log } from "@/lib/audit";
import { errorResponse, UnauthorizedError, HttpError } from "@/lib/errors";

const schema = z.object({ code: z.string().min(6).max(8) });

// Verifica el primer código TOTP y activa el 2FA del usuario.
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "Código inválido");

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user?.totpSecret) {
      throw new HttpError(400, "Primero genera el código QR");
    }

    const secret = decrypt(user.totpSecret);
    if (!verifyTotp(parsed.data.code, secret)) {
      throw new HttpError(400, "El código no es válido. Intenta de nuevo.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabled: true },
    });

    await log({
      userId: user.id,
      userName: user.name,
      action: "user.2fa_enabled",
      resourceType: "user",
      resourceId: user.id,
      request: req,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
