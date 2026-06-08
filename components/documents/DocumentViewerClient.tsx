"use client";

import dynamic from "next/dynamic";

// Carga el visor solo en cliente (react-pdf depende de APIs del navegador).
const DocumentViewer = dynamic(() => import("./DocumentViewer"), {
  ssr: false,
  loading: () => (
    <div className="card flex h-96 items-center justify-center text-sm text-slate-400">
      Cargando visor…
    </div>
  ),
});

export default function DocumentViewerClient(props: {
  documentId: string;
  watermarkText: string;
}) {
  return <DocumentViewer {...props} />;
}
