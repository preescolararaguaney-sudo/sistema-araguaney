import type { Metadata } from "next";
import { getAlumnosEmergenciaPublico } from "@/lib/queries/emergencia-publico";
import { ListaNinos } from "./lista-ninos";

// Lee la base en cada visita: sin esto Next podría prerenderizar la página
// con la lista de niños tal como estaba al hacer el build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Emergencia — Seguro escolar",
  robots: { index: false, follow: false },
};

function Llamar({ numero, etiqueta }: { numero: string; etiqueta: string }) {
  return (
    <a
      href={`tel:${numero}`}
      className="flex min-h-12 items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-base font-bold text-white active:bg-red-800"
    >
      Llamar {etiqueta}
    </a>
  );
}

function Paso({
  n,
  titulo,
  children,
}: {
  n: number;
  titulo: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
          {n}
        </span>
        <div className="flex-1">
          <p className="text-base font-semibold text-stone-900">{titulo}</p>
          {children && <div className="mt-2 flex flex-col gap-2 text-sm text-stone-700">{children}</div>}
        </div>
      </div>
    </li>
  );
}

export default async function EmergenciaPage() {
  const ninos = await getAlumnosEmergenciaPublico();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="rounded-2xl bg-red-600 p-5 text-white">
        <h1 className="text-2xl font-extrabold tracking-tight">EMERGENCIA</h1>
        <p className="mt-1 text-sm font-medium text-red-50">
          Seguro escolar 2026 – 2027 · La Internacional de Seguros
        </p>
        <p className="mt-3 text-lg font-bold">Póliza N.º APED-150405-139</p>
        <p className="text-xs text-red-100">Vigente hasta el 16/09/2027</p>
      </header>

      <ol className="mt-5 flex flex-col gap-3">
        <Paso n={1} titulo="VENEMERGENCIA">
          <p>A través de la App en tu teléfono móvil, o llamando (Opción 1):</p>
          <Llamar numero="+582128221250" etiqueta="0212-822.12.50" />
          <Llamar numero="+582123135550" etiqueta="0212-313.55.50" />
        </Paso>
        <Paso n={2} titulo="La Internacional de Seguros, C.A.">
          <p>Opción 1:</p>
          <Llamar numero="+582122114500" etiqueta="0212-211.45.00" />
        </Paso>
        <Paso n={3} titulo="Gastos médicos por ACCIDENTE">
          <p className="text-lg font-bold text-stone-900">Cobertura de $ 1.500,00</p>
        </Paso>
        <Paso n={4} titulo="Gastos médicos por ENFERMEDAD">
          <p className="text-lg font-bold text-stone-900">Cobertura de $ 1.500,00</p>
          <p>
            Poliomielitis, amigdalitis, adenoiditis y apendicitis — <strong>por reembolso</strong>.
          </p>
        </Paso>
        <Paso n={5} titulo="¿Inconvenientes? Contacta a tu Asesor de Seguros">
          <Llamar numero="+584126312920" etiqueta="Raúl Gómez · 412-631.2920" />
          <Llamar numero="+584143002401" etiqueta="Jaimara Suárez · 414-300.24.01" />
        </Paso>
      </ol>

      <h2 className="mb-3 mt-8 text-lg font-bold text-stone-900">Niños (orden alfabético)</h2>
      <ListaNinos ninos={ninos} />
    </div>
  );
}
