"use client";
import { useState } from "react";
import { api } from "@/lib/api";

// ─── Catálogo de personajes ────────────────────────────────────────────────

export interface Personaje {
  id: string;
  categoria: "Hombre" | "Mujer" | "Animales" | "Fitness";
  emoji: string;
  nombre: string;
  color: string; // color del anillo / fondo
}

export const PERSONAJES: Personaje[] = [
  // Hombre
  { id: "hombre_guerrero",    categoria: "Hombre",  emoji: "🏋️",  nombre: "Guerrero",   color: "#3b82f6" },
  { id: "hombre_corredor",    categoria: "Hombre",  emoji: "🏃",  nombre: "Corredor",   color: "#0ea5e9" },
  { id: "hombre_boxeador",    categoria: "Hombre",  emoji: "🥊",  nombre: "Boxeador",   color: "#6366f1" },
  { id: "hombre_ciclista",    categoria: "Hombre",  emoji: "🚴",  nombre: "Ciclista",   color: "#8b5cf6" },
  // Mujer
  { id: "mujer_campeona",     categoria: "Mujer",   emoji: "🏋️‍♀️", nombre: "Campeona",   color: "#ec4899" },
  { id: "mujer_corredora",    categoria: "Mujer",   emoji: "🏃‍♀️", nombre: "Corredora",  color: "#f43f5e" },
  { id: "mujer_yoga",         categoria: "Mujer",   emoji: "🧘‍♀️", nombre: "Zen",        color: "#a855f7" },
  { id: "mujer_ciclista",     categoria: "Mujer",   emoji: "🚴‍♀️", nombre: "Ciclista",   color: "#d946ef" },
  // Animales
  { id: "animal_leon",        categoria: "Animales", emoji: "🦁", nombre: "León",       color: "#f59e0b" },
  { id: "animal_tigre",       categoria: "Animales", emoji: "🐯", nombre: "Tigre",      color: "#f97316" },
  { id: "animal_aguila",      categoria: "Animales", emoji: "🦅", nombre: "Águila",     color: "#0f172a" },
  { id: "animal_lobo",        categoria: "Animales", emoji: "🐺", nombre: "Lobo",       color: "#64748b" },
  { id: "animal_toro",        categoria: "Animales", emoji: "🐂", nombre: "Toro",       color: "#b45309" },
  // Fitness
  { id: "fitness_rayo",       categoria: "Fitness", emoji: "⚡",  nombre: "Rayo",       color: "#eab308" },
  { id: "fitness_fuego",      categoria: "Fitness", emoji: "🔥",  nombre: "Fuego",      color: "#ef4444" },
  { id: "fitness_campeon",    categoria: "Fitness", emoji: "🏆",  nombre: "Campeón",    color: "#d97706" },
  { id: "fitness_diamante",   categoria: "Fitness", emoji: "💎",  nombre: "Diamante",   color: "#06b6d4" },
  { id: "fitness_estrella",   categoria: "Fitness", emoji: "⭐",  nombre: "Estrella",   color: "#a3a3a3" },
];

const CATEGORIAS = ["Hombre", "Mujer", "Animales", "Fitness"] as const;
const DEFAULT_PERSONAJE = PERSONAJES[0];

function findPersonaje(id: string | null | undefined): Personaje {
  return PERSONAJES.find((p) => p.id === id) ?? DEFAULT_PERSONAJE;
}

// ─── Avatar circular (display) ────────────────────────────────────────────

interface AvatarDisplayProps {
  personajeId?: string | null;
  size?: number;
  showName?: boolean;
}

export function UserAvatar({ personajeId, size = 72, showName = false }: AvatarDisplayProps) {
  const personaje = findPersonaje(personajeId);
  const r = size / 2;
  const strokeW = Math.max(3, size * 0.06);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={r}
          cy={r}
          r={r - strokeW / 2}
          fill={personaje.color + "18"}
          stroke={personaje.color}
          strokeWidth={strokeW}
        />
        <text
          x={r}
          y={r}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.44}
        >
          {personaje.emoji}
        </text>
      </svg>
      {showName && (
        <p className="text-xs font-semibold" style={{ color: personaje.color }}>
          {personaje.nombre}
        </p>
      )}
    </div>
  );
}

// ─── Selector de personaje (grid con categorías) ──────────────────────────

interface AvatarSelectorProps {
  currentId?: string | null;
  onSave?: (id: string) => void;
}

export function AvatarSelector({ currentId, onSave }: AvatarSelectorProps) {
  const [selected, setSelected] = useState<string>(currentId ?? DEFAULT_PERSONAJE.id);
  const [categoria, setCategoria] = useState<typeof CATEGORIAS[number]>("Hombre");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const filtrados = PERSONAJES.filter((p) => p.categoria === categoria);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await api.patch("/api/clientes/me/avatar", { avatarPersonaje: selected });
      setSaved(true);
      onSave?.(selected);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Preview del personaje actual */}
      <div className="flex items-center gap-4">
        <UserAvatar personajeId={selected} size={80} showName />
        <div>
          <p className="text-sm font-medium text-gray-700">Tu personaje actual</p>
          <p className="text-xs text-gray-400">{findPersonaje(selected).categoria}</p>
        </div>
      </div>

      {/* Tabs de categoría */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoria(cat)}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${
              categoria === cat
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid de personajes */}
      <div className="grid grid-cols-4 gap-2">
        {filtrados.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
              selected === p.id
                ? "border-2 shadow-md scale-105"
                : "border-transparent hover:border-gray-200 hover:bg-gray-50"
            }`}
            style={selected === p.id ? { borderColor: p.color, backgroundColor: p.color + "10" } : {}}
          >
            <span className="text-2xl leading-none">{p.emoji}</span>
            <span className="text-xs text-gray-500">{p.nombre}</span>
          </button>
        ))}
      </div>

      {/* Botón guardar */}
      <button
        onClick={handleSave}
        disabled={saving || selected === currentId}
        className="w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50
          bg-sky-500 hover:bg-sky-600 text-white disabled:cursor-not-allowed"
      >
        {saving ? "Guardando…" : saved ? "¡Guardado!" : "Guardar personaje"}
      </button>
    </div>
  );
}
