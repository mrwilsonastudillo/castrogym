"use client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CX = 110;
const CY = 108;
const R_MID = 78;
const STROKE_W = 28;

/** Devuelve (x, y) sobre el arco superior para una proporción p ∈ [0,1] */
function gaugePoint(r: number, p: number): [number, number] {
  const angle = Math.PI * (1 + p); // π → 2π (semicírculo superior, de izquierda a derecha)
  return [
    parseFloat((CX + r * Math.cos(angle)).toFixed(3)),
    parseFloat((CY + r * Math.sin(angle)).toFixed(3)),
  ];
}

/** Ruta SVG de un segmento de arco con stroke grueso */
function segmentPath(p1: number, p2: number): string {
  const [x1, y1] = gaugePoint(R_MID, p1);
  const [x2, y2] = gaugePoint(R_MID, p2);
  const large = p2 - p1 > 0.5 ? 1 : 0;
  // sweep=1 → sentido horario en pantalla → va de izquierda a derecha por ARRIBA
  return `M ${x1} ${y1} A ${R_MID} ${R_MID} 0 ${large} 1 ${x2} ${y2}`;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface GaugeSegment {
  from: number; // valor absoluto inicio
  to: number;   // valor absoluto fin
  color: string;
  label: string;
}

interface HealthGaugeProps {
  value: number;
  min: number;
  max: number;
  segments: GaugeSegment[];
  unit?: string;
  title?: string;
  size?: number; // escala relativa (1 = normal)
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function HealthGauge({
  value,
  min,
  max,
  segments,
  unit = "",
  title,
  size = 1,
}: HealthGaugeProps) {
  const clampedValue = Math.min(Math.max(value, min), max);
  const valueProp = (clampedValue - min) / (max - min); // 0–1

  // Color y label del segmento activo
  const activeSegment =
    segments.find((s) => clampedValue >= s.from && clampedValue < s.to) ??
    segments[segments.length - 1];

  // Punta de la aguja
  const [needleTipX, needleTipY] = gaugePoint(R_MID, valueProp);

  // Eje de la aguja (punto base sobre el radio interior)
  const [needleBaseX, needleBaseY] = gaugePoint(R_MID - STROKE_W / 2 - 6, valueProp);

  const W = 220;
  const H = 165;

  return (
    <div
      className="flex flex-col items-center gap-1 w-full"
      style={{ maxWidth: W * size }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        aria-label={title ?? "Indicador de salud"}
      >
        {/* Fondo (pista) */}
        <path
          d={segmentPath(0, 1)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={STROKE_W}
          strokeLinecap="butt"
        />

        {/* Segmentos de color */}
        {segments.map((seg) => {
          const p1 = (Math.max(seg.from, min) - min) / (max - min);
          const p2 = (Math.min(seg.to, max) - min) / (max - min);
          if (p1 >= p2) return null;
          return (
            <path
              key={seg.label}
              d={segmentPath(p1, p2)}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE_W}
              strokeLinecap="butt"
              opacity={0.85}
            />
          );
        })}

        {/* Aguja */}
        <line
          x1={CX}
          y1={CY}
          x2={needleTipX}
          y2={needleTipY}
          stroke="#1e293b"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Punto central */}
        <circle cx={CX} cy={CY} r={6} fill="#1e293b" />
        <circle cx={CX} cy={CY} r={3} fill="white" />

        {/* Valor en centro */}
        <text
          x={CX}
          y={CY + 28}
          textAnchor="middle"
          fontSize={22}
          fontWeight="700"
          fill={activeSegment.color}
          fontFamily="system-ui, sans-serif"
        >
          {Number.isInteger(value) ? value : value.toFixed(1)}
          {unit && (
            <tspan fontSize={12} fontWeight="400" fill="#64748b">
              {" "}{unit}
            </tspan>
          )}
        </text>

        {/* Label del segmento activo */}
        <text
          x={CX}
          y={CY + 46}
          textAnchor="middle"
          fontSize={11}
          fill={activeSegment.color}
          fontFamily="system-ui, sans-serif"
          fontWeight="600"
        >
          {activeSegment.label}
        </text>

        {/* Etiquetas min/max — justo debajo de los extremos del arco */}
        <text x={16} y={CY + 16} textAnchor="middle" fontSize={9} fill="#94a3b8" fontFamily="system-ui, sans-serif">
          {min}
        </text>
        <text x={W - 16} y={CY + 16} textAnchor="middle" fontSize={9} fill="#94a3b8" fontFamily="system-ui, sans-serif">
          {max}+
        </text>
      </svg>

      {/* Leyenda compacta */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-xs text-gray-500">{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Configuraciones predefinidas ─────────────────────────────────────────────

export const IMC_SEGMENTS: GaugeSegment[] = [
  { from: 10, to: 18.5, color: "#3b82f6", label: "Bajo peso" },
  { from: 18.5, to: 25,  color: "#22c55e", label: "Normal" },
  { from: 25,   to: 30,  color: "#eab308", label: "Sobrepeso" },
  { from: 30,   to: 35,  color: "#f97316", label: "Obesidad I" },
  { from: 35,   to: 45,  color: "#ef4444", label: "Obesidad II+" },
];

export const ICC_SEGMENTS_M: GaugeSegment[] = [
  { from: 0.6,  to: 0.9,  color: "#22c55e", label: "Bajo" },
  { from: 0.9,  to: 1.0,  color: "#eab308", label: "Moderado" },
  { from: 1.0,  to: 1.3,  color: "#ef4444", label: "Alto" },
];

export const ICC_SEGMENTS_F: GaugeSegment[] = [
  { from: 0.6,  to: 0.8,  color: "#22c55e", label: "Bajo" },
  { from: 0.8,  to: 0.85, color: "#eab308", label: "Moderado" },
  { from: 0.85, to: 1.1,  color: "#ef4444", label: "Alto" },
];
