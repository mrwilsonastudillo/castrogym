"use client";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { api, Coach } from "@/lib/api";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Alert, Spinner, Badge } from "@/components/ui";

interface NuevoCoach {
  nombre: string;
  email: string;
  password: string;
  especialidad: string;
  telefono: string;
}

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [form, setForm] = useState<NuevoCoach>({
    nombre: "", email: "", password: "coach123", especialidad: "", telefono: "",
  });

  function loadCoaches() {
    api.get<Coach[]>("/api/coaches").then(setCoaches).finally(() => setLoading(false));
  }

  useEffect(() => { loadCoaches(); }, []);

  function set(field: keyof NuevoCoach) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      await api.post("/api/coaches", {
        ...form,
        especialidad: form.especialidad || undefined,
        telefono: form.telefono || undefined,
      });
      setSuccessMsg(`Coach ${form.nombre} creado correctamente`);
      setForm({ nombre: "", email: "", password: "coach123", especialidad: "", telefono: "" });
      setShowForm(false);
      loadCoaches();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedPage roles={["ADMIN"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Coaches</h1>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            {showForm ? <><X size={15} className="mr-1" />Cancelar</> : <><Plus size={15} className="mr-1" />Nuevo coach</>}
          </Button>
        </div>

        {error && <Alert type="error">{error}</Alert>}
        {successMsg && <Alert type="success">{successMsg}</Alert>}

        {showForm && (
          <Card className="border-sky-200">
            <CardHeader><CardTitle>Nuevo coach</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input id="nombre" label="Nombre completo" placeholder="Ana Martínez" value={form.nombre} onChange={set("nombre")} required className="col-span-2" />
                  <Input id="email" label="Email" type="email" placeholder="ana@castrogym.com" value={form.email} onChange={set("email")} required />
                  <Input id="password" label="Contraseña inicial" type="text" value={form.password} onChange={set("password")} required />
                  <Input id="especialidad" label="Especialidad" placeholder="Ej: CrossFit" value={form.especialidad} onChange={set("especialidad")} />
                  <Input id="telefono" label="Teléfono" placeholder="+56912345678" value={form.telefono} onChange={set("telefono")} />
                </div>
                <Button type="submit" loading={saving}>Crear coach</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : coaches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No hay coaches registrados aún
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {coaches.map((c) => (
              <Card key={c.id}>
                <CardContent className="pt-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold flex-shrink-0">
                      {c.usuario.nombre.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{c.usuario.nombre}</p>
                      <p className="text-sm text-gray-500">{c.usuario.email}</p>
                      {c.especialidad && <p className="text-xs text-gray-400">{c.especialidad}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.activo ? "success" : "danger"}>
                      {c.activo ? "Activo" : "Inactivo"}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {c.horarios.length} días
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
