"use client";

const INPUT =
  "rounded-md border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";

// Datos de quien va en la factura: se prellenan con la madre (o el padre) y,
// si el bot los pidió por Telegram, con lo que respondieron.
export function FacturaCampos({
  nombre,
  cedula,
  telefono,
  direccion,
}: {
  nombre: string;
  cedula: string;
  telefono: string;
  direccion: string;
}) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-stone-200 p-3">
      <legend className="px-1 text-sm font-medium text-stone-700">Datos para la factura</legend>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-stone-600">Nombre completo (o razón social)</span>
        <input name="factura_nombre" defaultValue={nombre} required className={INPUT} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600">Cédula / RIF</span>
          <input name="factura_cedula" defaultValue={cedula} required placeholder="V-12345678" className={INPUT} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone-600">Teléfono</span>
          <input name="factura_telefono" defaultValue={telefono} className={INPUT} />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-stone-600">Domicilio (solo si lo piden en la factura)</span>
        <input name="factura_direccion" defaultValue={direccion} className={INPUT} />
      </label>
      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="guardar_contacto" />
          Guardar como representante del alumno
        </label>
        <select name="contacto_rol" defaultValue="madre" className="rounded-md border border-stone-300 px-2 py-1 text-xs">
          <option value="madre">como madre</option>
          <option value="padre">como padre</option>
        </select>
      </div>
    </fieldset>
  );
}
