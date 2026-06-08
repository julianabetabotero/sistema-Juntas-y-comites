import nodemailer from "nodemailer";

// Envío de correos (citaciones). Si no hay SMTP configurado, no falla: registra
// en consola y continúa (útil en desarrollo/demo sin servidor de correo).

const SMTP_HOST = process.env.SMTP_HOST;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "plataforma@empresa.com";

function getTransport() {
  if (!SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export async function sendMail(params: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ sent: boolean }> {
  const transport = getTransport();
  if (!transport) {
    console.log(
      `[email] SMTP no configurado — se omite envío a ${params.to.length} destinatario(s): "${params.subject}"`,
    );
    return { sent: false };
  }
  try {
    await transport.sendMail({
      from: EMAIL_FROM,
      to: params.to.join(", "),
      subject: params.subject,
      html: params.html,
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] error al enviar:", err);
    return { sent: false };
  }
}

// Plantilla de citación a sesión.
export function buildConvocationEmail(params: {
  committeeName: string;
  title: string;
  scheduledAt: Date;
  location: string | null;
  agenda: { order: number; title: string }[];
  appUrl: string;
}): string {
  const when = params.scheduledAt.toLocaleString("es-CO", {
    dateStyle: "full",
    timeStyle: "short",
  });
  const agendaHtml = params.agenda
    .sort((a, b) => a.order - b.order)
    .map((a) => `<li>${a.title}</li>`)
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; color: #1e293b;">
      <h2 style="color:#7f5f2b;">Citación a sesión — ${params.committeeName}</h2>
      <p><strong>${params.title}</strong></p>
      <p><strong>Fecha:</strong> ${when}</p>
      ${params.location ? `<p><strong>Lugar/Enlace:</strong> ${params.location}</p>` : ""}
      <p><strong>Orden del día:</strong></p>
      <ol>${agendaHtml}</ol>
      <p><a href="${params.appUrl}">Acceder a la plataforma</a> para ver los documentos.</p>
      <hr/>
      <p style="font-size:12px;color:#64748b;">Mensaje automático · Plataforma de Gobernanza Corporativa</p>
    </div>
  `;
}
