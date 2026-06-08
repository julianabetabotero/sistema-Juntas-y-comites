"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";

type Result = {
  documentId: string;
  name: string;
  relevance: "alta" | "media" | "baja";
  reason: string;
};

const RELEVANCE_STYLE: Record<string, string> = {
  alta: "bg-emerald-950 text-emerald-300",
  media: "bg-amber-950 text-amber-300",
  baja: "bg-slate-800 text-slate-400",
};

export default function SemanticSearch({ committeeId }: { committeeId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setMessage(null);
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, committeeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error en la búsqueda");
      setResults(data.results ?? []);
      if (data.message) setMessage(data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-4 p-5">
      <div>
        <h2 className="font-serif text-base text-slate-100">
          Búsqueda semántica (IA)
        </h2>
        <p className="text-xs text-slate-500">
          Pregunta en lenguaje natural sobre los documentos del comité.
        </p>
      </div>

      <form onSubmit={search} className="flex gap-2">
        <input
          className="input"
          placeholder="¿Qué se decidió sobre el presupuesto?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button disabled={loading} className="btn-primary whitespace-nowrap">
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {error && <p className="text-sm text-red-300">{error}</p>}
      {message && <p className="text-sm text-slate-400">{message}</p>}

      {results && results.length === 0 && !message && (
        <p className="text-sm text-slate-400">
          No se encontraron documentos relevantes.
        </p>
      )}

      {results && results.length > 0 && (
        <div className="divide-y divide-slate-800">
          {results.map((r) => (
            <Link
              key={r.documentId}
              href={`/committees/${committeeId}/documents/${r.documentId}/view`}
              className="block py-3 hover:bg-slate-800/30"
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-100">{r.name}</span>
                <span
                  className={clsx(
                    "badge",
                    RELEVANCE_STYLE[r.relevance] ?? "bg-slate-800 text-slate-400",
                  )}
                >
                  {r.relevance}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{r.reason}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
