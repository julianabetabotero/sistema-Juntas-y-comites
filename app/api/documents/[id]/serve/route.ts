import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireDocumentAccess } from "@/lib/permissions";
import { getObject } from "@/lib/storage";
import { applyWatermark, buildWatermarkText, buildInfoPdf } from "@/lib/watermark";
import { officeToPdf } from "@/lib/convert";
import { log } from "@/lib/audit";
import { errorResponse, UnauthorizedError } from "@/lib/errors";

export const runtime = "nodejs";

// Endpoint crítico de seguridad: entrega el documento con marca de agua dinámica
// (nombre + fecha/hora del usuario actual). El archivo original NUNCA se escribe
// a disco aquí: se descarga y procesa en memoria.
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { document } = await requireDocumentAccess(
      session.user.id,
      params.id,
    );

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    // Registrar acceso (DocumentAccess) + auditoría.
    await prisma.documentAccess.create({
      data: {
        documentId: document.id,
        userId: session.user.id,
        userName: session.user.name ?? "",
        action: "view",
        ipAddress: ip,
      },
    });
    await log({
      userId: session.user.id,
      userName: session.user.name ?? "",
      action: "document.view",
      resourceType: "document",
      resourceId: document.id,
      request: req,
    });

    const original = await getObject(document.fileKey);

    // Solo aplicamos marca de agua a PDFs. DOCX/XLSX/PPTX requieren conversión
    // previa a PDF (LibreOffice headless / CloudConvert) — pendiente fase 2.
    if (document.mimeType === "application/pdf") {
      const watermarkText = buildWatermarkText(session.user.name ?? "Usuario");
      const watermarked = await applyWatermark(original, watermarkText);

      return new NextResponse(Buffer.from(watermarked), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${encodeURIComponent(document.name)}"`,
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
        },
      });
    }

    // Otros formatos (DOCX/XLSX/PPTX): convertir a PDF con LibreOffice y
    // aplicar la marca de agua. Si la conversión no está disponible, se entrega
    // un PDF de aviso (degradación elegante — nunca rompe la app).
    const ext = document.name.split(".").pop()?.toLowerCase() ?? "";
    const watermarkText = buildWatermarkText(session.user.name ?? "Usuario");
    const convertedPdf = await officeToPdf(Buffer.from(original), ext);

    if (convertedPdf) {
      const watermarked = await applyWatermark(
        Buffer.from(convertedPdf),
        watermarkText,
      );
      return new NextResponse(Buffer.from(watermarked), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${encodeURIComponent(document.name)}.pdf"`,
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
        },
      });
    }

    const info = await buildInfoPdf(
      "La vista previa de este documento no está disponible en este entorno. " +
        "El archivo está almacenado y registrado; ábrelo descargándolo desde el sistema de origen.",
    );
    return new NextResponse(Buffer.from(info), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "no-store, private",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
