"use client";
import { useEffect, useState } from "react";
import { api, ContenidoEstatico } from "@/lib/api";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Button, Alert, Spinner, Textarea } from "@/components/ui";
import { Save, Eye } from "lucide-react";
import Link from "next/link";

export default function AdminContenidoPage() {
  const [contenidos, setContenidos] = useState<ContenidoEstatico[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<string | null>(null);
  const [textEditado, setTextEditado] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<ContenidoEstatico[]>("/api/contenido")
      .then(setContenidos)
      .finally(() => setLoading(false));
  }, []);

  function iniciarEdicion(c: ContenidoEstatico) {
    setEditando(c.clave);
    setTextEditado(c.contenido);
    setSuccess("");
    setError("");
  }

  async function guardar(clave: string) {
    setSaving(true);
    setError("");
    try {
      const updated = await api.patch<ContenidoEstatico>(`/api/contenido/${clave}`, { contenido: textEditado });
      setContenidos((prev) => prev.map((c) => (c.clave === clave ? updated : c)));
      setEditando(null);
      setSuccess(`"${updated.titulo}" actualizado correctamente.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedPage roles={["ADMIN"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar Políticas y Contenidos</h1>
            <p className="text-sm text-gray-500 mt-1">El contenido se muestra en la página pública /politicas</p>
          </div>
          <Link href="/politicas" target="_blank">
            <Button variant="secondary" size="sm">
              <Eye size={14} className="mr-1.5" />
              Ver página pública
            </Button>
          </Link>
        </div>

        {success && <Alert type="success">{success}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="space-y-4">
            {contenidos.map((c) => (
              <Card key={c.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>{c.titulo}</CardTitle>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Clave: <code className="bg-gray-100 px-1 rounded">{c.clave}</code> ·
                        Actualizado: {new Date(c.fechaActualizacion).toLocaleDateString("es-CL")}
                      </p>
                    </div>
                    {editando !== c.clave && (
                      <Button variant="secondary" size="sm" onClick={() => iniciarEdicion(c)}>
                        Editar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {editando === c.clave ? (
                    <div className="space-y-3">
                      <Textarea
                        value={textEditado}
                        onChange={(e) => setTextEditado(e.target.value)}
                        rows={12}
                        className="font-mono text-xs"
                      />
                      <p className="text-xs text-gray-400">Soporta Markdown básico: # Título, ## Subtítulo, **negrita**, - lista</p>
                      <div className="flex gap-3">
                        <Button onClick={() => guardar(c.clave)} loading={saving} size="sm">
                          <Save size={14} className="mr-1.5" />
                          Guardar cambios
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditando(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <pre className="text-xs text-gray-500 whitespace-pre-wrap font-sans line-clamp-4 overflow-hidden">
                      {c.contenido.slice(0, 300)}{c.contenido.length > 300 ? "..." : ""}
                    </pre>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
