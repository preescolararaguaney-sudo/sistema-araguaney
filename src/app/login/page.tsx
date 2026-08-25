import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión — Sistema Araguaney",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-stone-900">
            Preescolar Araguaney
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Sistema administrativo — inicia sesión para continuar
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
