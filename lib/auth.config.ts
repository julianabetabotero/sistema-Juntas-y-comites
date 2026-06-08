import type { NextAuthConfig } from "next-auth";

// Configuración compartida y "edge-safe" (sin Prisma ni bcrypt) que usa el
// middleware. Los providers se añaden en lib/auth.ts (entorno Node).

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.committeeIds = user.committeeIds ?? [];
        token.totpEnabled = user.totpEnabled ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.committeeIds = (token.committeeIds as string[]) ?? [];
        session.user.totpEnabled = (token.totpEnabled as boolean) ?? false;
      }
      return session;
    },
    authorized({ auth }) {
      // Usado por el middleware: hay sesión válida.
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
