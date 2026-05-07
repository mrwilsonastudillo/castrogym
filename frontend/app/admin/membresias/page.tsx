"use client";
import { useEffect, useState } from "react";
import { Crown, Plus, RefreshCw } from "lucide-react";
import { api, Cliente, Membresia } from "@/lib/api";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Select, Alert, Spinner } from "@/components/ui";

const TIPO_DURACION: Record<string, number> = {
  MENSUAL: 30,
  TRIMESTRAL: 90,
  SEMESTRAL: 180,
  ANUAL: 365,
  VIP: 30,
};

function estadoBadge(estado: "ACTIVO" | "INACTIVO" | "POR_VENCER" | string) {
  if (estado === "ACTIVO") return <Badge variant="success">Activo</Badge>;
  if (estado === "POR_VENCER") return <Badge variant="warning">Por vencer</Badge>;
  return <Badge variant="danger">Inactivo</Badge>;
}

function membresiaEstadoBadge(estado: string) {
  if (estado === "ACTIVA") return <Badge variant="success">Activa</Badge>;
  if (estado === "VENCIDA") return <Badge variant="danger">Vencida</Badge>;
  return <Badge variant="default">Cancelada</Badge>;
}

interface NuevaMembresia {
  tipo: string;
  precio: string;
  notas: string;
}

export default function AdminMembresiasPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroVIP, setFiltroVIP] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [historial, setHistorial] = useState<Membresia[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NuevaMembresia>({ tipo: "MENSUAL", precio: "", notas: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function cargarClientes() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroEstado) params.set("estado", filtroEstado);
    if (filtroVIP) params.set("esVIP", "true");
    const url = `/api/clientes${params.toString() ? `?${params}` : ""}`;
    const data = await api.get<Cliente[]>(url).catch(() => []);
    setClientes(data);
    setLoading(false);
  }

  useEffect(() => { cargarClientes(); }, [filtroEstado, filtroVIP]);

  async function seleccionarCliente(c: Cliente) {
    setClienteSeleccionado(c);
    setShowForm(false);
    setLoadingHistorial(true);
    const data = await api.get<Membresia[]>(`/api/membresias/cliente/${c.id}`).catch(() => []);
    setHistorial(data);
    setLoadingHistorial(false);
  }

  async function crearMembresia() {
    if (!clienteSeleccionado || !form.precio) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const hoy = new Date();
      const dias = TIPO_DURACION[form.tipo] ?? 30;
      const fechaFin = new Date(hoy.getTime() + dias * 24 * 60 * 60 * 1000);
      await api.post("/api/membresias", {
        clienteId: clienteSeleccionado.id,
        tipo: form.tipo,
        fechaInicio: hoy.toISOString(),
        fechaFin: fechaFin.toISOString(),
        precio: parseFloat(form.precio),
        notas: form.notas || undefined,
      });
      setSuccess(`Membresía ${form.tipo} creada correctamente.`);
      setShowForm(false);
      setForm({ tipo: "MENSUAL", precio: "", notas: "" });
      // Recargar
      await seleccionarCliente(clienteSeleccionado);
      await cargarClientes();
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
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Membresías</h1>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Select
            id="filtroEstado"
            label=""
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-40"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="POR_VENCER">Por vencer</option>
            <option value="INACTIVO">Inactivos</option>
          </Select>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={filtroVIP}
              onChange={(e) => setFiltroVIP(e.target.checked)}
              className="rounded accent-sky-500"
            />
            <Crown size={14} className="text-yellow-500" />
            Solo VIP
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Lista de clientes */}
          <Card>
            <CardHeader><CardTitle>Clientes ({clientes.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : clientes.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">Sin clientes con ese filtro</p>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
                  {clientes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => seleccionarCliente(c)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${clienteSeleccionado?.id === c.id ? "bg-sky-50" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {c.esVIP && <Crown size={14} className="text-yellow-500 flex-shrink-0" />}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{c.usuario.nombre}</p>
                            <p className="text-xs text-gray-400 truncate">{c.usuario.email}</p>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {estadoBadge(c.estadoMembresia ?? "INACTIVO")}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalle del cliente seleccionado */}
          <div className="space-y-4">
            {!clienteSeleccionado ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-400 text-sm">
                  Selecciona un cliente para ver su membresía
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {clienteSeleccionado.esVIP && <Crown size={16} className="text-yellow-500" />}
                        <CardTitle>{clienteSeleccionado.usuario.nombre}</CardTitle>
                      </div>
                      {estadoBadge(clienteSeleccionado.estadoMembresia ?? "INACTIVO")}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {success && <Alert type="success">{success}</Alert>}
                    {error && <Alert type="error">{error}</Alert>}

                    {clienteSeleccionado.membresiaActual ? (
                      <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Tipo:</span>
                          <span className="font-medium">{clienteSeleccionado.membresiaActual.tipo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Vence:</span>
                          <span>{new Date(clienteSeleccionado.membresiaActual.fechaFin).toLocaleDateString("es-CL")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Estado:</span>
                          {membresiaEstadoBadge(clienteSeleccionado.membresiaActual.estado)}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Precio:</span>
                          <span>${clienteSeleccionado.membresiaActual.precio.toLocaleString("es-CL")}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Sin membresía registrada</p>
                    )}

                    <Button
                      size="sm"
                      onClick={() => setShowForm(!showForm)}
                      className="w-full"
                    >
                      <Plus size={14} className="mr-1.5" />
                      {clienteSeleccionado.membresiaActual ? "Renovar membresía" : "Registrar membresía"}
                    </Button>

                    {showForm && (
                      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                        <Select
                          id="tipo"
                          label="Tipo de membresía"
                          value={form.tipo}
                          onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                        >
                          <option value="MENSUAL">Mensual (30 días)</option>
                          <option value="TRIMESTRAL">Trimestral (90 días)</option>
                          <option value="SEMESTRAL">Semestral (180 días)</option>
                          <option value="ANUAL">Anual (365 días)</option>
                          <option value="VIP">VIP (30 días + beneficios)</option>
                        </Select>
                        <Input
                          id="precio"
                          label="Precio (COP)"
                          type="number"
                          placeholder="80000"
                          value={form.precio}
                          onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
                        />
                        <Input
                          id="notas"
                          label="Notas (opcional)"
                          value={form.notas}
                          onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                        />
                        <Button onClick={crearMembresia} loading={saving} size="sm" className="w-full">
                          <RefreshCw size={14} className="mr-1.5" />
                          Confirmar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Historial */}
                <Card>
                  <CardHeader><CardTitle>Historial de membresías</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    {loadingHistorial ? (
                      <div className="flex justify-center py-6"><Spinner /></div>
                    ) : historial.length === 0 ? (
                      <p className="text-center py-6 text-gray-400 text-sm">Sin historial</p>
                    ) : (
                      <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                        {historial.map((m) => (
                          <div key={m.id} className="px-4 py-3 text-sm flex items-center justify-between gap-2">
                            <div>
                              <p className="font-medium text-gray-800">{m.tipo}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(m.fechaInicio).toLocaleDateString("es-CL")} → {new Date(m.fechaFin).toLocaleDateString("es-CL")}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {membresiaEstadoBadge(m.estado)}
                              <span className="text-xs text-gray-500">${m.precio.toLocaleString("es-CL")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
