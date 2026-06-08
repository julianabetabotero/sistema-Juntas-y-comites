/** @type {import('next').NextConfig} */

// CSP pragmática: permite el worker de pdf.js desde unpkg, imágenes data: (QR),
// y los scripts/estilos que Next necesita. Endurecer con nonces en producción.
const csp = [
  "default-src 'self'",
  // 'unsafe-eval' lo requiere pdf.js; en dev Next usa eval para HMR.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob: https://unpkg.com",
  "connect-src 'self' https://unpkg.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
