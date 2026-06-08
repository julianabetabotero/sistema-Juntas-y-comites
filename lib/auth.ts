import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { verifyTotp } from "@/lib/totp";
import { getUserCommitteeIds } from "@/lib/permissions";

// Configuración completa de NextAuth (entorno Node: usa Prisma, bcrypt, TOTP).
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
        totp: { label: "Código 2FA", type: "text" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password ?? "");
        const totp = credentials?.totp ? String(credentials.totp) : "";

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const passwordOk = await bcrypt.compare(password, user.passwordHash);
        if (!passwordOk) return null;

        // Si el 2FA está activado, el código es obligatorio y debe ser válido.
        if (user.totpEnabled) {
          if (!totp || !user.totpSecret) return null;
          const secret = decrypt(user.totpSecret);
          if (!verifyTotp(totp, secret)) return null;
        }

        const committeeIds = await getUserCommitteeIds(user.id);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          committeeIds,
          totpEnabled: user.totpEnabled,
        };
      },
    }),
  ],
});
