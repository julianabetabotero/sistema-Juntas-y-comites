import crypto from "crypto";

// Cifrado simétrico AES-256-GCM para el secreto TOTP.
// La clave se deriva de NEXTAUTH_SECRET con scrypt (no se almacena la clave).

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET no está definido — requerido para cifrar el secreto TOTP");
  }
  // Sal fija derivada del nombre de la app; suficiente para derivar una clave
  // estable de 32 bytes a partir del secreto del servidor.
  return crypto.scryptSync(secret, "governance-totp-salt", 32);
}

// Devuelve "iv:authTag:ciphertext" en base64.
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decrypt(payload: string): string {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Payload cifrado inválido");
  }
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}
