"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Dumbbell, ChevronDown, ChevronUp } from "lucide-react";
import { api, ContenidoEstatico } from "@/lib/api";
import { Spinner } from "@/components/ui";

function renderMarkdown(text: string) {
  // Simple markdown renderer para headings, bold, listas y saltos de línea
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("# ")) {
      result.push(<h1 key={i} className="text-2xl font-bold text-gray-900 mt-6 mb-3">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      result.push(<h2 key={i} className="text-lg font-semibold text-gray-800 mt-5 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      result.push(<h3 key={i} className="font-semibold text-gray-700 mt-4 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith("- ")) {
      result.push(
        <li key={i} className="text-gray-600 text-sm ml-4 list-disc">{parseBold(line.slice(2))}</li>
      );
    } else if (line.trim() === "") {
      result.push(<div key={i} className="h-2" />);
    } else {
      result.push(<p key={i} className="text-gray-600 text-sm leading-relaxed">{parseBold(line)}</p>);
    }
    i++;
  }
  return result;
}

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-800">{part}</strong> : part
  );
}

function SeccionPolitica({ contenido }: { contenido: ContenidoEstatico }) {
  const [abierta, setAbierta] = useState(false);

  return (
    <div id={contenido.clave} className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setAbierta(!abierta)}
        className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <h2 className="font-semibold text-gray-900">{contenido.titulo}</h2>
        {abierta ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      {abierta && (
        <div className="px-6 pb-6 bg-white border-t border-gray-100">
          <div className="mt-4">
            {renderMarkdown(contenido.contenido)}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Última actualización: {new Date(contenido.fechaActualizacion).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      )}
    </div>
  );
}

export default function PoliticasPage() {
  const [contenidos, setContenidos] = useState<ContenidoEstatico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ContenidoEstatico[]>("/api/contenido")
      .then(setContenidos)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Dumbbell size={22} className="text-sky-500" />
            <span className="font-bold text-gray-900">Castro Gym</span>
          </Link>
          <Link href="/login" className="text-sm text-sky-600 hover:underline">
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Políticas y Condiciones</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Aquí encontrarás toda la información sobre el reglamento, políticas de membresía, cancelación y el tratamiento de tus datos personales.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="space-y-3">
            {contenidos.map((c) => (
              <SeccionPolitica key={c.id} contenido={c} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
