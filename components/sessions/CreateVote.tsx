"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateVote({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setQuestion("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <label className="label">Nueva votación</label>
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="¿Se aprueba el presupuesto 2026?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button disabled={saving} className="btn-primary whitespace-nowrap">
          {saving ? "…" : "Abrir"}
        </button>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </form>
  );
}
