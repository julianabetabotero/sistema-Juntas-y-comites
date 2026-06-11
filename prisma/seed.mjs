// Seed idempotente (usa upsert): seguro de ejecutar en cada despliegue.
// En JavaScript puro para correr en producción sin tsx/devDependencies.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEMO_PASSWORD = process.env.SEED_PASSWORD || "Demo1234!";

async function main() {
  console.log("🌱 Sembrando base de datos…");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const users = [
    { email: "superadmin@empresa.com", name: "Super Administrador", role: "SUPER_ADMIN" },
    { email: "presidente@empresa.com", name: "Ana Presidenta", role: "MEMBER" },
    { email: "secretario@empresa.com", name: "Carlos Secretario", role: "MEMBER" },
    { email: "miembro@empresa.com", name: "María Miembro", role: "MEMBER" },
    { email: "auditor@empresa.com", name: "Pedro Auditor", role: "MEMBER" },
  ];

  const created = {};
  for (const u of users) {
    created[u.email] = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, name: u.name, passwordHash, role: u.role },
    });
  }

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

  const memberships = [
    { email: "presidente@empresa.com", committeeId: junta.id, role: "PRESIDENT" },
    { email: "secretario@empresa.com", committeeId: junta.id, role: "SECRETARY" },
    { email: "miembro@empresa.com", committeeId: junta.id, role: "MEMBER" },
    { email: "auditor@empresa.com", committeeId: junta.id, role: "AUDITOR" },
    { email: "presidente@empresa.com", committeeId: comiteAuditoria.id, role: "MEMBER" },
    { email: "secretario@empresa.com", committeeId: comiteAuditoria.id, role: "SECRETARY" },
    { email: "auditor@empresa.com", committeeId: comiteAuditoria.id, role: "AUDITOR" },
  ];

  for (const m of memberships) {
    const userId = created[m.email].id;
    await prisma.membership.upsert({
      where: { userId_committeeId: { userId, committeeId: m.committeeId } },
      update: { role: m.role, isActive: true },
      create: { userId, committeeId: m.committeeId, role: m.role, isActive: true },
    });
  }

  console.log(`✅ Seed completado. Contraseña demo: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
