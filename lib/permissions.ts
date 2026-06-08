import { prisma } from "@/lib/prisma";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import {
  CommitteeRole,
  CommitteeRoleRank,
  GlobalRole,
} from "@/lib/enums";
import type { Membership, Document } from "@prisma/client";

// ────────────────────────────────────────────────────────────────────────────
// REGLA DE ORO: toda API route que devuelva datos de un comité DEBE llamar a
// requireCommitteeAccess antes de cualquier query. Nunca confiar en params del
// cliente. Un usuario solo ve los comités a los que pertenece (salvo SUPER_ADMIN).
// ────────────────────────────────────────────────────────────────────────────

// Membership "virtual" para SUPER_ADMIN, que tiene acceso a todos los comités
// aunque no tenga fila en Membership.
function superAdminMembership(userId: string, committeeId: string): Membership {
  return {
    id: `virtual-${committeeId}`,
    userId,
    committeeId,
    role: CommitteeRole.PRESIDENT,
    joinedAt: new Date(),
    leftAt: null,
    isActive: true,
  };
}

/**
 * Verifica que el usuario pertenece al comité y, opcionalmente, que tiene el
 * rol mínimo requerido. Devuelve el Membership (o uno virtual para SUPER_ADMIN).
 * Lanza ForbiddenError si no cumple.
 */
export async function requireCommitteeAccess(
  userId: string,
  committeeId: string,
  minRole?: CommitteeRole,
): Promise<Membership> {
  if (!userId) throw new UnauthorizedError();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError("Usuario no encontrado");

  if (user.role === GlobalRole.SUPER_ADMIN) {
    return superAdminMembership(userId, committeeId);
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_committeeId: { userId, committeeId } },
  });

  if (!membership || !membership.isActive) {
    throw new ForbiddenError("No perteneces a este cuerpo colegiado");
  }

  if (minRole) {
    const required = CommitteeRoleRank[minRole];
    const actual = CommitteeRoleRank[membership.role as CommitteeRole] ?? 0;
    if (actual < required) {
      throw new ForbiddenError("No tienes el rol necesario para esta acción");
    }
  }

  return membership;
}

/**
 * Verifica acceso a un documento específico: el documento existe y el usuario
 * pertenece al comité dueño del documento.
 */
export async function requireDocumentAccess(
  userId: string,
  documentId: string,
): Promise<{ document: Document; membership: Membership }> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });
  if (!document) throw new NotFoundError("Documento no encontrado");

  const membership = await requireCommitteeAccess(userId, document.committeeId);
  return { document, membership };
}

/** ¿El usuario puede subir documentos / administrar el comité? */
export function canManageCommittee(role: string): boolean {
  return (
    role === CommitteeRole.PRESIDENT || role === CommitteeRole.SECRETARY
  );
}

/** Lista de IDs de comités activos del usuario (para la sesión/sidebar). */
export async function getUserCommitteeIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return [];

  if (user.role === GlobalRole.SUPER_ADMIN) {
    const all = await prisma.committee.findMany({ select: { id: true } });
    return all.map((c) => c.id);
  }

  const memberships = await prisma.membership.findMany({
    where: { userId, isActive: true },
    select: { committeeId: true },
  });
  return memberships.map((m) => m.committeeId);
}
