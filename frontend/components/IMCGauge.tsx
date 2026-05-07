"use client";

interface IMCRange {
  label: string;
  min: number;
  max: number;
  color: string;
  textColor: string;
}

const RANGOS: IMCRange[] = [
  { label: "Bajo peso", min: 0, max: 18.5, color: "#3b82f6", textColor: "#1d4ed8" },
  { label: "Normal", min: 18.5, max: 25, color: "#22c55e", textColor: "#15803d" },
  { label: "Sobrepeso", min: 25, max: 30, color: "#eab308", textColor: "#a16207" },
  { label: "Obesidad I", min: 30, max: 35, color: "#f97316", textColor: "#c2410c" },
  { label: "Obesidad II+", min: 35, max: 50, color: "#ef4444", textColor: "#b91c1c" },
];

const DISPLAY_MIN = 10;
const DISPLAY_MAX = 50;
const DISPLAY_RANGE = DISPLAY_MAX - DISPLAY_MIN;

function toPercent(value: number) {
  return Math.min(100, Math.max(0, ((value - DISPLAY_MIN) / DISPLAY_RANGE) * 100));
}

function getRangoActual(imc: number): IMCRange {
  return RANGOS.find((r) => imc >= r.min && imc < r.max) ?? RANGOS[RANGOS.length - 1];
}

export function IMCGauge({ imc }: { imc: number }) {
  const rangoActual = getRangoActual(imc);
  const posicion = toPercent(imc);

  return (
    <div className="w-full">
      {/* Barra de rangos */}
      <div className="relative h-7 rounded-full overflow-hidden flex mb-1">
        {RANGOS.map((rango, i) => {
          const from = toPercent(Math.max(rango.min, DISPLAY_MIN));
          const to = toPercent(Math.min(rango.max, DISPLAY_MAX));
          const width = to - from;
          return (
            <div
              key={i}
              style={{ width: `${width}%`, backgroundColor: rango.color }}
              className="h-full"
            />
          );
        })}

        {/* Indicador (triángulo/puntero) */}
        <div
          className="absolute top-0 h-full flex items-center"
          style={{ left: `${posicion}%`, transform: "translateX(-50%)" }}
        >
          <div className="w-3 h-3 bg-white border-2 border-gray-800 rounded-full shadow-md" />
        </div>
      </div>

      {/* Etiquetas de límites */}
      <div className="flex justify-between text-xs text-gray-400 mb-4 px-0.5">
        <span>10</span>
        <span>18.5</span>
        <span>25</span>
        <span>30</span>
        <span>35</span>
        <span>50+</span>
      </div>

      {/* Valor actual */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="text-2xl font-bold"
          style={{ color: rangoActual.textColor }}
        >
          {imc.toFixed(1)}
        </span>
        <span
          className="text-sm font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: rangoActual.color + "22", color: rangoActual.textColor }}
        >
          {rangoActual.label}
        </span>
      </div>

      {/* Tabla de referencia OMS */}
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Clasificación OMS</th>
              <th className="text-right px-3 py-2 text-gray-500 font-medium">IMC (kg/m²)</th>
            </tr>
          </thead>
          <tbody>
            {RANGOS.map((r, i) => (
              <tr
                key={i}
                className={`border-t border-gray-100 ${getRangoActual(imc) === r ? "font-semibold" : ""}`}
              >
                <td className="px-3 py-1.5 flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: r.color }}
                  />
                  {r.label}
                </td>
                <td className="px-3 py-1.5 text-right text-gray-600">
                  {r.max === 50 ? `≥ ${r.min}` : `${r.min} – ${r.max}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
