"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Search, Users } from "lucide-react";
import { api, Cliente } from "@/lib/api";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, Badge, Button, Spinner, Select } from "@/components/ui";
import { UserAvatar } from "@/components/UserAvatar";

function estadoBadge(estado: string) {
  if (estado === "ACTIVO") return <Badge variant="success">Activo</Badge>;
  if (estado === "POR_VENCER") return <Badge variant="warning">Por vencer</Badge>;
  return <Badge variant="danger">Inactivo</Badge>;
}

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroVIP, setFiltroVIP] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filtroEstado) params.set("estado", filtroEstado);
    if (filtroVIP) params.set("esVIP", "true");
    setLoading(true);
    api
      .get<Cliente[]>(`/api/clientes${params.toString() ? `?${params}` : ""}`)
      .then(setClientes)
      .catch(() => setClientes([]))
      .finally(() => setLoading(false));
  }, [filtroEstado, filtroVIP]);

  const filtrados = clientes.filter((c) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      c.usuario.nombre.toLowerCase().includes(q) ||
      c.usuario.email.toLowerCase().includes(q)
    );
  });

  return (
    <ProtectedPage roles={["ADMIN", "COACH"]}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-gray-400 font-medium">Gestión</p>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          </div>
          <span className="text-sm text-gray-400 pb-0.5">{filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 bg-white transition-colors"
            />
          </div>
          <Select
            id="estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-40"
          >
            <option value="">Todos</option>
            <option value="ACTIVO">Activos</option>
            <option value="POR_VENCER">Por vencer</option>
            <option value="INACTIVO">Inactivos</option>
          </Select>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap select-none">
            <input
              type="checkbox"
              checked={filtroVIP}
              onChange={(e) => setFiltroVIP(e.target.checked)}
              className="rounded accent-amber-500"
            />
            <Crown size={13} className="text-amber-500" />
            Solo VIP
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : filtrados.length === 0 ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
              <Users size={36} className="text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Sin clientes con ese filtro</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Vista escritorio: tabla */}
            <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Cliente", "Tipo", "Estado", "Membresía", "Progreso", ""].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrados.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            personajeId={(c as any).avatarPersonaje ?? null}
                            size={38}
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-gray-900">{c.usuario.nombre}</p>
                              {c.esVIP && (
                                <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                                  <Crown size={9} />VIP
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">{c.usuario.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          c.esVIP
                            ? "bg-amber-50 text-amber-700"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {c.esVIP ? "VIP" : "STANDARD"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {estadoBadge(c.estadoMembresia ?? "INACTIVO")}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {c.membresiaActual ? (
                          <div>
                            <span className="font-medium text-gray-700">{c.membresiaActual.tipo}</span>
                            <span className="text-gray-400"> · vence {new Date(c.membresiaActual.fechaFin).toLocaleDateString("es-CL")}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300">Sin membresía</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        <div>
                          <span className="font-medium text-gray-700">{c.nivelAvatar?.nombre ?? "Novato"}</span>
                          <span className="text-gray-400"> · {c.totalMediciones ?? 0} medic.</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/clientes/${c.id}`)}>
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/membresias?cliente=${c.id}`)}>
                            Membresía
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista móvil: cards */}
            <div className="md:hidden space-y-3">
              {filtrados.map((c) => (
                <div
                  key={c.id}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
                  onClick={() => router.push(`/clientes/${c.id}`)}
                >
                  <UserAvatar
                    personajeId={(c as any).avatarPersonaje ?? null}
                    size={44}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{c.usuario.nombre}</p>
                      {c.esVIP && (
                        <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                          <Crown size={9} />VIP
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{c.usuario.email}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {estadoBadge(c.estadoMembresia ?? "INACTIVO")}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ProtectedPage>
  );
}
