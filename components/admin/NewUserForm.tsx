"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlobalRole } from "@/lib/enums";

export default function NewUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(GlobalRole.MEMBER);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setName("");
      setEmail("");
      setPassword("");
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
        Nuevo usuario
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <h2 className="font-serif text-base text-slate-100">Nuevo usuario</h2>
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
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Contraseña temporal (mín. 8)</label>
          <input
            type="text"
            className="input"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Rol global</label>
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value={GlobalRole.MEMBER}>MEMBER</option>
            <option value={GlobalRole.SUPER_ADMIN}>SUPER_ADMIN</option>
          </select>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        El usuario configurará su 2FA en el primer inicio de sesión.
      </p>
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
