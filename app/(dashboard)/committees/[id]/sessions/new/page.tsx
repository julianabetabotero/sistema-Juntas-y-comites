"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Formatea una fecha al formato que espera <input type="datetime-local">.
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewSessionPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  // Pre-rellena fecha/hora por defecto (mañana 09:00) tras montar, para evitar
  // el error "el campo está incompleto" cuando el usuario olvida poner la hora.
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    setScheduledAt(toLocalInput(d));
  }, []);
  const [location, setLocation] = useState("");
  const [agenda, setAgenda] = useState<{ title: string; description: string }[]>(
    [{ title: "", description: "" }],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateItem(i: number, field: "title" | "description", value: string) {
    setAgenda((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          committeeId: params.id,
          title,
          scheduledAt: new Date(scheduledAt).toISOString(),
          location: location || null,
          agenda: agenda
            .filter((a) => a.title.trim())
            .map((a) => ({
              title: a.title,
              description: a.description || null,
            })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear la sesión");
      router.push(`/committees/${params.id}/sessions/${data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <Link
          href={`/committees/${params.id}/sessions`}
          className="text-sm text-slate-400 hover:text-gold"
        >
          ← Volver a sesiones
        </Link>
        <h1 className="mt-1 text-2xl text-slate-100">Nueva sesión</h1>
      </header>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label">Título</label>
          <input
            className="input"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sesión ordinaria de junio"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Fecha y hora</label>
            <input
              type="datetime-local"
              className="input"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Recuerda incluir también la hora (ej. 09:00).
            </p>
          </div>
          <div>
            <label className="label">Lugar o enlace</label>
            <input
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Sala de juntas / Zoom"
            />
          </div>
        </div>

        <div>
          <label className="label">Orden del día</label>
          <div className="space-y-2">
            {agenda.map((item, i) => (
              <div key={i} className="flex gap-2">
                <span className="mt-2 text-sm text-slate-500">{i + 1}.</span>
                <div className="flex-1 space-y-1">
                  <input
                    className="input"
                    placeholder="Punto de agenda"
                    value={item.title}
                    onChange={(e) => updateItem(i, "title", e.target.value)}
                  />
                </div>
                {agenda.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setAgenda((p) => p.filter((_, idx) => idx !== i))
                    }
                    className="btn-ghost px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setAgenda((p) => [...p, { title: "", description: "" }])
            }
            className="btn-ghost mt-2"
          >
            + Añadir punto
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Creando…" : "Crear sesión (borrador)"}
          </button>
        </div>
      </form>
    </div>
  );
}
