"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, Crown, ChevronLeft, Activity, Ruler, Dumbbell, FileText, Layers } from "lucide-react";
import { api, Cita } from "@/lib/api";
import ProtectedPage from "@/components/layouts/ProtectedPage";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Alert, Spinner, Textarea } from "@/components/ui";
import { ICCBadge, ICCGuia } from "@/components/ICCBadge";

interface MedicionForm {
  pesoKg: string;
  estaturaCm: string;
  toraxCm: string;
  cinturaCm: string;
  caderaCm: string;
  bicepsCm: string;
  musloCm: string;
  pantorrillaCm: string;
  porcentajeGrasa: string;
  masaMuscular: string;
  densidadOsea: string;
  pliegueTricepe: string;
  pliegueSubescapular: string;
  pliegueSupraespinal: string;
  pliegueAbdominal: string;
  pliegueMusloAnt: string;
  plieguePantorrilla: string;
  notas: string;
}

function calcIMC(peso: string, estatura: string): number | null {
  const p = parseFloat(peso);
  const e = parseInt(estatura);
  if (!p || !e || e < 100) return null;
  return parseFloat((p / Math.pow(e / 100, 2)).toFixed(1));
}

function imcInfo(imc: number): { label: string; color: string; bg: string } {
  if (imc < 18.5) return { label: "Bajo peso",    color: "text-blue-700",  bg: "bg-blue-50 border-blue-200" };
  if (imc < 25)   return { label: "Normal ✓",     color: "text-green-700", bg: "bg-green-50 border-green-200" };
  if (imc < 30)   return { label: "Sobrepeso",    color: "text-yellow-700",bg: "bg-yellow-50 border-yellow-200" };
  if (imc < 35)   return { label: "Obesidad I",   color: "text-orange-700",bg: "bg-orange-50 border-orange-200" };
  return           { label: "Obesidad II+",        color: "text-red-700",   bg: "bg-red-50 border-red-200" };
}

function calcICC(
  cintura: string, cadera: string, genero: string
): { icc: number; clasificacion: "BAJO" | "MODERADO" | "ALTO" } | null {
  const c = parseFloat(cintura);
  const ca = parseFloat(cadera);
  if (!c || !ca || ca === 0) return null;
  const icc = parseFloat((c / ca).toFixed(3));
  let clasificacion: "BAJO" | "MODERADO" | "ALTO";
  if (genero === "M") {
    if (icc < 0.90) clasificacion = "BAJO";
    else if (icc < 1.00) clasificacion = "MODERADO";
    else clasificacion = "ALTO";
  } else {
    if (icc < 0.80) clasificacion = "BAJO";
    else if (icc < 0.85) clasificacion = "MODERADO";
    else clasificacion = "ALTO";
  }
  return { icc, clasificacion };
}

export default function CitaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cita, setCita] = useState<Cita | null>(null);
  const [clienteGenero, setClienteGenero] = useState("M");
  const [clienteEsVIP, setClienteEsVIP] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<MedicionForm>({
    pesoKg: "", estaturaCm: "", toraxCm: "", cinturaCm: "",
    caderaCm: "", bicepsCm: "", musloCm: "", pantorrillaCm: "",
    porcentajeGrasa: "", masaMuscular: "", densidadOsea: "",
    pliegueTricepe: "", pliegueSubescapular: "", pliegueSupraespinal: "",
    pliegueAbdominal: "", pliegueMusloAnt: "", plieguePantorrilla: "",
    notas: "",
  });

  useEffect(() => {
    api.get<Cita[]>("/api/citas").then(async (citas) => {
      const found = citas.find((c) => c.id === id);
      if (found) {
        setCita(found);
        try {
          const cliente = await api.get<any>(`/api/clientes/${found.clienteId}`);
          setClienteGenero(cliente.genero ?? "M");
          setClienteEsVIP(cliente.esVIP ?? false);
        } catch {}
      }
    }).finally(() => setLoading(false));
  }, [id]);

  function set(field: keyof MedicionForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSave() {
    if (!cita) return;
    if (!form.pesoKg || !form.estaturaCm) {
      setError("Peso y estatura son obligatorios.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        clienteId: cita.clienteId,
        citaId: cita.id,
        pesoKg: parseFloat(form.pesoKg),
        estaturaCm: parseInt(form.estaturaCm),
      };
      const intOpts = ["toraxCm", "cinturaCm", "caderaCm", "bicepsCm", "musloCm", "pantorrillaCm"] as const;
      for (const k of intOpts) if (form[k]) body[k] = parseInt(form[k]);
      const floatOpts = [
        "porcentajeGrasa", "masaMuscular", "densidadOsea",
        "pliegueTricepe", "pliegueSubescapular", "pliegueSupraespinal",
        "pliegueAbdominal", "pliegueMusloAnt", "plieguePantorrilla",
      ] as const;
      for (const k of floatOpts) if (form[k]) body[k] = parseFloat(form[k]);
      if (form.notas) body.notas = form.notas;
      await api.post("/api/mediciones", body);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ProtectedPage roles={["COACH"]}>
        <div className="flex justify-center py-20"><Spinner /></div>
      </ProtectedPage>
    );
  }

  if (success) {
    return (
      <ProtectedPage roles={["COACH"]}>
        <div className="flex flex-col items-center gap-5 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle size={34} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Medición guardada</h2>
            <p className="text-gray-400 text-sm mt-1">La cita ha sido marcada como completada.</p>
          </div>
          <Button onClick={() => router.push("/agenda")}>Volver a la agenda</Button>
        </div>
      </ProtectedPage>
    );
  }

  const imc = calcIMC(form.pesoKg, form.estaturaCm);
  const imcI = imc ? imcInfo(imc) : null;
  const iccData = calcICC(form.cinturaCm, form.caderaCm, clienteGenero);

  return (
    <ProtectedPage roles={["COACH"]}>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-3 transition-colors"
          >
            <ChevronLeft size={16} />Volver
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400 font-medium">Formulario de medición</p>
              <h1 className="text-2xl font-bold text-gray-900">Registrar medidas</h1>
            </div>
            {cita && (
              <div className="text-right flex-shrink-0">
                <div className="flex items-center justify-end gap-2">
                  <p className="font-semibold text-gray-800 text-sm">{cita.cliente.usuario.nombre}</p>
                  {clienteEsVIP && (
                    <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      <Crown size={10} />VIP
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(cita.fechaInicio).toLocaleDateString("es-CL", {
                    weekday: "long", day: "numeric", month: "long",
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {/* 1. Datos obligatorios */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center">
                <Activity size={15} className="text-sky-500" />
              </div>
              <CardTitle className="text-base">Datos obligatorios</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Input
                id="peso"
                label="Peso (kg)"
                type="number"
                step="0.1"
                min="30"
                max="300"
                placeholder="82.5"
                value={form.pesoKg}
                onChange={set("pesoKg")}
                required
              />
              <Input
                id="estatura"
                label="Estatura (cm)"
                type="number"
                min="100"
                max="250"
                placeholder="175"
                value={form.estaturaCm}
                onChange={set("estaturaCm")}
                required
              />
            </div>

            {/* IMC en tiempo real */}
            {imc && imcI && (
              <div className={`mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${imcI.bg}`}>
                <div>
                  <p className={`text-lg font-bold ${imcI.color}`}>{imc}</p>
                  <p className="text-xs text-gray-500">IMC</p>
                </div>
                <div className="h-8 w-px bg-current opacity-20" />
                <p className={`text-sm font-semibold ${imcI.color}`}>{imcI.label}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Medidas corporales */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                <Ruler size={15} className="text-violet-500" />
              </div>
              <div>
                <CardTitle className="text-base">Medidas corporales</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Opcional — necesarias para calcular ICC</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ICCGuia />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input id="torax"       label="Tórax (cm)"       type="number" placeholder="100" value={form.toraxCm}       onChange={set("toraxCm")} />
              <Input id="cintura"     label="Cintura (cm)"     type="number" placeholder="90"  value={form.cinturaCm}     onChange={set("cinturaCm")} />
              <Input id="cadera"      label="Cadera (cm)"      type="number" placeholder="98"  value={form.caderaCm}      onChange={set("caderaCm")} />
              <Input id="biceps"      label="Bíceps (cm)"      type="number" placeholder="35"  value={form.bicepsCm}      onChange={set("bicepsCm")} />
              <Input id="muslo"       label="Muslo (cm)"       type="number" placeholder="58"  value={form.musloCm}       onChange={set("musloCm")} />
              <Input id="pantorrilla" label="Pantorrilla (cm)" type="number" placeholder="38"  value={form.pantorrillaCm} onChange={set("pantorrillaCm")} />
            </div>

            {/* ICC en tiempo real */}
            {iccData && (
              <div className="pt-1">
                <p className="text-xs font-medium text-gray-500 mb-2">ICC calculado en tiempo real:</p>
                <ICCBadge
                  icc={iccData.icc}
                  clasificacion={iccData.clasificacion}
                  genero={clienteGenero}
                  showTooltip
                />
                {clienteEsVIP && (
                  <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                    <Crown size={10} />
                    Cliente VIP — el ICC aparecerá en su reporte avanzado
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Composición corporal */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Dumbbell size={15} className="text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-base">Composición corporal</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Opcional — se estima automáticamente con Deurenberg si no se completa</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input
                id="pctGrasa"
                label="% Grasa corporal"
                type="number" step="0.1" min="3" max="60"
                placeholder="22.5"
                value={form.porcentajeGrasa}
                onChange={set("porcentajeGrasa")}
              />
              <Input
                id="masaMuscular"
                label="Masa muscular (kg)"
                type="number" step="0.1" min="10" max="100"
                placeholder="35.0"
                value={form.masaMuscular}
                onChange={set("masaMuscular")}
              />
              <Input
                id="densidadOsea"
                label="Densidad ósea (g/cm²)"
                type="number" step="0.01" min="0.5" max="2.5"
                placeholder="1.20"
                value={form.densidadOsea}
                onChange={set("densidadOsea")}
              />
            </div>
          </CardContent>
        </Card>

        {/* 4. Pliegues Yuhasz — solo clientes VIP */}
        {clienteEsVIP && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Layers size={15} className="text-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Pliegues Yuhasz</CardTitle>
                    <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      <Crown size={10} />VIP
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Opcional — si se completan los 6 pliegues se calcula el % grasa Yuhasz</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Input id="pliegueTricepe"       label="Tríceps (mm)"       type="number" step="0.1" min="1" placeholder="15.0" value={form.pliegueTricepe}       onChange={set("pliegueTricepe")} />
                <Input id="pliegueSubescapular"  label="Subescapular (mm)"  type="number" step="0.1" min="1" placeholder="12.0" value={form.pliegueSubescapular}  onChange={set("pliegueSubescapular")} />
                <Input id="pliegueSupraespinal"  label="Suprailíaco (mm)"   type="number" step="0.1" min="1" placeholder="10.0" value={form.pliegueSupraespinal}  onChange={set("pliegueSupraespinal")} />
                <Input id="pliegueAbdominal"     label="Abdominal (mm)"     type="number" step="0.1" min="1" placeholder="20.0" value={form.pliegueAbdominal}     onChange={set("pliegueAbdominal")} />
                <Input id="pliegueMusloAnt"      label="Muslo anterior (mm)"type="number" step="0.1" min="1" placeholder="18.0" value={form.pliegueMusloAnt}      onChange={set("pliegueMusloAnt")} />
                <Input id="plieguePantorrilla"   label="Pantorrilla (mm)"   type="number" step="0.1" min="1" placeholder="14.0" value={form.plieguePantorrilla}   onChange={set("plieguePantorrilla")} />
              </div>
              {/* Suma en tiempo real si los 6 están completos */}
              {(() => {
                const vals = [form.pliegueTricepe, form.pliegueSubescapular, form.pliegueSupraespinal, form.pliegueAbdominal, form.pliegueMusloAnt, form.plieguePantorrilla];
                const nums = vals.map((v) => parseFloat(v)).filter((n) => !isNaN(n) && n > 0);
                if (nums.length !== 6) return null;
                const suma = nums.reduce((a, b) => a + b, 0);
                return (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div>
                      <p className="text-lg font-bold text-amber-700">{suma.toFixed(1)} mm</p>
                      <p className="text-xs text-gray-500">Suma pliegues</p>
                    </div>
                    <div className="h-8 w-px bg-amber-300" />
                    <p className="text-sm font-semibold text-amber-700">El % grasa Yuhasz se calculará al guardar</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* 5. Notas */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                <FileText size={15} className="text-gray-400" />
              </div>
              <CardTitle className="text-base">Notas de la sesión</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              id="notas"
              placeholder="Observaciones, recomendaciones para el cliente…"
              value={form.notas}
              onChange={set("notas")}
              rows={3}
            />
          </CardContent>
        </Card>

        <Button onClick={handleSave} loading={saving} className="w-full" size="lg">
          Guardar medición y completar cita
        </Button>
      </div>
    </ProtectedPage>
  );
}
