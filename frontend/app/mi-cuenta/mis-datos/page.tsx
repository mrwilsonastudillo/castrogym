"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Button, Alert, Badge } from "@/components/ui";
import { Download, Trash2, Shield, Crown, Smile } from "lucide-react";
import { api } from "@/lib/api";
import { AvatarSelector, UserAvatar } from "@/components/UserAvatar";

export default function MisDatosPage() {
  const { user, login } = useAuth();
  const [exportando, setExportando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function exportarDatos() {
    setExportando(true);
    setError("");
    try {
      const token = localStorage.getItem("cg_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/clientes/me/export`,
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
      setSuccess("Tus datos han sido descargados correctamente.");
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
      setSuccess("Tu cuenta ha sido marcada para desactivación. Tus datos se conservarán por 5 años.");
      setConfirmEliminar(false);
      setTimeout(() => {
        localStorage.removeItem("cg_token");
        window.location.href = "/agendamedidas/login";
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEliminando(false);
    }
  }

  function handleAvatarSaved(id: string) {
    // Refrescar el token/usuario para que el sidebar se actualice
    const token = localStorage.getItem("cg_token");
    if (token && user) {
      login(token, { ...user, avatarPersonaje: id });
    }
    setSuccess("Personaje guardado correctamente.");
    setTimeout(() => setSuccess(""), 2500);
  }

  return (
    <ProtectedPage roles={["CLIENTE"]}>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <p className="text-sm text-gray-400 font-medium">Privacidad</p>
          <h1 className="text-2xl font-bold text-gray-900">Mis datos personales</h1>
          <p className="text-sm text-gray-400 mt-0.5">Derechos ARCO — Ley 1581 de 2012</p>
        </div>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {/* Perfil */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield size={17} className="text-sky-500" />
              <CardTitle className="text-base">Información de cuenta</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-5">
              <UserAvatar personajeId={user?.avatarPersonaje} size={56} showName />
              <div>
                <p className="font-semibold text-gray-900 text-lg">{user?.nombre}</p>
                <p className="text-sm text-gray-400">{user?.email}</p>
                {user?.esVIP ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-1">
                    <Crown size={10} />Membresía VIP
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full mt-1">
                    Membresía STANDARD
                  </span>
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

        {/* Selector de avatar */}
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
            <AvatarSelector
              currentId={user?.avatarPersonaje}
              onSave={handleAvatarSaved}
            />
          </CardContent>
        </Card>

        {/* Políticas */}
        {user?.esVIP && (
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

        {!user?.esVIP && (
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

        {/* Derechos ARCO */}
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

        {/* Eliminar cuenta */}
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
      </div>
    </ProtectedPage>
  );
}
