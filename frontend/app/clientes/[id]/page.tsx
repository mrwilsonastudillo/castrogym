"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import { api, Cliente, Medicion } from "@/lib/api";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Alert, Spinner, Badge, Select } from "@/components/ui";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtNum(v: number | null | undefined, dec = 1) {
  return v == null ? "—" : v.toFixed(dec);
}

// ─── Tab: Perfil ──────────────────────────────────────────────────────────────

function TabPerfil({ cliente, onSaved }: { cliente: Cliente; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [ok, setOk]         = useState("");

  const [form, setForm] = useState({
    nombre:          cliente.usuario.nombre,
    email:           cliente.usuario.email,
    telefono:        cliente.telefono ?? "",
    genero:          cliente.genero,
    fechaNacimiento: cliente.fechaNacimiento
      ? new Date(cliente.fechaNacimiento).toISOString().slice(0, 10)
      : "",
    objetivo:        cliente.objetivo,
    limitacionesFisicas: cliente.limitacionesFisicas ?? "",
    password:        "",
  });

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setOk("");
    try {
      const body: Record<string, unknown> = {
        nombre:          form.nombre  || undefined,
        email:           form.email   || undefined,
        telefono:        form.telefono || undefined,
        genero:          form.genero  || undefined,
        objetivo:        form.objetivo || undefined,
        limitacionesFisicas: form.limitacionesFisicas || undefined,
        fechaNacimiento: form.fechaNacimiento
          ? new Date(form.fechaNacimiento).toISOString()
          : undefined,
      };
      if (form.password) body.password = form.password;
      await api.patch(`/api/clientes/${cliente.id}`, body);
      setOk("Perfil actualizado correctamente");
      setEditing(false);
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Datos del cliente</CardTitle>
          {!editing && (
            <Button size="sm" variant="ghost" onClick={() => { setEditing(true); setOk(""); setError(""); }}>
              <Pencil size={14} className="mr-1" />Editar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && <Alert type="error" className="mb-4">{error}</Alert>}
        {ok    && <Alert type="success" className="mb-4">{ok}</Alert>}

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input id="nombre" label="Nombre completo" value={form.nombre} onChange={set("nombre")} className="col-span-2" required />
              <Input id="email"  label="Email"           value={form.email}  onChange={set("email")}  type="email" required />
              <Input id="tel"    label="Teléfono"        value={form.telefono} onChange={set("telefono")} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Género</label>
                <select
                  value={form.genero}
                  onChange={set("genero")}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                </select>
              </div>
              <Input id="fn" label="Fecha de nacimiento" type="date" value={form.fechaNacimiento} onChange={set("fechaNacimiento")} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Objetivo</label>
                <select
                  value={form.objetivo}
                  onChange={set("objetivo")}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="PERDIDA_PESO">Pérdida de peso</option>
                  <option value="GANANCIA_MUSCULAR">Ganancia muscular</option>
                  <option value="TONIFICACION">Tonificación</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <Input id="lim" label="Limitaciones físicas" value={form.limitacionesFisicas} onChange={set("limitacionesFisicas")} className="col-span-2" />
              <Input id="pwd" label="Nueva contraseña (dejar vacío para no cambiar)" type="password" value={form.password} onChange={set("password")} placeholder="mínimo 6 caracteres" className="col-span-2" />
            </div>
            <div className="flex gap-3">
              <Button type="submit" loading={saving}><Save size={14} className="mr-1" />Guardar</Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}><X size={14} className="mr-1" />Cancelar</Button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ["Nombre",       cliente.usuario.nombre],
              ["Email",        cliente.usuario.email],
              ["Teléfono",     cliente.telefono],
              ["Género",       cliente.genero === "M" ? "Masculino" : "Femenino"],
              ["Nacimiento",   cliente.fechaNacimiento ? fmtFecha(cliente.fechaNacimiento) : "—"],
              ["Objetivo",     cliente.objetivo?.replace("_", " ")],
              ["Limitaciones", cliente.limitacionesFisicas || "—"],
              ["VIP",          cliente.esVIP ? "Sí" : "No"],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs text-gray-400 font-medium">{label}</dt>
                <dd className="text-gray-900 font-medium mt-0.5">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tab: Mediciones ──────────────────────────────────────────────────────────

function TabMediciones({ clienteId }: { clienteId: string }) {
  const [mediciones, setMediciones] = useState<Medicion[]>([]);
  const [loading, setLoading]       = useState(true);
  const [editId, setEditId]         = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [ok, setOk]                 = useState("");

  const emptyForm = {
    pesoKg: "", estaturaCm: "", toraxCm: "", cinturaCm: "",
    caderaCm: "", bicepsCm: "", musloCm: "", pantorrillaCm: "",
    porcentajeGrasa: "", masaMuscular: "", densidadOsea: "", notas: "",
  };
  const [form, setForm] = useState(emptyForm);

  function load() {
    setLoading(true);
    api.get<Medicion[]>(`/api/mediciones/cliente/${clienteId}`)
      .then(setMediciones)
      .catch(() => setMediciones([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [clienteId]);

  function openEdit(m: Medicion) {
    setEditId(m.id);
    setError(""); setOk("");
    setForm({
      pesoKg:         String(m.pesoKg),
      estaturaCm:     String(m.estaturaCm),
      toraxCm:        m.toraxCm        != null ? String(m.toraxCm)        : "",
      cinturaCm:      m.cinturaCm      != null ? String(m.cinturaCm)      : "",
      caderaCm:       m.caderaCm       != null ? String(m.caderaCm)       : "",
      bicepsCm:       m.bicepsCm       != null ? String(m.bicepsCm)       : "",
      musloCm:        m.musloCm        != null ? String(m.musloCm)        : "",
      pantorrillaCm:  m.pantorrillaCm  != null ? String(m.pantorrillaCm)  : "",
      porcentajeGrasa: m.grasaEstimada ? "" : (m.porcentajeGrasa != null ? String(m.porcentajeGrasa) : ""),
      masaMuscular:   m.masaMuscular   != null ? String(m.masaMuscular)   : "",
      densidadOsea:   m.densidadOsea   != null ? String(m.densidadOsea)   : "",
      notas:          m.notas ?? "",
    });
  }

  function set(k: keyof typeof emptyForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));
  }

  function numOrNull(v: string) {
    const n = parseFloat(v);
    return v.trim() === "" ? null : isNaN(n) ? null : n;
  }
  function intOrNull(v: string) {
    const n = parseInt(v);
    return v.trim() === "" ? null : isNaN(n) ? null : n;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setSaving(true); setError(""); setOk("");
    try {
      await api.patch(`/api/mediciones/${editId}`, {
        pesoKg:        parseFloat(form.pesoKg) || undefined,
        estaturaCm:    parseInt(form.estaturaCm) || undefined,
        toraxCm:       intOrNull(form.toraxCm),
        cinturaCm:     intOrNull(form.cinturaCm),
        caderaCm:      intOrNull(form.caderaCm),
        bicepsCm:      intOrNull(form.bicepsCm),
        musloCm:       intOrNull(form.musloCm),
        pantorrillaCm: intOrNull(form.pantorrillaCm),
        porcentajeGrasa: numOrNull(form.porcentajeGrasa),
        masaMuscular:  numOrNull(form.masaMuscular),
        densidadOsea:  numOrNull(form.densidadOsea),
        notas:         form.notas || null,
      });
      setOk("Medición actualizada y recalculada");
      setEditId(null);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      {ok    && <Alert type="success">{ok}</Alert>}

      {mediciones.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-gray-400 text-sm">Sin mediciones registradas</CardContent></Card>
      ) : (
        mediciones.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  {fmtFecha(m.fechaMedicion)}
                  {m.coach && <span className="text-gray-400 font-normal ml-2">· {m.coach.usuario.nombre}</span>}
                </CardTitle>
                {editId === m.id ? (
                  <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>
                    <X size={13} className="mr-1" />Cancelar
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => openEdit(m)}>
                    <Pencil size={13} className="mr-1" />Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editId === m.id ? (
                <form onSubmit={handleSave} className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <Input id="peso"  label="Peso (kg)"    type="number" step="0.1" value={form.pesoKg}    onChange={set("pesoKg")}    required />
                    <Input id="estat" label="Estatura (cm)" type="number" step="1"   value={form.estaturaCm} onChange={set("estaturaCm")} required placeholder="Ej: 165" />
                    <Input id="torax" label="Tórax (cm)"   type="number" step="1"   value={form.toraxCm}   onChange={set("toraxCm")} />
                    <Input id="cin"   label="Cintura (cm)" type="number" step="1"   value={form.cinturaCm} onChange={set("cinturaCm")} />
                    <Input id="cad"   label="Cadera (cm)"  type="number" step="1"   value={form.caderaCm}  onChange={set("caderaCm")} />
                    <Input id="bic"   label="Bíceps (cm)"  type="number" step="1"   value={form.bicepsCm}  onChange={set("bicepsCm")} />
                    <Input id="mus"   label="Muslo (cm)"   type="number" step="1"   value={form.musloCm}   onChange={set("musloCm")} />
                    <Input id="pan"   label="Pantorrilla (cm)" type="number" step="1" value={form.pantorrillaCm} onChange={set("pantorrillaCm")} />
                    <Input id="gra"   label="% Grasa (vacío=auto)" type="number" step="0.1" value={form.porcentajeGrasa} onChange={set("porcentajeGrasa")} placeholder="Auto" />
                    <Input id="mus2"  label="Masa muscular (kg)" type="number" step="0.1" value={form.masaMuscular} onChange={set("masaMuscular")} />
                    <Input id="den"   label="Densidad ósea" type="number" step="0.01" value={form.densidadOsea} onChange={set("densidadOsea")} />
                    <Input id="not"   label="Notas" value={form.notas} onChange={set("notas")} className="col-span-3" />
                  </div>
                  <p className="text-xs text-gray-400">IMC e ICC se recalculan automáticamente al guardar.</p>
                  <Button type="submit" size="sm" loading={saving}><Save size={13} className="mr-1" />Guardar corrección</Button>
                </form>
              ) : (
                <dl className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
                  {[
                    ["Peso",       `${m.pesoKg} kg`],
                    ["Estatura",   `${m.estaturaCm} cm`],
                    ["IMC",        fmtNum(m.imc)],
                    ["% Grasa",    `${fmtNum(m.porcentajeGrasa)}${m.grasaEstimada ? " (est.)" : ""}`],
                    ["ICC",        fmtNum(m.icc, 3)],
                    ["ICC Clasif", m.iccClasificacion ?? "—"],
                    ["Cintura",    m.cinturaCm   ? `${m.cinturaCm} cm`  : "—"],
                    ["Cadera",     m.caderaCm    ? `${m.caderaCm} cm`   : "—"],
                    ["Tórax",      m.toraxCm     ? `${m.toraxCm} cm`    : "—"],
                    ["Bíceps",     m.bicepsCm    ? `${m.bicepsCm} cm`   : "—"],
                    ["Muslo",      m.musloCm     ? `${m.musloCm} cm`    : "—"],
                    ["Pantorrilla",m.pantorrillaCm ? `${m.pantorrillaCm} cm` : "—"],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="text-xs text-gray-400">{label}</dt>
                      <dd className="font-medium text-gray-800 mt-0.5">{value}</dd>
                    </div>
                  ))}
                  {m.notas && (
                    <div className="col-span-3">
                      <dt className="text-xs text-gray-400">Notas</dt>
                      <dd className="text-gray-700 mt-0.5">{m.notas}</dd>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"perfil" | "mediciones">("perfil");

  function loadCliente() {
    api.get<Cliente>(`/api/clientes/${id}`)
      .then(setCliente)
      .catch(() => router.push("/clientes"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadCliente(); }, [id]);

  return (
    <ProtectedPage roles={["ADMIN"]}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-sm text-gray-400 font-medium">Clientes</p>
            <h1 className="text-2xl font-bold text-gray-900">
              {loading ? "Cargando…" : cliente?.usuario.nombre}
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : cliente ? (
          <>
            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200">
              {(["perfil", "mediciones"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                    tab === t
                      ? "border-sky-500 text-sky-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t === "perfil" ? "Perfil" : "Mediciones"}
                </button>
              ))}
            </div>

            {tab === "perfil"     && <TabPerfil      cliente={cliente} onSaved={loadCliente} />}
            {tab === "mediciones" && <TabMediciones   clienteId={cliente.id} />}
          </>
        ) : null}
      </div>
    </ProtectedPage>
  );
}
