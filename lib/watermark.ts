import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

// Superpone una marca de agua diagonal repetida en cuadrícula sobre cada página
// de un PDF. El original nunca se modifica en disco: trabajamos en memoria.
//
// text esperado: "{nombre} — {DD/MM/YYYY} {HH:MM:SS} — CONFIDENCIAL"

export async function applyWatermark(
  pdfBytes: Buffer | Uint8Array,
  text: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 16;

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    const stepX = 320;
    const stepY = 160;

    // Recorremos una cuadrícula y dibujamos el texto rotado 45°.
    for (let y = -height; y < height * 2; y += stepY) {
      for (let x = -width; x < width * 2; x += stepX) {
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.5, 0.5, 0.5),
          opacity: 0.15,
          rotate: degrees(45),
        });
      }
    }
  }

  return pdfDoc.save();
}

// Genera un PDF de una página con un mensaje (fallback cuando no se puede
// convertir un documento de Office a PDF).
export async function buildInfoPdf(message: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(message, {
    x: 50,
    y: 770,
    size: 13,
    font,
    color: rgb(0.25, 0.25, 0.25),
    maxWidth: 495,
    lineHeight: 18,
  });
  return doc.save();
}

// Construye el texto de marca de agua para un usuario en el momento de abrir.
export function buildWatermarkText(userName: string, date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${userName} — ${dd}/${mm}/${yyyy} ${hh}:${min}:${ss} — CONFIDENCIAL`;
}
