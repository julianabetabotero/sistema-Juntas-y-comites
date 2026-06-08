"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import clsx from "clsx";

export default function MinutesEditor({
  sessionId,
  initialContent,
  status,
  canEdit,
  canApprove,
  approvedBy,
  approvedAt,
  aiSummary,
}: {
  sessionId: string;
  initialContent: string;
  status: string | null; // null = aún no existe acta
  canEdit: boolean;
  canApprove: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
  aiSummary?: string | null;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isApproved = status === "APPROVED";
  const editable = canEdit && !isApproved;

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[320px] rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm text-slate-100 focus:outline-none [&_h1]:text-xl [&_h1]:font-serif [&_h2]:text-lg [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2",
      },
    },
  });

  async function save() {
    if (!editor) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/minutes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editor.getHTML() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      setMsg("Guardado.");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function summarizeAI() {
    setBusy(true);
    setMsg("Generando resumen con IA…");
    try {
      // Guardar primero para resumir el contenido más reciente.
      if (editable && editor) await save();
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setMsg(null);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(action: "submit" | "approve") {
    setBusy(true);
    setMsg(null);
    try {
      // Guardar antes de cambiar de estado.
      if (action === "submit" && editor) await save();
      const res = await fetch(`/api/sessions/${sessionId}/minutes/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const Btn = ({
    cmd,
    label,
  }: {
    cmd: () => void;
    label: string;
  }) => (
    <button
      type="button"
      onClick={cmd}
      className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {isApproved && (
        <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-300">
          Acta aprobada{approvedBy ? ` por ${approvedBy}` : ""}
          {approvedAt
            ? ` el ${new Date(approvedAt).toLocaleString("es-CO")}`
            : ""}
          . Ya no puede editarse.
        </div>
      )}

      {editable && editor && (
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1">
          <Btn cmd={() => editor.chain().focus().toggleBold().run()} label="B" />
          <Btn
            cmd={() => editor.chain().focus().toggleItalic().run()}
            label="i"
          />
          <Btn
            cmd={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            label="H2"
          />
          <Btn
            cmd={() => editor.chain().focus().toggleBulletList().run()}
            label="• Lista"
          />
          <Btn
            cmd={() => editor.chain().focus().toggleOrderedList().run()}
            label="1. Lista"
          />
        </div>
      )}

      <EditorContent editor={editor} />

      {aiSummary && (
        <div className="card p-4">
          <p className="mb-1 text-xs uppercase tracking-wide text-gold">
            Resumen IA
          </p>
          <p className="whitespace-pre-line text-sm text-slate-300">
            {aiSummary}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {editable && (
          <button onClick={save} disabled={busy} className="btn-primary">
            {busy ? "…" : "Guardar"}
          </button>
        )}
        {editable && status === "DRAFT" && (
          <button
            onClick={() => changeStatus("submit")}
            disabled={busy}
            className="btn-secondary"
          >
            Enviar a revisión
          </button>
        )}
        {canApprove && status === "UNDER_REVIEW" && (
          <button
            onClick={() => changeStatus("approve")}
            disabled={busy}
            className="btn-primary"
          >
            Aprobar acta
          </button>
        )}
        <button
          type="button"
          onClick={summarizeAI}
          disabled={busy}
          className={clsx("btn-ghost", !editable && "hidden")}
        >
          Generar resumen con IA
        </button>
        {msg && <span className="text-xs text-slate-400">{msg}</span>}
      </div>
    </div>
  );
}
