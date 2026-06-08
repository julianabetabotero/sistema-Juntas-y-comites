"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export default function Setup2faPage() {
  const router = useRouter();
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/2fa/setup")
      .then((r) => r.json())
      .then((data) => {
        if (data.qrDataUrl) {
          setQr(data.qrDataUrl);
          setSecret(data.secret);
        } else {
          setError(data.error ?? "No se pudo generar el código QR");
        }
      })
      .catch(() => setError("Error al generar el código QR"));
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Código inválido");
      return;
    }
    setDone(true);
    // Forzamos re-login para que la sesión incluya totpEnabled = true.
    setTimeout(async () => {
      await signOut({ redirect: false });
      router.push("/login");
    }, 1800);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl text-slate-100">
            Configura tu segundo factor
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Por seguridad, todos los accesos requieren autenticación en dos
            pasos.
          </p>
        </div>

        <div className="card space-y-5 p-6">
          {done ? (
            <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/40 px-4 py-3 text-center text-sm text-emerald-300">
              ✅ 2FA activado correctamente. Redirigiendo al login para iniciar
              sesión de nuevo…
            </div>
          ) : (
            <>
              <ol className="space-y-1 text-sm text-slate-300">
                <li>
                  1. Instala <strong>Google Authenticator</strong> (o similar).
                </li>
                <li>2. Escanea este código QR:</li>
              </ol>

              <div className="flex justify-center">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qr}
                    alt="Código QR para 2FA"
                    className="h-48 w-48 rounded-lg border border-slate-700 bg-white p-2"
                  />
                ) : (
                  <div className="flex h-48 w-48 items-center justify-center rounded-lg border border-slate-700 text-sm text-slate-500">
                    Generando…
                  </div>
                )}
              </div>

              {secret && (
                <p className="text-center text-xs text-slate-500">
                  ¿No puedes escanear? Clave manual:{" "}
                  <code className="text-slate-300">{secret}</code>
                </p>
              )}

              <form onSubmit={handleVerify} className="space-y-3">
                <div>
                  <label className="label" htmlFor="code">
                    3. Ingresa el código de 6 dígitos
                  </label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    className="input text-center text-lg tracking-[0.5em]"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !qr}
                  className="btn-primary w-full"
                >
                  {loading ? "Verificando…" : "Activar 2FA"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
