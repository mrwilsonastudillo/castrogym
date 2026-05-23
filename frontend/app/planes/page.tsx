"use client";
import { useEffect, useState, useRef } from "react";
import {
  Crown, Plus, FileText, ChevronDown, ChevronUp,
  Upload, Check, Loader2, AlertCircle, Eye, EyeOff,
} from "lucide-react";
import { api, fileToBase64, PlanVIP, Cliente } from "@/lib/api";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Spinner } from "@/components/ui";

const SECCIONES = [
  { key: "dieta",           label: "Dieta / Alimentación" },
  { key: "habitos",         label: "Hábitos" },
  { key: "restricciones",   label: "Restricciones" },
  { key: "suplementacion",  label: "Suplementación" },
  { key: "metaFisica",      label: "Meta física" },
  { key: "recomendaciones", label: "Recomendaciones" },
  { key: "observaciones",   label: "Observaciones" },
] as const;

interface PdfPreview {
  textoCompleto: string;
  seccionesDetectadas: boolean;
  dieta?: string;
  habitos?: string;
  restricciones?: string;
  suplementacion?: string;
  metaFisica?: string;
  recomendaciones?: string;
  observaciones?: string;
}

interface NuevoPlanForm {
  clienteId: string;
  titulo: string;
  objetivo: string;
  fechaInicio: string;
  fechaFin: string;
  dieta: string;
  habitos: string;
  restricciones: string;
  suplementacion: string;
  metaFisica: string;
  recomendaciones: string;
  observaciones: string;
  pdfBase64: string;
  pdfNombre: string;
}

const FORM_EMPTY: NuevoPlanForm = {
  clienteId: "", titulo: "", objetivo: "",
  fechaInicio: new Date().toISOString().slice(0, 10),
  fechaFin: "", dieta: "", habitos: "", restricciones: "",
  suplementacion: "", metaFisica: "", recomendaciones: "",
  observaciones: "", pdfBase64: "", pdfNombre: "",
};

function PlanCard({ plan, onEdit }: { plan: PlanVIP; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={plan.activo ? "ring-1 ring-sky-200" : "opacity-70"}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-gray-900 text-sm">{plan.titulo}</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">v{plan.version}</span>
              {plan.activo
                ? <Badge variant="success">Activo</Badge>
                : <Badge variant="default">Inactivo</Badge>}
            </div>
            {plan.objetivo && <p className="text-xs text-gray-500 mb-1">{plan.objetivo}</p>}
            <p className="text-xs text-gray-400">
              Coach: {plan.coach?.usuario.nombre} · {new Date(plan.fechaInicio).toLocaleDateString("es-CL")}
              {plan.fechaFin && ` → ${new Date(plan.fechaFin).toLocaleDateString("es-CL")}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {plan.activo && (
              <button onClick={onEdit} className="text-xs text-sky-500 hover:text-sky-600 font-medium">
                Editar
              </button>
            )}
            <button onClick={() => setExpanded((e) => !e)} className="text-gray-400 hover:text-gray-600">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
            {SECCIONES.filter(({ key }) => plan[key as keyof PlanVIP]).map(({ key, label }) => (
              <div key={key}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{plan[key as keyof PlanVIP] as string}</p>
              </div>
            ))}
            {/* Si solo tiene texto sin secciones estructuradas */}
            {SECCIONES.every(({ key }) => !plan[key as keyof PlanVIP]) && plan.textoExtraido && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Contenido del plan</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{plan.textoExtraido}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Formulario ───────────────────────────────────────────────────────────────

function FormularioPlan({
  clientesVIP,
  clientePreseleccionado,
  editandoId,
  initialForm,
  onSaved,
  onClose,
}: {
  clientesVIP: Cliente[];
  clientePreseleccionado: string;
  editandoId: string | null;
  initialForm: NuevoPlanForm;
  onSaved: (clienteId: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<NuevoPlanForm>(initialForm);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<PdfPreview | null>(null);
  const [mostrarTextoCompleto, setMostrarTextoCompleto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const f = (k: keyof NuevoPlanForm, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  async function handlePDF(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfLoading(true);
    setError("");
    setPdfPreview(null);

    try {
      const base64 = await fileToBase64(file);
      f("pdfBase64", base64);
      f("pdfNombre", file.name);

      // Llamar al endpoint de preview
      const preview = await api.post<PdfPreview>("/api/planes/preview-pdf", { pdfBase64: base64 });
      setPdfPreview(preview);

      // Auto-rellenar secciones que estén vacías en el formulario
      if (preview.seccionesDetectadas) {
        setForm((prev) => ({
          ...prev,
          pdfBase64: base64,
          pdfNombre: file.name,
          dieta:           prev.dieta           || preview.dieta           || "",
          habitos:         prev.habitos          || preview.habitos         || "",
          restricciones:   prev.restricciones    || preview.restricciones   || "",
          suplementacion:  prev.suplementacion   || preview.suplementacion  || "",
          metaFisica:      prev.metaFisica       || preview.metaFisica      || "",
          recomendaciones: prev.recomendaciones  || preview.recomendaciones || "",
          observaciones:   prev.observaciones    || preview.observaciones   || "",
        }));
      } else {
        // Sin secciones detectadas: volcar todo en recomendaciones para que sea visible
        setForm((prev) => ({
          ...prev,
          pdfBase64: base64,
          pdfNombre: file.name,
          recomendaciones: prev.recomendaciones || preview.textoCompleto || "",
        }));
      }
    } catch (err: any) {
      // Falla silenciosa: guardar PDF pero sin preview
      const base64 = await fileToBase64(file).catch(() => "");
      if (base64) { f("pdfBase64", base64); f("pdfNombre", file.name); }
      setError(err.message || "No se pudo extraer el texto. Puedes editarlo manualmente.");
    } finally {
      setPdfLoading(false);
    }
  }

  async function guardar() {
    setError("");
    setGuardando(true);
    try {
      const body = {
        clienteId: form.clienteId || clientePreseleccionado,
        titulo: form.titulo,
        objetivo: form.objetivo || undefined,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin || undefined,
        dieta:           form.dieta           || undefined,
        habitos:         form.habitos          || undefined,
        restricciones:   form.restricciones    || undefined,
        suplementacion:  form.suplementacion   || undefined,
        metaFisica:      form.metaFisica       || undefined,
        recomendaciones: form.recomendaciones  || undefined,
        observaciones:   form.observaciones    || undefined,
        pdfBase64:       form.pdfBase64        || undefined,
      };
      if (editandoId) {
        await api.patch(`/api/planes/${editandoId}`, body);
      } else {
        await api.post("/api/planes", body);
      }
      onSaved(body.clienteId ?? "");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const inp = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-sky-500";
  const ta  = `${inp} resize-none`;
  const cid = form.clienteId || clientePreseleccionado;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Crown size={18} className="text-amber-500" />
            {editandoId ? "Editar plan" : "Nuevo plan VIP"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Cliente */}
        {!editandoId && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cliente VIP *</label>
            <select value={form.clienteId} onChange={(e) => f("clienteId", e.target.value)} className={inp}>
              <option value="">{clientePreseleccionado ? "(cliente del panel)" : "— Seleccionar —"}</option>
              {clientesVIP.map((c) => (
                <option key={c.id} value={c.id}>{c.usuario.nombre} ({c.usuario.email})</option>
              ))}
            </select>
          </div>
        )}

        {/* Título y objetivo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
            <input value={form.titulo} onChange={(e) => f("titulo", e.target.value)} className={inp} placeholder="Ej: Plan pérdida de grasa" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Objetivo</label>
            <input value={form.objetivo} onChange={(e) => f("objetivo", e.target.value)} className={inp} placeholder="Ej: Bajar 5kg en 3 meses" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha inicio *</label>
            <input type="date" value={form.fechaInicio} onChange={(e) => f("fechaInicio", e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha fin</label>
            <input type="date" value={form.fechaFin} onChange={(e) => f("fechaFin", e.target.value)} className={inp} />
          </div>
        </div>

        {/* Upload PDF */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            PDF del plan{" "}
            <span className="text-gray-400 font-normal">(el texto se extrae y precarga automáticamente)</span>
          </label>
          <div
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
              pdfLoading ? "border-sky-300 bg-sky-50" : "border-gray-300 hover:border-sky-400"
            }`}
            onClick={() => !pdfLoading && fileRef.current?.click()}
          >
            {pdfLoading ? (
              <div className="flex items-center justify-center gap-2 text-sky-600">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Extrayendo texto del PDF...</span>
              </div>
            ) : form.pdfNombre ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <Check size={16} /><span className="text-sm">{form.pdfNombre}</span>
                <span className="text-xs text-gray-400">(click para cambiar)</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-400">
                <Upload size={20} />
                <span className="text-sm font-medium">Subir PDF</span>
                <span className="text-xs">El texto se extrae y rellena las secciones automáticamente</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handlePDF} />

          {/* Estado del preview */}
          {pdfPreview && (
            <div className={`mt-2 px-3 py-2 rounded-lg text-xs flex items-start gap-2 ${
              pdfPreview.seccionesDetectadas
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {pdfPreview.seccionesDetectadas ? (
                <>
                  <Check size={14} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Secciones detectadas automáticamente. Revisa y edita los campos abajo antes de guardar.
                    {" "}
                    <button
                      className="underline font-medium"
                      onClick={() => setMostrarTextoCompleto((v) => !v)}
                    >
                      {mostrarTextoCompleto ? "Ocultar texto original" : "Ver texto original del PDF"}
                    </button>
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>
                    No se detectaron secciones con encabezados. El texto completo se cargó en
                    &quot;Recomendaciones&quot;. Edítalo libremente.
                    {" "}
                    <button
                      className="underline font-medium"
                      onClick={() => setMostrarTextoCompleto((v) => !v)}
                    >
                      {mostrarTextoCompleto ? "Ocultar" : "Ver texto original"}
                    </button>
                  </span>
                </>
              )}
            </div>
          )}

          {/* Texto completo expandible */}
          {mostrarTextoCompleto && pdfPreview?.textoCompleto && (
            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-500">TEXTO EXTRAÍDO DEL PDF</p>
                <button onClick={() => setMostrarTextoCompleto(false)} className="text-gray-400 hover:text-gray-600">
                  <EyeOff size={14} />
                </button>
              </div>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed font-sans">
                {pdfPreview.textoCompleto}
              </pre>
            </div>
          )}
        </div>

        {/* Secciones del plan */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Secciones del plan{" "}
            <span className="normal-case font-normal text-gray-400">(edita o completa lo que el PDF no detectó)</span>
          </p>
          {SECCIONES.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <textarea
                value={form[key as keyof NuevoPlanForm] as string}
                onChange={(e) => f(key as keyof NuevoPlanForm, e.target.value)}
                rows={3}
                className={ta}
                placeholder={`${label}...`}
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />{error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            className="flex-1"
            loading={guardando}
            disabled={!form.titulo || !form.fechaInicio || (!editandoId && !cid)}
            onClick={guardar}
          >
            {editandoId ? "Guardar cambios" : "Crear plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

function PlanesContent() {
  const [clientesVIP, setClientesVIP] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");
  const [planes, setPlanes] = useState<PlanVIP[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [initialForm, setInitialForm] = useState<NuevoPlanForm>(FORM_EMPTY);
  const [ok, setOk] = useState("");

  useEffect(() => {
    api.get<Cliente[]>("/api/clientes?esVIP=true").then(setClientesVIP).catch(() => {});
  }, []);

  useEffect(() => {
    if (!clienteSeleccionado) { setPlanes([]); return; }
    setLoading(true);
    api.get<PlanVIP[]>(`/api/planes/cliente/${clienteSeleccionado}`)
      .then(setPlanes).catch(() => setPlanes([]))
      .finally(() => setLoading(false));
  }, [clienteSeleccionado]);

  function recargar(cid: string) {
    const id = cid || clienteSeleccionado;
    if (id) {
      api.get<PlanVIP[]>(`/api/planes/cliente/${id}`).then(setPlanes).catch(() => {});
    }
    setShowForm(false);
    setEditandoId(null);
    setOk("Plan guardado correctamente");
    setTimeout(() => setOk(""), 3000);
  }

  function abrirEdicion(plan: PlanVIP) {
    setEditandoId(plan.id);
    setInitialForm({
      clienteId: plan.clienteId,
      titulo: plan.titulo,
      objetivo: plan.objetivo ?? "",
      fechaInicio: plan.fechaInicio.slice(0, 10),
      fechaFin: plan.fechaFin?.slice(0, 10) ?? "",
      dieta: plan.dieta ?? "",
      habitos: plan.habitos ?? "",
      restricciones: plan.restricciones ?? "",
      suplementacion: plan.suplementacion ?? "",
      metaFisica: plan.metaFisica ?? "",
      recomendaciones: plan.recomendaciones ?? "",
      observaciones: plan.observaciones ?? "",
      pdfBase64: "",
      pdfNombre: "",
    });
    setShowForm(true);
  }

  function abrirNuevo() {
    setEditandoId(null);
    setInitialForm(FORM_EMPTY);
    setShowForm(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400">Gestión</p>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Crown size={22} className="text-amber-500" />Planes VIP
          </h1>
        </div>
        <Button onClick={abrirNuevo} size="sm">
          <Plus size={14} className="mr-1.5" />Nuevo plan
        </Button>
      </div>

      {/* Selector de cliente */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Seleccionar cliente VIP</label>
          <select
            value={clienteSeleccionado}
            onChange={(e) => setClienteSeleccionado(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:border-sky-500"
          >
            <option value="">— Seleccionar —</option>
            {clientesVIP.map((c) => (
              <option key={c.id} value={c.id}>{c.usuario.nombre} — {c.usuario.email}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Lista de planes */}
      {loading && <div className="flex justify-center py-8"><Spinner /></div>}
      {!loading && clienteSeleccionado && planes.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-8">Este cliente no tiene planes aún.</p>
      )}
      {planes.map((p) => (
        <PlanCard key={p.id} plan={p} onEdit={() => abrirEdicion(p)} />
      ))}

      {/* Formulario en modal */}
      {showForm && (
        <FormularioPlan
          clientesVIP={clientesVIP}
          clientePreseleccionado={clienteSeleccionado}
          editandoId={editandoId}
          initialForm={initialForm}
          onSaved={recargar}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Toast de éxito */}
      {ok && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 z-50">
          <Check size={16} />{ok}
        </div>
      )}
    </div>
  );
}

export default function PlanesPage() {
  return (
    <ProtectedPage roles={["ADMIN", "COACH"]}>
      <PlanesContent />
    </ProtectedPage>
  );
}
