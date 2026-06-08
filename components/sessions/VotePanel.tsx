"use client";

import { useCallback, useEffect, useState } from "react";
import { VoteValueLabel, type VoteValue } from "@/lib/enums";

type VoteState = {
  id: string;
  question: string;
  status: string;
  castCount: number;
  youVoted: boolean;
  yourValue: string | null;
  results: {
    counts: { YES: number; NO: number; ABSTAIN: number };
    responses: { userName: string; value: string }[];
  } | null;
};

export default function VotePanel({
  voteIds,
  canManage,
  canVote,
}: {
  voteIds: string[];
  canManage: boolean;
  canVote: boolean;
}) {
  const [votes, setVotes] = useState<Record<string, VoteState>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const results = await Promise.all(
      voteIds.map((id) =>
        fetch(`/api/votes/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    );
    const map: Record<string, VoteState> = {};
    for (const v of results) if (v) map[v.id] = v;
    setVotes(map);
  }, [voteIds]);

  useEffect(() => {
    refresh();
    // Polling cada 5s mientras haya votaciones abiertas.
    const interval = setInterval(() => {
      setVotes((cur) => {
        const anyOpen = Object.values(cur).some((v) => v.status === "OPEN");
        if (anyOpen) refresh();
        return cur;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function cast(id: string, value: VoteValue) {
    setBusy(id);
    await fetch(`/api/votes/${id}/cast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    await refresh();
    setBusy(null);
  }

  async function close(id: string) {
    setBusy(id);
    await fetch(`/api/votes/${id}/close`, { method: "POST" });
    await refresh();
    setBusy(null);
  }

  if (voteIds.length === 0) {
    return (
      <div className="card p-5 text-sm text-slate-400">
        Aún no hay votaciones en esta sesión.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {voteIds.map((id) => {
        const v = votes[id];
        if (!v) return null;
        const open = v.status === "OPEN";
        return (
          <div key={id} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <p className="text-slate-100">{v.question}</p>
              <span
                className={`badge ${open ? "bg-emerald-950 text-emerald-300" : "bg-slate-800 text-slate-300"}`}
              >
                {open ? "Abierta" : "Cerrada"}
              </span>
            </div>

            {open ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-slate-500">
                  {v.castCount} voto(s) emitido(s)
                </p>
                {canVote && !v.youVoted && (
                  <div className="flex gap-2">
                    {(["YES", "NO", "ABSTAIN"] as VoteValue[]).map((val) => (
                      <button
                        key={val}
                        disabled={busy === id}
                        onClick={() => cast(id, val)}
                        className="btn-secondary"
                      >
                        {VoteValueLabel[val]}
                      </button>
                    ))}
                  </div>
                )}
                {v.youVoted && (
                  <p className="text-sm text-gold">
                    Ya votaste: {VoteValueLabel[v.yourValue as VoteValue]}
                  </p>
                )}
                {!canVote && (
                  <p className="text-xs text-slate-500">
                    Tu rol no permite votar.
                  </p>
                )}
                {canManage && (
                  <button
                    disabled={busy === id}
                    onClick={() => close(id)}
                    className="btn-ghost mt-2"
                  >
                    Cerrar votación
                  </button>
                )}
              </div>
            ) : (
              v.results && (
                <div className="mt-4 space-y-3">
                  <div className="flex gap-4 text-sm">
                    <span className="text-emerald-400">
                      Sí: {v.results.counts.YES}
                    </span>
                    <span className="text-red-400">
                      No: {v.results.counts.NO}
                    </span>
                    <span className="text-slate-400">
                      Abstención: {v.results.counts.ABSTAIN}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-800 border-t border-slate-800 pt-2">
                    {v.results.responses.map((r, i) => (
                      <div
                        key={i}
                        className="flex justify-between py-1 text-sm"
                      >
                        <span className="text-slate-300">{r.userName}</span>
                        <span className="text-slate-400">
                          {VoteValueLabel[r.value as VoteValue]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
