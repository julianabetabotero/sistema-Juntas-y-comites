import { prisma } from "@/lib/prisma";
import { requireCommitteeAccess } from "@/lib/permissions";
import { NotFoundError } from "@/lib/errors";
import { CommitteeRole } from "@/lib/enums";
import type { Membership, Session } from "@prisma/client";

// Verifica que el usuario tiene acceso a la sesión (vía su comité) y devuelve
// la sesión + el membership. minRole opcional (p.ej. SECRETARY para gestionar).
export async function requireSessionAccess(
  userId: string,
  sessionId: string,
  minRole?: CommitteeRole,
): Promise<{ session: Session; membership: Membership }> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) throw new NotFoundError("Sesión no encontrada");

  const membership = await requireCommitteeAccess(
    userId,
    session.committeeId,
    minRole,
  );
  return { session, membership };
}
