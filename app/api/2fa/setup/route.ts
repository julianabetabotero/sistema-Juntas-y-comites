import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { generateTotpSecret, getTotpQrDataUrl } from "@/lib/totp";
import { errorResponse, UnauthorizedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

// Genera (o regenera) un secreto TOTP para el usuario autenticado, lo guarda
// cifrado SIN activar aún el 2FA, y devuelve el QR para escanear.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user) throw new UnauthorizedError();

    const secret = generateTotpSecret();
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: encrypt(secret), totpEnabled: false },
    });

    const qrDataUrl = await getTotpQrDataUrl(user.email, secret);
    return NextResponse.json({ qrDataUrl, secret });
  } catch (err) {
    return errorResponse(err);
  }
}
