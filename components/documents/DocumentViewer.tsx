"use client";

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Worker de pdf.js servido desde CDN, versión exactamente igual a la del paquete.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = {
  documentId: string;
  watermarkText: string;
};

export default function DocumentViewer({ documentId, watermarkText }: Props) {
  const [data, setData] = useState<{ data: Uint8Array } | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents/${documentId}/serve`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        const buf = await r.arrayBuffer();
        if (!cancelled) setData({ data: new Uint8Array(buf) });
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo cargar el documento.");
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (error) {
    return (
      <div className="card p-6 text-sm text-red-300">{error}</div>
    );
  }

  if (!data) {
    return (
      <div className="card flex h-96 items-center justify-center text-sm text-slate-400">
        Cargando documento…
      </div>
    );
  }

  return (
    <div
      className="relative select-none overflow-auto rounded-xl border border-slate-800 bg-slate-800/40 p-4"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Capa CSS de marca de agua (defensa en profundidad sobre el viewer) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-[0.12]"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 120px)`,
        }}
      >
        <div className="flex h-full w-full flex-wrap content-start gap-x-16 gap-y-20 p-8">
          {Array.from({ length: 60 }).map((_, i) => (
            <span
              key={i}
              className="whitespace-nowrap text-xs font-semibold text-slate-200"
              style={{ transform: "rotate(-45deg)" }}
            >
              {watermarkText}
            </span>
          ))}
        </div>
      </div>

      <Document
        file={data}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        loading={
          <div className="py-12 text-center text-sm text-slate-400">
            Procesando…
          </div>
        }
        error={
          <div className="py-12 text-center text-sm text-red-300">
            No se pudo renderizar el PDF.
          </div>
        }
      >
        {Array.from({ length: numPages }).map((_, i) => (
          <div key={i} className="mb-4 flex justify-center">
            <Page
              pageNumber={i + 1}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              width={760}
              className="shadow-panel"
            />
          </div>
        ))}
      </Document>
    </div>
  );
}
