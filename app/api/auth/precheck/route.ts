import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/audit";
import { checkRateLimit } from "@/lib/ratelimit";

// Paso previo al login: valida email+contraseña SIN crear sesión y responde si
// el usuario tiene 2FA activado (para mostrar el campo de código en el cliente).
// Rate-limited: máximo 5 intentos por IP cada 15 minutos.

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const limit = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  const invalid = () => {
    log({
      userId: user?.id ?? "unknown",
      userName: email,
      action: "user.login_failed",
      resourceType: "user",
      metadata: { email },
      request: req,
    });
    return NextResponse.json(
      { error: "Credenciales incorrectas" },
      { status: 401 },
    );
  };

  if (!user) return invalid();

  const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!passwordOk) return invalid();

  return NextResponse.json({ ok: true, needs2fa: user.totpEnabled });
}
