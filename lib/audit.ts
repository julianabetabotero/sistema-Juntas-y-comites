import { prisma } from "@/lib/prisma";

// Helper central para escribir en el log de auditoría inmutable.
// Los registros de AuditLog NUNCA se actualizan ni eliminan (no hay endpoints
// de UPDATE/DELETE). Ver checklist de seguridad en la spec.

type AuditParams = {
  userId: string;
  userName: string;
  action: string; // formato "recurso.accion" ej: "document.view"
  resourceId?: string;
  resourceType?: string; // "document" | "session" | "vote" | "user" | ...
  metadata?: Record<string, unknown>;
  request?: Request; // para extraer IP y user agent
};

function extractIp(request?: Request): string | undefined {
  if (!request) return undefined;
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? undefined;
}

export async function log(params: AuditParams): Promise<void> {
  const { userId, userName, action, resourceId, resourceType, metadata, request } =
    params;

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userName,
        action,
        resourceId,
        resourceType,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ipAddress: extractIp(request),
        userAgent: request?.headers.get("user-agent") ?? undefined,
      },
    });
  } catch (err) {
    // Nunca dejar que un fallo de auditoría tumbe la operación principal,
    // pero sí dejar rastro en consola del servidor.
    console.error("[audit] no se pudo escribir el registro:", err);
  }
}
