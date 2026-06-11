// Ajusta el `provider` del datasource en prisma/schema.prisma según el entorno.
//   - Local (por defecto):            DATABASE_PROVIDER no definido → "sqlite"
//   - Producción (Railway/Postgres):  DATABASE_PROVIDER=postgresql   → "postgresql"
//
// Así mantenemos UN solo schema y el desarrollo local sigue con SQLite (cero
// instalación) mientras producción usa PostgreSQL. Se ejecuta antes de
// `prisma generate` / `prisma db push` (ver scripts de package.json).

import { readFileSync, writeFileSync } from "fs";

const provider = (process.env.DATABASE_PROVIDER || "sqlite").trim();
const allowed = ["sqlite", "postgresql"];
if (!allowed.includes(provider)) {
  console.error(
    `[db-provider] DATABASE_PROVIDER inválido: "${provider}". Usa "sqlite" o "postgresql".`,
  );
  process.exit(1);
}

const schemaPath = new URL("../prisma/schema.prisma", import.meta.url);
let schema = readFileSync(schemaPath, "utf8");

// Solo cambia la línea del datasource (provider = "sqlite" | "postgresql"),
// nunca la del generator (provider = "prisma-client-js").
const re = /provider\s*=\s*"(sqlite|postgresql)"/;
if (!re.test(schema)) {
  console.error("[db-provider] No se encontró el provider del datasource en schema.prisma");
  process.exit(1);
}
schema = schema.replace(re, `provider = "${provider}"`);
writeFileSync(schemaPath, schema);
console.log(`[db-provider] datasource provider = ${provider}`);
