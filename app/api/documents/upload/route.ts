import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCommitteeAccess } from "@/lib/permissions";
import { putObject } from "@/lib/storage";
import { extractPdfText } from "@/lib/extract";
import { log } from "@/lib/audit";
import {
  errorResponse,
  UnauthorizedError,
  HttpError,
} from "@/lib/errors";
import { CommitteeRole } from "@/lib/enums";

export const runtime = "nodejs";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

// Extensiones/MIME permitidos.
const ALLOWED: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const form = await req.formData();
    const committeeId = String(form.get("committeeId") ?? "");
    const sessionId = form.get("sessionId")
      ? String(form.get("sessionId"))
      : null;
    const file = form.get("file");

    if (!committeeId) throw new HttpError(400, "Falta el comité");
    // Validación robusta SIN depender del global `File` (que no existe en
    // algunas versiones/runtimes de Node): basta con que sea un archivo subido
    // (un Blob con `name`, `size` y `arrayBuffer`).
    const isUploadedFile =
      typeof file === "object" &&
      file !== null &&
      typeof (file as { arrayBuffer?: unknown }).arrayBuffer === "function" &&
      typeof (file as { name?: unknown }).name === "string" &&
      typeof (file as { size?: unknown }).size === "number";
    if (!isUploadedFile) throw new HttpError(400, "Falta el archivo");
    const upload = file as unknown as {
      name: string;
      size: number;
      arrayBuffer: () => Promise<ArrayBuffer>;
    };

    // RBAC: solo secretario/presidente (o super_admin) pueden subir.
    await requireCommitteeAccess(
      session.user.id,
      committeeId,
      CommitteeRole.SECRETARY,
    );

    const ext = upload.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED[ext]) {
      throw new HttpError(
        400,
        "Tipo de archivo no permitido. Usa PDF, DOCX, XLSX o PPTX.",
      );
    }
    if (upload.size > MAX_SIZE) {
      throw new HttpError(400, "El archivo supera el máximo de 50 MB.");
    }

    const buffer = Buffer.from(await upload.arrayBuffer());
    const fileKey = `${randomUUID()}.${ext}`;
    await putObject(fileKey, buffer);

    // Extraer texto (solo PDF) para la búsqueda semántica.
    let extractedText: string | null = null;
    if (ext === "pdf") {
      extractedText = await extractPdfText(buffer);
    }

    const document = await prisma.document.create({
      data: {
        committeeId,
        sessionId,
        name: upload.name,
        fileKey,
        mimeType: ALLOWED[ext],
        sizeBytes: file.size,
        uploadedBy: session.user.id,
        extractedText,
      },
    });

    await log({
      userId: session.user.id,
      userName: session.user.name ?? "",
      action: "document.upload",
      resourceType: "document",
      resourceId: document.id,
      metadata: { name: upload.name, committeeId },
      request: req,
    });

    return NextResponse.json({ id: document.id, name: document.name });
  } catch (err) {
    return errorResponse(err);
  }
}
