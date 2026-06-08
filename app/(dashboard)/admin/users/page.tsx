import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GlobalRole } from "@/lib/enums";
import AccessDenied from "@/components/AccessDenied";
import NewUserForm from "@/components/admin/NewUserForm";

export default async function AdminUsersPage() {
  const session = await auth();
  if (session!.user.role !== GlobalRole.SUPER_ADMIN) {
    return <AccessDenied message="Solo el super administrador puede ver esta sección." />;
  }

  const users = await prisma.user.findMany({
    include: { _count: { select: { memberships: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl text-slate-100">Usuarios</h1>
          <p className="mt-1 text-sm text-slate-500">{users.length} usuario(s).</p>
        </div>
        <NewUserForm />
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rol global</th>
              <th className="px-4 py-3">2FA</th>
              <th className="px-4 py-3">Comités</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-200">{u.name}</td>
                <td className="px-4 py-3 text-slate-400">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="badge bg-slate-800 text-slate-300">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.totpEnabled ? (
                    <span className="text-emerald-400">Activo</span>
                  ) : (
                    <span className="text-slate-500">Pendiente</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {u._count.memberships}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
