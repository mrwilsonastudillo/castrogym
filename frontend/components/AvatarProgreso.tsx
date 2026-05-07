"use client";
import { useEffect, useState } from "react";

export interface NivelAvatar {
  nivel: number;
  nombre: string;
}

const NIVELES = [
  { nivel: 1, nombre: "Novato", descripcion: "0–2 mediciones", emoji: "🌱" },
  { nivel: 2, nombre: "Comprometido", descripcion: "3–5 mediciones", emoji: "💪" },
  { nivel: 3, nombre: "Constante", descripcion: "6–10 mediciones", emoji: "🔥" },
  { nivel: 4, nombre: "Dedicado", descripcion: "11–20 mediciones", emoji: "⚡" },
  { nivel: 5, nombre: "Élite", descripcion: "21+ mediciones", emoji: "🏆" },
];

const COLORES = [
  { anillo: "#94a3b8", fondo: "#f1f5f9" }, // Novato - gris
  { anillo: "#60a5fa", fondo: "#eff6ff" }, // Comprometido - azul
  { anillo: "#f59e0b", fondo: "#fffbeb" }, // Constante - naranja
  { anillo: "#8b5cf6", fondo: "#f5f3ff" }, // Dedicado - morado
  { anillo: "#f59e0b", fondo: "#fef9c3" }, // Élite - dorado
];

function AvatarSVG({ nivel, size = 80 }: { nivel: number; size?: number }) {
  const cfg = COLORES[nivel - 1] ?? COLORES[0];
  const info = NIVELES[nivel - 1] ?? NIVELES[0];
  const r = size / 2;
  const strokeW = size * 0.06;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Fondo */}
        <circle cx={r} cy={r} r={r - strokeW / 2} fill={cfg.fondo} stroke={cfg.anillo} strokeWidth={strokeW} />
        {/* Emoji centrado */}
        <text
          x={r}
          y={r}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.42}
        >
          {info.emoji}
        </text>
        {/* Nivel badge si es Élite */}
        {nivel === 5 && (
          <>
            <circle cx={size * 0.78} cy={size * 0.22} r={size * 0.16} fill="#f59e0b" />
            <text x={size * 0.78} y={size * 0.22} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.15} fill="white" fontWeight="bold">
              ★
            </text>
          </>
        )}
      </svg>
      <p className="text-xs font-semibold" style={{ color: cfg.anillo }}>{info.nombre}</p>
    </div>
  );
}

interface AvatarProgresoProps {
  nivel: number;
  nombreNivel: string;
  totalMediciones: number;
  nivelAnterior?: number; // para detectar subida de nivel
}

export function AvatarProgreso({ nivel, nombreNivel, totalMediciones, nivelAnterior }: AvatarProgresoProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (nivelAnterior !== undefined && nivel > nivelAnterior) {
      setShowModal(true);
    }
  }, [nivel, nivelAnterior]);

  return (
    <>
      <AvatarSVG nivel={nivel} size={80} />

      {/* Modal de subida de nivel */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xs w-full text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">¡Subiste de nivel!</h2>
            <p className="text-gray-500 text-sm mb-4">
              Ahora eres <span className="font-semibold text-gray-800">{nombreNivel}</span> con {totalMediciones} mediciones registradas. ¡Sigue así!
            </p>
            <AvatarSVG nivel={nivel} size={64} />
            <button
              className="mt-5 w-full bg-sky-500 hover:bg-sky-600 text-white rounded-lg py-2 text-sm font-medium transition-colors"
              onClick={() => setShowModal(false)}
            >
              ¡Genial!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export { AvatarSVG, NIVELES };
