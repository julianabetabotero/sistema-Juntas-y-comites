"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommitteeRole,
  CommitteeRoleLabel,
  type CommitteeRole as Role,
} from "@/lib/enums";

type Member = { userId: string; name: string; role: string };
type User = { id: string; name: string; email: string };

export default function MembershipManager({
  committeeId,
  members,
  allUsers,
}: {
  committeeId: string;
  members: Member[];
  allUsers: User[];
}) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<string>(CommitteeRole.MEMBER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberIds = new Set(members.map((m) => m.userId));
  const candidates = allUsers.filter((u) => !memberIds.has(u.id));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, committeeId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setUserId("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(uid: string) {
    setBusy(true);
    try {
      await fetch("/api/admin/memberships", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, committeeId }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card divide-y divide-slate-800">
        {members.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-400">Sin miembros activos.</p>
        ) : (
          members.map((m) => (
            <div
              key={m.userId}
              className="flex items-center justify-between px-5 py-3"
            >
              <div>
                <span className="text-sm text-slate-200">{m.name}</span>
                <span className="ml-3 badge bg-slate-800 text-slate-300">
                  {CommitteeRoleLabel[m.role as Role] ?? m.role}
                </span>
              </div>
              <button
                disabled={busy}
                onClick={() => remove(m.userId)}
                className="btn-ghost text-red-300"
              >
                Quitar
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={add} className="card flex flex-wrap items-end gap-3 p-5">
        <div className="flex-1">
          <label className="label">Agregar miembro</label>
          <select
            className="input"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          >
            <option value="">Selecciona un usuario…</option>
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Rol</label>
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {Object.values(CommitteeRole).map((r) => (
              <option key={r} value={r}>
                {CommitteeRoleLabel[r]}
              </option>
            ))}
          </select>
        </div>
        <button disabled={busy || !userId} className="btn-primary">
          Agregar
        </button>
        {error && <p className="w-full text-sm text-red-300">{error}</p>}
      </form>
    </div>
  );
}
