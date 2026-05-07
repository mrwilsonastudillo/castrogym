"use client";
import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/components/ui";
import {
  LayoutDashboard,
  CalendarPlus,
  BarChart2,
  Calendar,
  Clock,
  Users,
  Dumbbell,
  LogOut,
  CreditCard,
  Shield,
  Crown,
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { href: "/dashboard",          label: "Inicio",          icon: <LayoutDashboard size={18} />, roles: ["CLIENTE", "COACH", "ADMIN"] },
  { href: "/agendar",            label: "Agendar cita",    icon: <CalendarPlus size={18} />,    roles: ["CLIENTE"] },
  { href: "/mis-citas",          label: "Mis citas",       icon: <Calendar size={18} />,        roles: ["CLIENTE"] },
  { href: "/mis-mediciones",     label: "Mis mediciones",  icon: <BarChart2 size={18} />,        roles: ["CLIENTE"] },
  { href: "/mi-cuenta/mis-datos",label: "Mi perfil",       icon: <Shield size={18} />,          roles: ["CLIENTE"] },
  { href: "/agenda", label: "Mi agenda", icon: <Calendar size={18} />, roles: ["COACH"] },
  { href: "/horarios", label: "Horarios", icon: <Clock size={18} />, roles: ["COACH"] },
  { href: "/clientes", label: "Clientes", icon: <Users size={18} />, roles: ["ADMIN", "COACH"] },
  { href: "/coaches", label: "Coaches", icon: <Users size={18} />, roles: ["ADMIN"] },
  { href: "/admin/membresias", label: "Membresías", icon: <CreditCard size={18} />, roles: ["ADMIN"] },
  { href: "/admin/contenido", label: "Políticas", icon: <Shield size={18} />, roles: ["ADMIN"] },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const visible = navItems.filter((i) => user && i.roles.includes(user.rol));

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-col bg-white border-r border-gray-200 fixed inset-y-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-200">
          <Dumbbell size={22} className="text-sky-500" />
          <span className="font-bold text-gray-900 text-lg">Castro Gym</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visible.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-sky-50 text-sky-600"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            {user?.rol === "CLIENTE" && (
              <div className="flex-shrink-0">
                <UserAvatar personajeId={user.avatarPersonaje} size={36} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.nombre}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              {user?.rol === "CLIENTE" && user.esVIP ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                  <Crown size={10} />VIP
                </span>
              ) : (
                <span className="text-xs text-sky-600 font-medium">{user?.rol}</span>
              )}
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Dumbbell size={20} className="text-sky-500" />
          <span className="font-bold text-gray-900">Castro Gym</span>
        </div>
        <button onClick={logout} className="text-gray-500 hover:text-gray-700">
          <LogOut size={18} />
        </button>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-10 flex bg-white border-t border-gray-200">
        {visible.slice(0, 4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
              pathname.startsWith(item.href) ? "text-sky-600" : "text-gray-500"
            )}
          >
            {item.icon}
            <span className="text-[10px]">{item.label.split(" ")[0]}</span>
          </Link>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 pb-16 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
