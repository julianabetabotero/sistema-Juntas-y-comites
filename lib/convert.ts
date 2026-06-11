import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";

const execFileAsync = promisify(execFile);

// Convierte DOCX/XLSX/PPTX (u otros formatos de Office) a PDF usando LibreOffice
// headless. Devuelve el PDF como Uint8Array, o null si LibreOffice no está
// disponible / falla (degradación elegante — la app no se rompe).
//
// En local (Windows sin LibreOffice) devolverá null y el visor mostrará un
// aviso. En producción (Railway con libreoffice instalado vía nixpacks.toml)
// hará la conversión real.

const CANDIDATE_BINS = process.env.SOFFICE_BIN
  ? [process.env.SOFFICE_BIN]
  : ["soffice", "libreoffice"];

export async function officeToPdf(
  buffer: Buffer,
  ext: string,
): Promise<Uint8Array | null> {
  const tmpdir = os.tmpdir();
  const id = crypto.randomUUID();
  const inputPath = path.join(tmpdir, `conv-${id}.${ext}`);
  const outputPath = path.join(tmpdir, `conv-${id}.pdf`);
  const profileDir = path.join(tmpdir, `lo-profile-${id}`);

  try {
    await fs.writeFile(inputPath, buffer);

    const args = [
      "--headless",
      "--norestore",
      "--nolockcheck",
      `-env:UserInstallation=file://${profileDir}`,
      "--convert-to",
      "pdf",
      "--outdir",
      tmpdir,
      inputPath,
    ];

    let converted = false;
    for (const bin of CANDIDATE_BINS) {
      try {
        await execFileAsync(bin, args, { timeout: 90_000 });
        converted = true;
        break;
      } catch (err) {
        // Si el binario no existe (ENOENT), probar el siguiente candidato.
        const code = (err as NodeJS.ErrnoException)?.code;
        if (code === "ENOENT") continue;
        // Otro error de conversión: registrar y abortar.
        console.error(
          "[convert] LibreOffice falló:",
          err instanceof Error ? err.message : err,
        );
        return null;
      }
    }

    if (!converted) {
      console.warn("[convert] LibreOffice no está instalado en este entorno.");
      return null;
    }

    const pdf = await fs.readFile(outputPath);
    return new Uint8Array(pdf);
  } catch (err) {
    console.error(
      "[convert] error de conversión:",
      err instanceof Error ? err.message : err,
    );
    return null;
  } finally {
    await fs.rm(inputPath, { force: true }).catch(() => {});
    await fs.rm(outputPath, { force: true }).catch(() => {});
    await fs.rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}
