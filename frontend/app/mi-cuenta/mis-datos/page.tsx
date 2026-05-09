"use client";
import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Alert, Badge } from "@/components/ui";
import { Download, Trash2, Shield, Crown, Smile, Lock, Camera, User } from "lucide-react";
import { api } from "@/lib/api";
import { AvatarSelector, UserAvatar } from "@/components/UserAvatar";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function MisDatosPage() {
  const { user, login } = useAuth();

  // ── Estados generales ──────────────────────────────
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Cambio de contraseña ───────────────────────────
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // ── Datos coach ────────────────────────────────────
  const [coachForm, setCoachForm] = useState({
    nombre: user?.nombre ?? "",
    especialidad: "",
    telefono: "",
  });
  const [coachSaving, setCoachSaving] = useState(false);

  // ── Foto coach ─────────────────────────────────────
  const [fotoPreview, setFotoPreview] = useState<string | null>(
    user?.fotoPerfil ? `${API}${user.fotoPerfil}` : null
  );
  const [fotoSaving, setFotoSaving] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  // ── CLIENTE: estados existentes ────────────────────
  const [exportando, setExportando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);

  // ── Helpers ────────────────────────────────────────
  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  function handleAvatarSaved(id: string) {
    const token = localStorage.getItem("cg_token");
    if (token && user) login(token, { ...user, avatarPersonaje: id });
    showSuccess("Personaje guardado correctamente.");
  }

  // ── Cambiar contraseña ─────────────────────────────
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError("Las contraseñas nuevas no coinciden");
      return;
    }
    setPwSaving(true);
    try {
      const res = await api.patch<{ message: string }>("/api/auth/change-password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwSuccess(res.message);
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err: any) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  // ── Guardar datos coach ────────────────────────────
  async function handleSaveCoach(e: React.FormEvent) {
    e.preventDefault();
    setCoachSaving(true);
    setError("");
    try {
      await api.patch("/api/coaches/me", {
        nombre: coachForm.nombre || undefined,
        especialidad: coachForm.especialidad || null,
        telefono: coachForm.telefono || null,
      });
      const token = localStorage.getItem("cg_token");
      if (token && user) login(token, { ...user, nombre: coachForm.nombre || user.nombre });
      showSuccess("Datos actualizados correctamente");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCoachSaving(false);
    }
  }

  // ── Subir foto coach ───────────────────────────────
  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no debe superar 2 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setFotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSaveFoto() {
    if (!fotoPreview || fotoPreview.startsWith("http")) return;
    setFotoSaving(true);
    setError("");
    try {
      const res = await api.post<{ fotoPerfil: string }>("/api/coaches/me/foto", {
        fotoBase64: fotoPreview,
      });
      const token = localStorage.getItem("cg_token");
      if (token && user) login(token, { ...user, fotoPerfil: res.fotoPerfil });
      showSuccess("Foto actualizada correctamente");
      setFotoPreview(`${API}${res.fotoPerfil}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFotoSaving(false);
    }
  }

  // ── CLIENTE: exportar datos ────────────────────────
  async function exportarDatos() {
    setExportando(true);
    setError("");
    try {
      const token = localStorage.getItem("cg_token");
      const res = await fetch(
        `${API}/api/clientes/me/export`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Error al exportar datos");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mis-datos-castro-gym.json";
      a.click();
      URL.revokeObjectURL(url);
      showSuccess("Tus datos han sido descargados correctamente.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExportando(false);
    }
  }

  async function solicitarEliminacion() {
    setEliminando(true);
    setError("");
    try {
      await api.delete<any>("/api/clientes/me");
      showSuccess("Tu cuenta ha sido marcada para desactivación. Tus datos se conservarán por 5 años.");
      setConfirmEliminar(false);
      setTimeout(() => {
        localStorage.removeItem("cg_token");
        window.location.href = "/login";
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEliminando(false);
    }
  }

  const isNewFoto = fotoPreview && !fotoPreview.startsWith("http");

  return (
    <ProtectedPage roles={["CLIENTE", "COACH", "ADMIN"]}>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <p className="text-sm text-gray-400 font-medium">Cuenta</p>
          <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        </div>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {/* ── Información de cuenta ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield size={17} className="text-sky-500" />
              <CardTitle className="text-base">Información de cuenta</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-5">
              {user?.rol === "CLIENTE" && (
                <UserAvatar personajeId={user?.avatarPersonaje} size={56} showName />
              )}
              {user?.rol === "COACH" && (
                <div className="h-14 w-14 rounded-full overflow-hidden bg-sky-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                  {fotoPreview ? (
                    <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sky-700 font-bold text-xl">{user.nombre.charAt(0)}</span>
                  )}
                </div>
              )}
              {user?.rol === "ADMIN" && (
                <div className="h-14 w-14 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <User size={28} className="text-violet-600" />
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900 text-lg">{user?.nombre}</p>
                <p className="text-sm text-gray-400">{user?.email}</p>
                {user?.rol === "CLIENTE" && (
                  user?.esVIP ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-1">
                      <Crown size={10} />Membresía VIP
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mt-1">
                      Membresía STANDARD
                    </span>
                  )
                )}
                {user?.rol !== "CLIENTE" && (
                  <span className="inline-flex items-center text-xs font-medium bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full mt-1">{user?.rol}</span>
                )}
              </div>
            </div>

            <dl className="space-y-2.5 text-sm border-t border-gray-100 pt-4">
              <div className="flex justify-between items-center">
                <dt className="text-gray-400">Nombre completo</dt>
                <dd className="font-medium text-gray-800">{user?.nombre}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-400">Email</dt>
                <dd className="text-gray-600">{user?.email}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-400">Rol</dt>
                <dd><Badge variant="info">{user?.rol}</Badge></dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* ── Editar datos (COACH) ── */}
        {user?.rol === "COACH" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User size={17} className="text-sky-500" />
                <CardTitle className="text-base">Mis datos personales</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCoach} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    id="coach-nombre"
                    label="Nombre completo"
                    value={coachForm.nombre}
                    onChange={(e) => setCoachForm((p) => ({ ...p, nombre: e.target.value }))}
                    className="col-span-2"
                  />
                  <Input
                    id="coach-especialidad"
                    label="Especialidad"
                    placeholder="Ej: CrossFit, Pilates"
                    value={coachForm.especialidad}
                    onChange={(e) => setCoachForm((p) => ({ ...p, especialidad: e.target.value }))}
                  />
                  <Input
                    id="coach-telefono"
                    label="Teléfono"
                    placeholder="+56912345678"
                    value={coachForm.telefono}
                    onChange={(e) => setCoachForm((p) => ({ ...p, telefono: e.target.value }))}
                  />
                </div>
                <Button type="submit" loading={coachSaving} size="sm">Guardar datos</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Foto de perfil (COACH) ── */}
        {user?.rol === "COACH" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Camera size={17} className="text-sky-500" />
                <CardTitle className="text-base">Foto de perfil</CardTitle>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Los clientes verán tu foto al agendar sus medidas.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-5">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-sky-100 flex items-center justify-center flex-shrink-0 border-2 border-gray-200">
                  {fotoPreview ? (
                    <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={28} className="text-sky-400" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFotoChange}
                  />
                  <Button size="sm" variant="secondary" onClick={() => fotoInputRef.current?.click()}>
                    <Camera size={14} className="mr-1.5" />
                    {fotoPreview ? "Cambiar foto" : "Subir foto"}
                  </Button>
                  {isNewFoto && (
                    <Button size="sm" loading={fotoSaving} onClick={handleSaveFoto}>
                      Guardar foto
                    </Button>
                  )}
                  <p className="text-xs text-gray-400">JPG, PNG o WebP · Máx. 2 MB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Selector de avatar (CLIENTE) ── */}
        {user?.rol === "CLIENTE" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smile size={17} className="text-violet-500" />
                <CardTitle className="text-base">Mi personaje</CardTitle>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Escoge el personaje que te representa en Castro Gym.
              </p>
            </CardHeader>
            <CardContent>
              <AvatarSelector currentId={user?.avatarPersonaje} onSave={handleAvatarSaved} />
            </CardContent>
          </Card>
        )}

        {/* ── Cambiar contraseña (todos los roles) ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock size={17} className="text-gray-500" />
              <CardTitle className="text-base">Cambiar contraseña</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {pwError && <Alert type="error" className="mb-4">{pwError}</Alert>}
            {pwSuccess && <Alert type="success" className="mb-4">{pwSuccess}</Alert>}
            <form onSubmit={handleChangePassword} className="space-y-3">
              <Input
                id="current-pw"
                label="Contraseña actual"
                type="password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                required
                autoComplete="current-password"
              />
              <Input
                id="new-pw"
                label="Nueva contraseña"
                type="password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <Input
                id="confirm-pw"
                label="Confirmar nueva contraseña"
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                required
                autoComplete="new-password"
              />
              <Button type="submit" size="sm" loading={pwSaving}>
                <Lock size={14} className="mr-1.5" />
                Actualizar contraseña
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── VIP benefits (CLIENTE) ── */}
        {user?.rol === "CLIENTE" && user?.esVIP && (
          <Card className="border-amber-200 bg-amber-50/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown size={17} className="text-amber-500" />
                <CardTitle className="text-base text-amber-800">Beneficios VIP activos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-amber-800">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  Cancelación flexible hasta <strong>30 minutos</strong> antes de la cita
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  Agendamiento con hasta <strong>60 días</strong> de anticipación
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  Acceso a reporte completo con <strong>ICC y gráficas avanzadas</strong>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}

        {user?.rol === "CLIENTE" && !user?.esVIP && (
          <Card className="border-dashed border-gray-300">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <Crown size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Desbloquea los beneficios VIP</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Cancelación en 30 min · 60 días de anticipación · ICC + gráficas avanzadas
                  </p>
                  <p className="text-xs text-sky-600 mt-2 font-medium">
                    Contacta al administrador para actualizar tu membresía →
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Derechos ARCO (solo CLIENTE) ── */}
        {user?.rol === "CLIENTE" && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Download size={17} className="text-gray-400" />
                  <CardTitle className="text-base">Descargar mis datos (Derecho de Acceso)</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  Descarga un archivo JSON con toda tu información: perfil, mediciones, citas y membresías.
                </p>
                <Button onClick={exportarDatos} loading={exportando} variant="secondary" size="sm">
                  <Download size={14} className="mr-1.5" />
                  Descargar mis datos
                </Button>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trash2 size={17} className="text-red-400" />
                  <CardTitle className="text-base text-red-700">Eliminar cuenta (Derecho de Cancelación)</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  Por normativa fiscal colombiana (Ley 1581), tus datos se conservarán 5 años. No podrás acceder a la plataforma tras la desactivación.
                </p>
                {!confirmEliminar ? (
                  <Button variant="danger" size="sm" onClick={() => setConfirmEliminar(true)}>
                    <Trash2 size={14} className="mr-1.5" />
                    Solicitar eliminación
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Alert type="error">
                      ¿Confirmas? Tu cuenta se desactivará inmediatamente y tus datos se conservarán 5 años.
                    </Alert>
                    <div className="flex gap-3">
                      <Button variant="danger" size="sm" loading={eliminando} onClick={solicitarEliminacion}>
                        Confirmar
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setConfirmEliminar(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </ProtectedPage>
  );
}
