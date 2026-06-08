import fs from "fs/promises";
import path from "path";

// Abstracción de almacenamiento de archivos.
// STORAGE_TYPE = "local" (desarrollo) | "s3" (producción).
//
// Para S3 se requiere instalar @aws-sdk/client-s3 y configurar las variables
// AWS_* del .env. Aquí dejamos el local 100% funcional y el S3 documentado.

const STORAGE_TYPE = process.env.STORAGE_TYPE ?? "local";
const LOCAL_PATH = process.env.LOCAL_STORAGE_PATH ?? "./uploads";

function localFilePath(key: string): string {
  // Evita path traversal: solo el nombre base.
  const safe = path.basename(key);
  return path.join(process.cwd(), LOCAL_PATH, safe);
}

export async function putObject(key: string, data: Buffer): Promise<void> {
  if (STORAGE_TYPE === "s3") {
    throw new Error(
      "STORAGE_TYPE=s3 requiere instalar @aws-sdk/client-s3 y configurar lib/storage.ts (ver README).",
    );
  }
  const filePath = localFilePath(key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
}

export async function getObject(key: string): Promise<Buffer> {
  if (STORAGE_TYPE === "s3") {
    throw new Error(
      "STORAGE_TYPE=s3 requiere instalar @aws-sdk/client-s3 y configurar lib/storage.ts (ver README).",
    );
  }
  const filePath = localFilePath(key);
  return fs.readFile(filePath);
}

export async function deleteObject(key: string): Promise<void> {
  if (STORAGE_TYPE === "s3") return; // implementar para S3 si se usa
  try {
    await fs.unlink(localFilePath(key));
  } catch {
    // ignorar si no existe
  }
}
