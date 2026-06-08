"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Paso 1: si aún no sabemos si necesita 2FA, validamos credenciales.
      if (!needs2fa) {
        const res = await fetch("/api/auth/precheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "No se pudo iniciar sesión");
          setLoading(false);
          return;
        }

        if (data.needs2fa) {
          setNeeds2fa(true);
          setLoading(false);
          return;
        }
      }

      // Paso 2: crear la sesión (con o sin código 2FA).
      const result = await signIn("credentials", {
        email,
        password,
        totp,
        redirect: false,
      });

      if (result?.error) {
        setError(
          needs2fa
            ? "Código 2FA incorrecto"
            : "No se pudo iniciar sesión",
        );
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-slate-900">
            <span className="font-serif text-2xl text-gold">G</span>
          </div>
          <h1 className="font-serif text-2xl text-slate-100">
            Gobernanza Corporativa
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Acceso seguro a comités y junta directiva
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          {!needs2fa ? (
            <>
              <div>
                <label className="label" htmlFor="email">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                />
              </div>
              <div>
                <label className="label" htmlFor="password">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="label" htmlFor="totp">
                Código de verificación (2FA)
              </label>
              <input
                id="totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                maxLength={6}
                className="input text-center text-lg tracking-[0.5em]"
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
              />
              <p className="mt-2 text-xs text-slate-400">
                Ingresa el código de 6 dígitos de tu app de autenticación.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading
              ? "Verificando…"
              : needs2fa
                ? "Verificar y entrar"
                : "Continuar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Plataforma interna · Acceso restringido · Todas las acciones quedan
          registradas
        </p>
      </div>
    </main>
  );
}
