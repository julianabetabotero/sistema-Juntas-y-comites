import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserCommittees } from "@/lib/committees";
import { CommitteeRole, GlobalRole } from "@/lib/enums";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.totpEnabled) redirect("/setup-2fa");

  const committees = await getUserCommittees(session.user.id);
  const isSuperAdmin = session.user.role === GlobalRole.SUPER_ADMIN;

  // Puede ver auditoría: super_admin, o quien sea Presidente/Auditor en algún comité.
  const canSeeAudit =
    isSuperAdmin ||
    committees.some(
      (c) =>
        c.role === CommitteeRole.PRESIDENT || c.role === CommitteeRole.AUDITOR,
    );

  return (
    <div className="flex min-h-screen">
      <Sidebar
        committees={committees}
        user={{
          name: session.user.name ?? "",
          email: session.user.email ?? "",
          role: session.user.role,
        }}
        canSeeAudit={canSeeAudit}
        isSuperAdmin={isSuperAdmin}
      />
      <main className="flex-1 overflow-y-auto bg-slate-950">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
