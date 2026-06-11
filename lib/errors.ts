// Errores con código HTTP para usar en API routes.
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "No autenticado") {
    super(401, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "No autorizado") {
    super(403, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "No encontrado") {
    super(404, message);
  }
}

// Convierte cualquier error en una respuesta JSON con el status adecuado.
import { NextResponse } from "next/server";

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[api] error no controlado:", err);
  return NextResponse.json(
    {
      error: "Error interno del servidor",
      // TEMP DEBUG: detalle para diagnosticar en producción (se quitará).
      detail: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    },
    { status: 500 },
  );
}
