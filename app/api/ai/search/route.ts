import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCommitteeAccess } from "@/lib/permissions";
import { searchDocuments } from "@/lib/ai";
import { log } from "@/lib/audit";
import { errorResponse, UnauthorizedError, HttpError } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  query: z.string().min(2).max(500),
  committeeId: z.string().min(1),
});

// Búsqueda semántica sobre los documentos del comité. Cualquier miembro activo.
export async function POST(req: Request) {
  try {
    const auser = await auth();
    if (!auser?.user) throw new UnauthorizedError();

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, "Datos inválidos");

    await requireCommitteeAccess(auser.user.id, parsed.data.committeeId);

    // Últimos 20 documentos con texto extraído.
    const documents = await prisma.document.findMany({
      where: {
        committeeId: parsed.data.committeeId,
        extractedText: { not: null },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, name: true, extractedText: true },
    });

    if (documents.length === 0) {
      return NextResponse.json({
        results: [],
        message:
          "No hay documentos con texto indexado en este comité (solo se indexan PDFs al subirlos).",
      });
    }

    const excerpts = documents
      .map(
        (d) =>
          `--- Documento ${d.id} (${d.name}) ---\n${(d.extractedText ?? "").slice(0, 1500)}`,
      )
      .join("\n\n");

    const aiResults = await searchDocuments(parsed.data.query, excerpts);

    // Enriquecer con el nombre del documento y descartar IDs inventados.
    const byId = new Map(documents.map((d) => [d.id, d.name]));
    const results = aiResults
      .filter((r) => byId.has(r.documentId))
      .map((r) => ({
        documentId: r.documentId,
        name: byId.get(r.documentId)!,
        relevance: r.relevance,
        reason: r.reason,
      }));

    await log({
      userId: auser.user.id,
      userName: auser.user.name ?? "",
      action: "ai.search",
      resourceType: "committee",
      resourceId: parsed.data.committeeId,
      metadata: { query: parsed.data.query },
      request: req,
    });

    return NextResponse.json({ results });
  } catch (err) {
    return errorResponse(err);
  }
}
