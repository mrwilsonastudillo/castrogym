"use client";
import { useEffect, useState } from "react";
import { Plus, X, Pencil, Power, KeyRound } from "lucide-react";
import { api, Coach } from "@/lib/api";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Alert, Spinner, Badge } from "@/components/ui";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface NuevoCoach {
  nombre: string;
  email: string;
  password: string;
  especialidad: string;
  telefono: string;
}

interface EditForm {
  nombre: string;
  email: string;
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
  const [editCoach, setEditCoach] = useState<Coach | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ nombre: "", email: "", especialidad: "", telefono: "" });
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resetCoach, setResetCoach] = useState<Coach | null>(null);
  const [resetPwd, setResetPwd]     = useState("coach123");
  const [resetting, setResetting]   = useState(false);

  function loadCoaches() {
    api.get<Coach[]>("/api/coaches/all").then(setCoaches).finally(() => setLoading(false));
  }

  useEffect(() => { loadCoaches(); }, []);

  function set(field: keyof NuevoCoach) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function setEdit(field: keyof EditForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setEditForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function openEdit(c: Coach) {
    setEditCoach(c);
    setEditForm({
      nombre: c.usuario.nombre,
      email: c.usuario.email,
      especialidad: c.especialidad ?? "",
      telefono: c.telefono ?? "",
    });
    setError("");
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

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editCoach) return;
    setSaving(true);
    setError("");
    try {
      await api.patch(`/api/coaches/${editCoach.id}`, {
        nombre: editForm.nombre || undefined,
        email: editForm.email || undefined,
        especialidad: editForm.especialidad || null,
        telefono: editForm.telefono || null,
      });
      setSuccessMsg("Coach actualizado correctamente");
      setEditCoach(null);
      loadCoaches();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetCoach) return;
    setResetting(true); setError("");
    try {
      await api.patch(`/api/coaches/${resetCoach.id}/reset-password`, { nuevaPassword: resetPwd });
      setSuccessMsg(`Contraseña de ${resetCoach.usuario.nombre} actualizada`);
      setResetCoach(null); setResetPwd("coach123");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  }

  async function handleToggleActivo(coach: Coach) {
    setTogglingId(coach.id);
    setError("");
    try {
      await api.patch(`/api/coaches/${coach.id}/activo`);
      setSuccessMsg(`Coach ${coach.activo ? "desactivado" : "activado"} correctamente`);
      loadCoaches();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <ProtectedPage roles={["ADMIN"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Coaches</h1>
          <Button onClick={() => { setShowForm(!showForm); setEditCoach(null); }} size="sm">
            {showForm ? <><X size={15} className="mr-1" />Cancelar</> : <><Plus size={15} className="mr-1" />Nuevo coach</>}
          </Button>
        </div>

        {error && <Alert type="error">{error}</Alert>}
        {successMsg && <Alert type="success">{successMsg}</Alert>}

        {/* Formulario nuevo coach */}
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

        {/* Modal reset password */}
        {resetCoach && (
          <Card className="border-orange-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Reset contraseña — {resetCoach.usuario.nombre}</CardTitle>
                <button onClick={() => setResetCoach(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="flex gap-3 items-end">
                <Input
                  id="reset-pwd"
                  label="Nueva contraseña"
                  type="text"
                  value={resetPwd}
                  onChange={(e) => setResetPwd(e.target.value)}
                  required
                  className="flex-1"
                />
                <Button type="submit" loading={resetting}>Guardar</Button>
                <Button type="button" variant="secondary" onClick={() => setResetCoach(null)}>Cancelar</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Modal editar coach */}
        {editCoach && (
          <Card className="border-amber-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Editar coach</CardTitle>
                <button onClick={() => setEditCoach(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input id="edit-nombre" label="Nombre completo" value={editForm.nombre} onChange={setEdit("nombre")} required className="col-span-2" />
                  <Input id="edit-email" label="Email" type="email" value={editForm.email} onChange={setEdit("email")} required />
                  <Input id="edit-especialidad" label="Especialidad" value={editForm.especialidad} onChange={setEdit("especialidad")} />
                  <Input id="edit-telefono" label="Teléfono" value={editForm.telefono} onChange={setEdit("telefono")} />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" loading={saving}>Guardar cambios</Button>
                  <Button type="button" variant="secondary" onClick={() => setEditCoach(null)}>Cancelar</Button>
                </div>
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
              <Card key={c.id} className={c.activo ? "" : "opacity-60"}>
                <CardContent className="pt-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* Foto o inicial */}
                    {c.fotoPerfil ? (
                      <img
                        src={`${API}${c.fotoPerfil}`}
                        alt={c.usuario.nombre}
                        className="h-10 w-10 rounded-full object-cover flex-shrink-0 border border-gray-200"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold flex-shrink-0">
                        {c.usuario.nombre.charAt(0)}
                      </div>
                    )}
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
                    <span className="text-xs text-gray-400">{c.horarios.length} días</span>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Editar">
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setResetCoach(c); setResetPwd("coach123"); setError(""); }}
                      title="Reset contraseña"
                    >
                      <KeyRound size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant={c.activo ? "danger" : "secondary"}
                      loading={togglingId === c.id}
                      onClick={() => handleToggleActivo(c)}
                      title={c.activo ? "Desactivar" : "Activar"}
                    >
                      <Power size={14} className="mr-1" />
                      {c.activo ? "Desactivar" : "Activar"}
                    </Button>
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
