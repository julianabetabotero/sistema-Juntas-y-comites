import Link from "next/link";

export default function AccessDenied({
  message = "No tienes acceso a este recurso.",
}: {
  message?: string;
}) {
  return (
    <div className="card mx-auto mt-12 max-w-md p-8 text-center">
      <p className="font-serif text-xl text-slate-100">Acceso denegado</p>
      <p className="mt-2 text-sm text-slate-400">{message}</p>
      <Link href="/" className="btn-secondary mt-6 inline-flex">
        Volver al inicio
      </Link>
    </div>
  );
}
