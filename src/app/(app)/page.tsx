import { getPerfil } from "@/lib/auth";
import { getResumenCobranza } from "@/lib/queries/dashboard";
import { formatBs, formatUsd } from "@/lib/format";

function Tarjeta({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        {titulo}
      </p>
      <p className="mt-1 text-2xl font-semibold text-stone-900">{valor}</p>
      {nota && <p className="mt-1 text-xs text-stone-500">{nota}</p>}
    </div>
  );
}

export default async function PanelPage() {
  const perfil = await getPerfil();

  if (perfil?.rol === "docente") {
    return (
      <div>
        <h1 className="text-lg font-semibold text-stone-900">
          Hola, {perfil.nombre_completo}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Tu panel de aula estará disponible cuando construyamos el módulo de
          Alumnos.
        </p>
      </div>
    );
  }

  const resumen = await getResumenCobranza();

  if (!resumen.anioEscolar) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-base font-semibold text-amber-900">
          No hay un año escolar activo configurado
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          Ve a{" "}
          <span className="font-medium">Año escolar y lapsos</span> para
          crear el año escolar 2026-2027 antes de registrar cobranza.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-stone-900">
        Panel — {resumen.anioEscolar.nombre}
      </h1>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta titulo="Alumnos inscritos" valor={String(resumen.alumnosInscritos)} />
        <Tarjeta
          titulo="Cobrado este mes"
          valor={formatUsd(resumen.cobradoMesUsd)}
          nota={formatBs(resumen.cobradoMesBs)}
        />
        <Tarjeta titulo="Pendiente por cobrar" valor={formatUsd(resumen.pendienteUsd)} />
        <Tarjeta
          titulo="Representantes morosos"
          valor={String(resumen.morosos)}
          nota="Cuotas vencidas sin pagar"
        />
      </div>
    </div>
  );
}
