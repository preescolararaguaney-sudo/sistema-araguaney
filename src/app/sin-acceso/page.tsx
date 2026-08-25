import Link from "next/link";

export default function SinAccesoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold text-stone-900">
          No tienes acceso a esta sección
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Tu rol no tiene permiso para ver esta página.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Volver al panel
        </Link>
      </div>
    </div>
  );
}
