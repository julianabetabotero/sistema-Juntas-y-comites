// Rate limiter simple en memoria (ventana fija).
//
// ADVERTENCIA producción: esto vive en la memoria del proceso. En Railway con
// un solo contenedor funciona; si escalas a varias réplicas, sustitúyelo por
// @upstash/ratelimit + Redis (ver checklist de seguridad y README).

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1, resetAt };
  }

  bucket.count += 1;
  const allowed = bucket.count <= max;
  return {
    allowed,
    remaining: Math.max(0, max - bucket.count),
    resetAt: bucket.resetAt,
  };
}

// Limpieza periódica para no crecer indefinidamente.
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      buckets.forEach((bucket, key) => {
        if (now > bucket.resetAt) buckets.delete(key);
      });
    },
    10 * 60 * 1000,
  ).unref?.();
}
