"use client";
import { Crown } from "lucide-react";
import { ReactNode } from "react";

interface VIPLockProps {
  children: ReactNode;
  /** Mensaje personalizable de upsell */
  mensaje?: string;
}

/**
 * Envuelve contenido VIP. Si el usuario no es VIP, muestra blur + badge.
 * El contenido se renderiza igual (para SSR / SEO), solo se oculta visualmente.
 */
export function VIPLock({
  children,
  mensaje = "Disponible solo para clientes VIP",
}: VIPLockProps) {
  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Contenido con blur */}
      <div className="blur-sm pointer-events-none select-none" aria-hidden>
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/60 backdrop-blur-[2px]">
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-2 shadow-sm">
          <Crown size={16} className="text-amber-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-amber-700">{mensaje}</span>
        </div>
        <p className="text-xs text-gray-500 text-center max-w-[200px]">
          Actualiza tu membresía a VIP para desbloquear esta función
        </p>
      </div>
    </div>
  );
}
