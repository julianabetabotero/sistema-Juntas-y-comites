import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewAudit } from "@/lib/audit-access";
import { errorResponse, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (!(await canViewAudit(session.user.id))) throw new ForbiddenError();

    const url = new URL(req.url);
    const where: Prisma.AuditLogWhereInput = {};
    const action = url.searchParams.get("action");
    const user = url.searchParams.get("user");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (action) where.action = { contains: action };
    if (user) where.userName = { contains: user };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to + "T23:59:59");
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const header = [
      "fecha",
      "usuario",
      "accion",
      "tipo_recurso",
      "id_recurso",
      "ip",
      "metadata",
    ];
    const rows = logs.map((l) =>
      [
        l.createdAt.toISOString(),
        l.userName,
        l.action,
        l.resourceType ?? "",
        l.resourceId ?? "",
        l.ipAddress ?? "",
        l.metadata ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
    const csv = "﻿" + [header.map(csvCell).join(","), ...rows].join("\r\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="auditoria-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
