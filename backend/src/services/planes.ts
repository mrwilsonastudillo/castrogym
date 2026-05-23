import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads", "planes");

export function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export function guardarPDF(base64: string, clienteId: string): string {
  ensureUploadsDir();
  const buffer = Buffer.from(base64, "base64");
  const filename = `plan_${clienteId}_${Date.now()}.pdf`;
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return `uploads/planes/${filename}`;
}

export async function extraerTextoPDF(base64: string): Promise<string | null> {
  try {
    // La versión instalada de pdf-parse usa una API de clase (PDFParse)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PDFParse } = require("pdf-parse");
    const buffer = Buffer.from(base64, "base64");

    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();

    const texto = result.text?.trim();
    if (!texto) return null;
    return texto.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
  } catch (err) {
    console.error("[pdf-parse] error al extraer texto:", err);
    return null;
  }
}

// ─── Detectores de sección ────────────────────────────────────────────────────
// Cada entrada: [clave de sección, array de palabras clave que identifican la cabecera]
const DETECTORES: [string, RegExp][] = [
  ["dieta",          /^\s*(?:dieta|alimentaci[oó]n|plan\s+alimentario|nutrici[oó]n|plan\s+nutricional)/i],
  ["habitos",        /^\s*(?:h[aá]bitos?|estilo\s+de\s+vida|rutina\s+diaria|lifestyle)/i],
  ["restricciones",  /^\s*(?:restricciones?|prohibiciones?|evitar|no\s+hacer|contraindicaciones?)/i],
  ["suplementacion", /^\s*(?:supleme[nm]taci[oó]n|suplementos?|vitaminas?|proteinas?)/i],
  ["metaFisica",     /^\s*(?:meta\s+f[ií]sica|objetivo\s+f[ií]sico|meta|objetivos?|goal)/i],
  ["recomendaciones",/^\s*(?:recomendaciones?|consejos?|indicaciones?|tips?)/i],
  ["observaciones",  /^\s*(?:observaciones?|notas?|comentarios?|aclaraciones?)/i],
];

export interface SeccionesParsadas {
  dieta?: string;
  habitos?: string;
  restricciones?: string;
  suplementacion?: string;
  metaFisica?: string;
  recomendaciones?: string;
  observaciones?: string;
  textoCompleto: string;
  seccionesDetectadas: boolean;
}

/**
 * Intenta dividir el texto extraído del PDF en secciones estructuradas.
 * Si encuentra encabezados reconocibles, devuelve los campos de cada sección.
 * Si no detecta secciones, devuelve el texto completo sin parsear.
 */
export function parsearSecciones(texto: string): SeccionesParsadas {
  const lineas = texto.split("\n");
  const resultado: Record<string, string> = {};

  let seccionActual: string | null = null;
  let buffer: string[] = [];

  for (const linea of lineas) {
    const trimmed = linea.trim();
    if (!trimmed) {
      if (seccionActual) buffer.push("");
      continue;
    }

    // Detectar cabecera de sección
    const detectado = DETECTORES.find(([, re]) => re.test(trimmed));
    if (detectado) {
      // Guardar lo que había en el buffer para la sección anterior
      if (seccionActual && buffer.length > 0) {
        resultado[seccionActual] = buffer.join("\n").trim();
      }
      seccionActual = detectado[0];
      buffer = [];
    } else if (seccionActual) {
      buffer.push(trimmed);
    }
  }

  // Guardar última sección
  if (seccionActual && buffer.length > 0) {
    resultado[seccionActual] = buffer.join("\n").trim();
  }

  const seccionesDetectadas = Object.keys(resultado).length > 0;

  return {
    ...(resultado as Partial<SeccionesParsadas>),
    textoCompleto: texto,
    seccionesDetectadas,
  };
}
