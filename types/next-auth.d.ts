import type { DefaultSession } from "next-auth";

// Extiende los tipos de NextAuth con nuestros claims personalizados.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string; // GlobalRole
      committeeIds: string[];
      totpEnabled: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    committeeIds?: string[];
    totpEnabled?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    committeeIds: string[];
    totpEnabled: boolean;
  }
}
