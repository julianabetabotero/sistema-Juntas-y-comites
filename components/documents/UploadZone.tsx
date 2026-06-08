"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadZone({ committeeId }: { committeeId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("committeeId", committeeId);
        form.append("file", file);
        const res = await fetch("/api/documents/upload", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Error al subir");
        }
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir el archivo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="card border-dashed p-6">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.xlsx,.pptx"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-slate-300">
          Sube documentos (PDF, DOCX, XLSX, PPTX · máx. 50 MB)
        </p>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="btn-primary"
        >
          {uploading ? "Subiendo…" : "Seleccionar archivos"}
        </button>
        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
}
