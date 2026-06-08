import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Protege todas las rutas del dashboard, gestiona el login y fuerza la
// configuración de 2FA en el primer acceso.
export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const path = nextUrl.pathname;

  const isLoginPage = path === "/login";
  const isSetup2fa = path === "/setup-2fa";

  if (!isLoggedIn) {
    if (isLoginPage) return NextResponse.next();
    const loginUrl = new URL("/login", nextUrl);
    return NextResponse.redirect(loginUrl);
  }

  // Usuario autenticado:
  const totpEnabled = session!.user.totpEnabled;

  // Forzar configuración de 2FA si aún no está activado.
  if (!totpEnabled && !isSetup2fa) {
    return NextResponse.redirect(new URL("/setup-2fa", nextUrl));
  }

  // Si ya tiene 2FA y está en login o setup, llevarlo al dashboard.
  if (totpEnabled && (isLoginPage || isSetup2fa)) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Evitar volver al login estando autenticado.
  if (isLoginPage) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Ejecuta el middleware en todo excepto assets estáticos y la API de NextAuth.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
