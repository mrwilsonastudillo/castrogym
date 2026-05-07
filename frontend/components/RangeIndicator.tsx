"use client";

interface Zone {
  label: string;
  min: number;
  max: number;
  color: string;
}

const ZONES_M: Zone[] = [
  { label: "Esencial",  min: 2,  max: 6,  color: "#3b82f6" },
  { label: "Atlético",  min: 6,  max: 14, color: "#10b981" },
  { label: "Fitness",   min: 14, max: 18, color: "#22c55e" },
  { label: "Promedio",  min: 18, max: 25, color: "#f59e0b" },
  { label: "Obesidad",  min: 25, max: 42, color: "#ef4444" },
];

const ZONES_F: Zone[] = [
  { label: "Esencial",  min: 10, max: 14, color: "#3b82f6" },
  { label: "Atlética",  min: 14, max: 21, color: "#10b981" },
  { label: "Fitness",   min: 21, max: 25, color: "#22c55e" },
  { label: "Promedio",  min: 25, max: 32, color: "#f59e0b" },
  { label: "Obesidad",  min: 32, max: 52, color: "#ef4444" },
];

interface Props {
  value: number;
  genero: string;
  estimated?: boolean;
}

export function RangeIndicator({ value, genero, estimated = false }: Props) {
  const zones = genero === "M" ? ZONES_M : ZONES_F;
  const min = zones[0].min;
  const max = zones[zones.length - 1].max;
  const total = max - min;

  const activeZone =
    zones.find((z) => value >= z.min && value < z.max) ??
    zones[zones.length - 1];

  const markerPct = Math.min(Math.max(((value - min) / total) * 100, 1), 99);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">
          % Grasa corporal
        </span>
        <span
          className="text-sm font-bold"
          style={{ color: activeZone.color }}
        >
          {activeZone.label}
          {estimated && (
            <span className="text-xs text-gray-400 font-normal ml-1">
              *estimado
            </span>
          )}
        </span>
      </div>

      {/* Color bar */}
      <div className="relative h-3.5 rounded-full overflow-visible flex">
        <div className="flex w-full rounded-full overflow-hidden">
          {zones.map((z) => (
            <div
              key={z.label}
              className="h-full"
              style={{
                width: `${((z.max - z.min) / total) * 100}%`,
                backgroundColor: z.color,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
        {/* Marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white shadow-md border-2 transition-all duration-500"
          style={{ left: `${markerPct}%`, borderColor: activeZone.color }}
        />
      </div>

      {/* Value label */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}%</span>
        <span
          className="font-bold text-base"
          style={{ color: activeZone.color }}
        >
          {value.toFixed(1)}%
        </span>
        <span>{max}%+</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1">
        {zones.map((z) => (
          <div
            key={z.label}
            className="flex items-center gap-1.5 text-xs"
            style={{
              color:
                z.label === activeZone.label ? z.color : "#9ca3af",
              fontWeight: z.label === activeZone.label ? 700 : 400,
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: z.color }}
            />
            {z.label}
          </div>
        ))}
      </div>
    </div>
  );
}
