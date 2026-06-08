import { prisma } from "@/lib/prisma";
import { CommitteeRole, GlobalRole } from "@/lib/enums";

// ¿El usuario puede ver el log de auditoría?
// super_admin, o quien sea Presidente/Auditor en algún comité.
export async function canViewAudit(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  if (user.role === GlobalRole.SUPER_ADMIN) return true;

  const count = await prisma.membership.count({
    where: {
      userId,
      isActive: true,
      role: { in: [CommitteeRole.PRESIDENT, CommitteeRole.AUDITOR] },
    },
  });
  return count > 0;
}
