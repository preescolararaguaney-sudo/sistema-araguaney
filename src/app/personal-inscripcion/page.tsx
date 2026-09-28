import { PersonalForm } from "./personal-form";

export default function PersonalInscripcionPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-stone-900">
        Ficha de ingreso de personal — Preescolar Araguaney
      </h1>
      <p className="mt-2 mb-6 text-sm text-stone-600">
        Completa tus datos personales, de domicilio y de formación académica.
        El plantel revisará tu información antes de incorporarla al sistema.
      </p>
      <PersonalForm />
    </div>
  );
}
