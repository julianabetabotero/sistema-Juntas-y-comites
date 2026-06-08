"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import clsx from "clsx";
import { CommitteeTypeLabel, type CommitteeType } from "@/lib/enums";
import type { UserCommittee } from "@/lib/committees";

type Props = {
  committees: UserCommittee[];
  user: { name: string; email: string; role: string };
  canSeeAudit: boolean;
  isSuperAdmin: boolean;
};

export default function Sidebar({
  committees,
  user,
  canSeeAudit,
  isSuperAdmin,
}: Props) {
  const pathname = usePathname();

  const linkClass = (active: boolean) =>
    clsx(
      "block rounded-lg px-3 py-2 text-sm transition-colors",
      active
        ? "bg-gold/15 text-gold"
        : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
    );

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900/80">
      <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 bg-slate-900">
          <span className="font-serif text-lg text-gold">G</span>
        </div>
        <div className="leading-tight">
          <p className="font-serif text-sm text-slate-100">Gobernanza</p>
          <p className="text-xs text-slate-500">Corporativa</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          <Link href="/" className={linkClass(pathname === "/")}>
            Inicio
          </Link>
          <Link
            href="/committees"
            className={linkClass(pathname === "/committees")}
          >
            Mis comités
          </Link>
        </div>

        <div>
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cuerpos colegiados
          </p>
          <div className="space-y-1">
            {committees.length === 0 && (
              <p className="px-3 text-xs text-slate-500">
                Sin comités asignados
              </p>
            )}
            {committees.map((c) => {
              const href = `/committees/${c.id}`;
              const active = pathname.startsWith(href);
              return (
                <Link key={c.id} href={href} className={linkClass(active)}>
                  <span className="block truncate">{c.name}</span>
                  <span className="block text-xs text-slate-500">
                    {CommitteeTypeLabel[c.type as CommitteeType] ?? c.type}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {(canSeeAudit || isSuperAdmin) && (
          <div>
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Administración
            </p>
            <div className="space-y-1">
              {canSeeAudit && (
                <Link
                  href="/audit"
                  className={linkClass(pathname.startsWith("/audit"))}
                >
                  Auditoría
                </Link>
              )}
              {isSuperAdmin && (
                <>
                  <Link
                    href="/admin/users"
                    className={linkClass(pathname.startsWith("/admin/users"))}
                  >
                    Usuarios
                  </Link>
                  <Link
                    href="/admin/committees"
                    className={linkClass(
                      pathname.startsWith("/admin/committees"),
                    )}
                  >
                    Comités
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-slate-800 px-3 py-3">
        <div className="px-2 pb-2">
          <p className="truncate text-sm text-slate-200">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-ghost w-full justify-start"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
