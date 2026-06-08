import { prisma } from "@/lib/prisma";
import { GlobalRole } from "@/lib/enums";

export type UserCommittee = {
  id: string;
  name: string;
  type: string;
  role: string | null; // null = acceso por SUPER_ADMIN sin membresía explícita
};

// Devuelve los comités visibles para el usuario (con su rol en cada uno).
export async function getUserCommittees(
  userId: string,
): Promise<UserCommittee[]> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return [];

  if (user.role === GlobalRole.SUPER_ADMIN) {
    const all = await prisma.committee.findMany({
      orderBy: { createdAt: "asc" },
    });
    // Para super_admin mostramos su rol explícito si existe, si no null.
    const memberships = await prisma.membership.findMany({
      where: { userId },
    });
    const roleByCommittee = new Map(
      memberships.map((m) => [m.committeeId, m.role]),
    );
    return all.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      role: roleByCommittee.get(c.id) ?? null,
    }));
  }

  const memberships = await prisma.membership.findMany({
    where: { userId, isActive: true },
    include: { committee: true },
    orderBy: { joinedAt: "asc" },
  });

  return memberships.map((m) => ({
    id: m.committee.id,
    name: m.committee.name,
    type: m.committee.type,
    role: m.role,
  }));
}
