"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SessionActions({
  sessionId,
  status,
  canManage,
}: {
  sessionId: string;
  status: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!canManage) return null;

  async function call(url: string, body?: object) {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      if (data.emailSent === false && data.invited != null) {
        setMsg(
          `Convocada (${data.invited} invitados). SMTP no configurado: correos no enviados.`,
        );
      }
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" && (
        <button
          disabled={loading}
          onClick={() => call(`/api/sessions/${sessionId}/convene`)}
          className="btn-primary"
        >
          {loading ? "…" : "Convocar y citar"}
        </button>
      )}
      {status === "CONVENED" && (
        <button
          disabled={loading}
          onClick={() =>
            call(`/api/sessions/${sessionId}/status`, { action: "start" })
          }
          className="btn-primary"
        >
          {loading ? "…" : "Iniciar sesión"}
        </button>
      )}
      {status === "IN_PROGRESS" && (
        <button
          disabled={loading}
          onClick={() =>
            call(`/api/sessions/${sessionId}/status`, { action: "close" })
          }
          className="btn-secondary"
        >
          {loading ? "…" : "Cerrar sesión"}
        </button>
      )}
      {msg && <span className="text-xs text-slate-400">{msg}</span>}
    </div>
  );
}
