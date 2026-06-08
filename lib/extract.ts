// Extracción de texto de PDFs para la búsqueda semántica.
// Importamos el archivo interno de pdf-parse para evitar el código de prueba
// que su index.js ejecuta al cargarse.

const MAX_CHARS = 10_000;

export async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    // @ts-expect-error: el subpath no trae tipos pero funciona.
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const data = await pdfParse(buffer);
    const text = (data.text ?? "").replace(/\s+/g, " ").trim();
    return text.slice(0, MAX_CHARS);
  } catch (err) {
    console.error("[extract] no se pudo extraer texto del PDF:", err);
    return null;
  }
}
