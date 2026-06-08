import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Contraseña demo para TODOS los usuarios sembrados.
const DEMO_PASSWORD = "Demo1234!";

async function main() {
  console.log("🌱 Sembrando base de datos...");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // ── Usuarios ──────────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@empresa.com" },
    update: {},
    create: {
      email: "superadmin@empresa.com",
      name: "Super Administrador",
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  const presidente = await prisma.user.upsert({
    where: { email: "presidente@empresa.com" },
    update: {},
    create: {
      email: "presidente@empresa.com",
      name: "Ana Presidenta",
      passwordHash,
      role: "MEMBER",
    },
  });

  const secretario = await prisma.user.upsert({
    where: { email: "secretario@empresa.com" },
    update: {},
    create: {
      email: "secretario@empresa.com",
      name: "Carlos Secretario",
      passwordHash,
      role: "MEMBER",
    },
  });

  const miembro = await prisma.user.upsert({
    where: { email: "miembro@empresa.com" },
    update: {},
    create: {
      email: "miembro@empresa.com",
      name: "María Miembro",
      passwordHash,
      role: "MEMBER",
    },
  });

  const auditor = await prisma.user.upsert({
    where: { email: "auditor@empresa.com" },
    update: {},
    create: {
      email: "auditor@empresa.com",
      name: "Pedro Auditor",
      passwordHash,
      role: "MEMBER",
    },
  });

  // ── Comités ───────────────────────────────────────────────
  const junta = await prisma.committee.upsert({
    where: { id: "seed-junta-directiva" },
    update: {},
    create: {
      id: "seed-junta-directiva",
      name: "Junta Directiva",
      description: "Órgano máximo de dirección de la compañía.",
      type: "BOARD_OF_DIRECTORS",
      quorumPercentage: 60,
    },
  });

  const comiteAuditoria = await prisma.committee.upsert({
    where: { id: "seed-comite-auditoria" },
    update: {},
    create: {
      id: "seed-comite-auditoria",
      name: "Comité de Auditoría",
      description: "Supervisa controles internos y riesgos.",
      type: "COMMITTEE",
      quorumPercentage: 50,
    },
  });

  // ── Membresías ────────────────────────────────────────────
  const memberships: Array<{
    userId: string;
    committeeId: string;
    role: string;
  }> = [
    { userId: presidente.id, committeeId: junta.id, role: "PRESIDENT" },
    { userId: secretario.id, committeeId: junta.id, role: "SECRETARY" },
    { userId: miembro.id, committeeId: junta.id, role: "MEMBER" },
    { userId: auditor.id, committeeId: junta.id, role: "AUDITOR" },
    // El miembro NO pertenece al comité de auditoría (para probar el RBAC).
    { userId: presidente.id, committeeId: comiteAuditoria.id, role: "MEMBER" },
    { userId: secretario.id, committeeId: comiteAuditoria.id, role: "SECRETARY" },
    { userId: auditor.id, committeeId: comiteAuditoria.id, role: "AUDITOR" },
  ];

  for (const m of memberships) {
    await prisma.membership.upsert({
      where: {
        userId_committeeId: { userId: m.userId, committeeId: m.committeeId },
      },
      update: { role: m.role, isActive: true },
      create: { ...m, isActive: true },
    });
  }

  console.log("✅ Seed completado.\n");
  console.log("Usuarios de prueba (contraseña para todos: " + DEMO_PASSWORD + "):");
  console.log("  • superadmin@empresa.com   (SUPER_ADMIN)");
  console.log("  • presidente@empresa.com   (Presidente Junta)");
  console.log("  • secretario@empresa.com   (Secretario)");
  console.log("  • miembro@empresa.com      (Miembro solo Junta)");
  console.log("  • auditor@empresa.com      (Auditor)");
  console.log("\nEn el primer login cada usuario configurará su 2FA.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
