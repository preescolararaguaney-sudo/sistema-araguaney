import type { Rol } from "@/lib/auth";

export type NavItem = {
  href: string;
  label: string;
  roles: Rol[];
};

// Se amplía a medida que avanzan las fases (alumnos, personal, nómina).
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Panel", roles: ["directora", "administracion"] },
  {
    href: "/alumnos",
    label: "Alumnos",
    roles: ["directora", "administracion"],
  },
  {
    href: "/personal",
    label: "Personal",
    roles: ["directora", "administracion"],
  },
  {
    href: "/cobranza/pagos/nuevo",
    label: "Registrar pago",
    roles: ["directora", "administracion"],
  },
  {
    href: "/cobranza/estado-cuenta",
    label: "Estado de cuenta",
    roles: ["directora", "administracion"],
  },
  {
    href: "/cobranza/morosidad",
    label: "Morosidad",
    roles: ["directora", "administracion"],
  },
  {
    href: "/cobranza/cierre",
    label: "Cierre de mes",
    roles: ["directora", "administracion"],
  },
  {
    href: "/configuracion/calendario",
    label: "Año escolar y lapsos",
    roles: ["directora", "administracion"],
  },
];
