import { authenticator } from "otplib";
import QRCode from "qrcode";

// Helpers TOTP (Google Authenticator) usando otplib.
// Ventana de ±1 paso para tolerar desfase de reloj.
authenticator.options = { window: 1 };

const ISSUER = "Gobernanza Corporativa";

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function getTotpUri(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret);
}

export async function getTotpQrDataUrl(
  email: string,
  secret: string,
): Promise<string> {
  const uri = getTotpUri(email, secret);
  return QRCode.toDataURL(uri);
}

export function verifyTotp(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: token.trim(), secret });
  } catch {
    return false;
  }
}
