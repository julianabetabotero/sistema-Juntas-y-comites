"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CommitteeType, CommitteeTypeLabel } from "@/lib/enums";

export default function NewCommitteeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>(CommitteeType.COMMITTEE);
  const [quorum, setQuorum] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/committees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          type,
          quorumPercentage: Number(quorum),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setName("");
      setDescription("");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        Nuevo comité
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <h2 className="font-serif text-base text-slate-100">Nuevo comité</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Nombre</label>
          <input
            className="input"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {Object.values(CommitteeType).map((t) => (
              <option key={t} value={t}>
                {CommitteeTypeLabel[t]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Descripción</label>
        <input
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Quórum (%)</label>
        <input
          type="number"
          min={1}
          max={100}
          className="input w-32"
          value={quorum}
          onChange={(e) => setQuorum(Number(e.target.value))}
        />
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button disabled={saving} className="btn-primary">
          {saving ? "Creando…" : "Crear"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setOpen(false)}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
