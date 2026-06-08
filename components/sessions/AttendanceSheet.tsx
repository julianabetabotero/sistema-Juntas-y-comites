"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

type Row = { userId: string; userName: string; status: string };

const OPTIONS = [
  { value: "CONFIRMED", label: "Presente", color: "text-emerald-400" },
  { value: "ABSENT", label: "Ausente", color: "text-red-400" },
  { value: "EXCUSED", label: "Excusado", color: "text-amber-400" },
];

const STATUS_LABEL: Record<string, string> = {
  INVITED: "Invitado",
  CONFIRMED: "Presente",
  ABSENT: "Ausente",
  EXCUSED: "Excusado",
};

export default function AttendanceSheet({
  sessionId,
  rows,
  canManage,
  quorumPercentage,
  totalMembers,
}: {
  sessionId: string;
  rows: Row[];
  canManage: boolean;
  quorumPercentage: number;
  totalMembers: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const confirmed = rows.filter((r) => r.status === "CONFIRMED").length;
  const needed = Math.ceil((totalMembers * quorumPercentage) / 100);
  const quorumOk = confirmed >= needed;

  async function setStatus(userId: string, status: string) {
    setPending(userId);
    try {
      await fetch(`/api/sessions/${sessionId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status }),
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={clsx(
          "rounded-lg border px-4 py-2 text-sm",
          quorumOk
            ? "border-emerald-900/50 bg-emerald-950/30 text-emerald-300"
            : "border-amber-900/50 bg-amber-950/30 text-amber-300",
        )}
      >
        Quórum: {confirmed} de {needed} requeridos ({quorumPercentage}% de{" "}
        {totalMembers}) —{" "}
        {quorumOk ? "alcanzado ✓" : "no alcanzado"}
      </div>

      <div className="card divide-y divide-slate-800">
        {rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-400">
            La asistencia se genera al convocar la sesión.
          </p>
        ) : (
          rows.map((r) => (
            <div
              key={r.userId}
              className="flex items-center justify-between px-5 py-3"
            >
              <span className="text-sm text-slate-200">{r.userName}</span>
              {canManage ? (
                <div className="flex gap-1">
                  {OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      disabled={pending === r.userId}
                      onClick={() => setStatus(r.userId, o.value)}
                      className={clsx(
                        "rounded px-2 py-1 text-xs",
                        r.status === o.value
                          ? "bg-slate-700 text-slate-100"
                          : "text-slate-400 hover:bg-slate-800",
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400">
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
