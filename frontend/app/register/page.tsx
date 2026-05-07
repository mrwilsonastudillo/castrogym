"use client";
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import logo from "../images/logo.jpg";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
    google: any;
    grecaptcha: any;
  }
}

/* ─── Paleta de marca ─────────────────────────────── */
const C = {
  black: "#000000",
  yellow: "#F5DA31",
  white: "#FFFFFF",
  gray400: "#9CA3AF",
  gray600: "#4B5563",
  border: "#2A2A2A",
  inputBg: "#111111",
  inputBorder: "#333333",
  errorBg: "#1a0000",
  errorBorder: "#7f1d1d",
  errorText: "#fca5a5",
};

const font = `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

const labelStyle: React.CSSProperties = {
  display: "block",
  color: C.gray400,
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: "8px",
};

const fieldWrap: React.CSSProperties = { marginBottom: "16px" };

function inputStyle(focused: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 14px",
    background: C.inputBg,
    border: `1px solid ${focused ? C.yellow : C.inputBorder}`,
    borderRadius: "8px",
    color: C.white,
    fontSize: "14px",
    fontFamily: font,
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  };
}

/* ─── Sub-componentes FUERA del componente padre ──── */
function Field({
  id, label, type = "text", placeholder, value, onChange,
  required, minLength, autoComplete,
}: {
  id: string; label: string; type?: string; placeholder?: string;
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean; minLength?: number; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={fieldWrap}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <input
        id={id} type={type} placeholder={placeholder} value={value}
        onChange={onChange} required={required} minLength={minLength}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={inputStyle(focused)}
      />
    </div>
  );
}

function SelectField({
  id, label, value, onChange, children,
}: {
  id: string; label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={fieldWrap}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <select
        id={id} value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ ...inputStyle(focused), appearance: "none", cursor: "pointer" }}
      >
        {children}
      </select>
    </div>
  );
}

function ActionBtn({
  type = "button", onClick, disabled, children, variant = "primary",
}: {
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      style={{
        flex: 1,
        padding: "13px",
        background: variant === "primary" ? C.yellow : "transparent",
        color: variant === "primary" ? C.black : C.gray400,
        border: variant === "secondary" ? `1px solid ${C.border}` : "none",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontFamily: font,
        transition: "background 0.2s, color 0.2s",
      }}
    >
      {children}
    </button>
  );
}

/* ─── Iconos redes sociales ───────────────────────── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

/* ─── Constantes del stepper ─────────────────────── */
const SECCIONES = ["Cuenta", "Personal", "Objetivo"] as const;
type Seccion = typeof SECCIONES[number];

const STEP_INFO = [
  { label: "Crea tu cuenta", desc: "Email y contraseña" },
  { label: "Datos personales", desc: "Perfil y contacto" },
  { label: "Tu objetivo", desc: "Personaliza tu plan" },
];

/* ─── Página principal ───────────────────────────── */
export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [seccion, setSeccion] = useState<Seccion>("Cuenta");
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    telefono: "",
    fechaNacimiento: "",
    genero: "M",
    objetivo: "PERDIDA_PESO",
    limitacionesFisicas: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [aceptoDatos, setAceptoDatos] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);

  const seccionIdx = SECCIONES.indexOf(seccion);

  // ── Cargar SDKs ──────────────────────────────────
  useEffect(() => {
    const rcKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (rcKey && !document.getElementById("recaptcha-script")) {
      const s = document.createElement("script");
      s.id = "recaptcha-script";
      s.src = `https://www.google.com/recaptcha/api.js?render=${rcKey}`;
      s.async = true;
      document.head.appendChild(s);
    }
    if (!document.getElementById("gsi-script")) {
      const s = document.createElement("script");
      s.id = "gsi-script";
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      document.head.appendChild(s);
    }
    const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (fbAppId && !document.getElementById("fb-script")) {
      window.fbAsyncInit = () => {
        window.FB.init({ appId: fbAppId, cookie: true, xfbml: false, version: "v19.0" });
      };
      const s = document.createElement("script");
      s.id = "fb-script";
      s.src = "https://connect.facebook.net/es_LA/sdk.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  function set(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  // ── Helpers ─────────────────────────────────────
  async function getRecaptchaToken(action: string): Promise<string | undefined> {
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey || typeof window === "undefined" || !window.grecaptcha) return undefined;
    return new Promise((resolve) => {
      window.grecaptcha.ready(async () => {
        try {
          const token = await window.grecaptcha.execute(siteKey, { action });
          resolve(token);
        } catch {
          resolve(undefined);
        }
      });
    });
  }

  function redirectByRole(rol: string) {
    if (rol === "ADMIN") router.replace("/admin");
    else if (rol === "COACH") router.replace("/agenda");
    else router.replace("/dashboard");
  }

  async function handleSocialCallback(provider: "google" | "facebook", token: string) {
    try {
      const res = await api.post<{ token: string; usuario: any }>("/api/auth/social", {
        provider,
        token,
      });
      login(res.token, res.usuario);
      redirectByRole(res.usuario.rol);
    } catch (e: any) {
      setError(e.message ?? "Error al registrarse con red social");
      setSocialLoading(null);
    }
  }

  function handleGoogleLogin() {
    if (!window.google?.accounts?.oauth2) {
      setError("Google SDK cargando, intenta de nuevo en unos segundos.");
      return;
    }
    setSocialLoading("google");
    setError("");
    window.google.accounts.oauth2
      .initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: "email profile",
        callback: async (resp: any) => {
          if (resp.error || !resp.access_token) {
            setError(resp.error_description ?? "Error al conectar con Google");
            setSocialLoading(null);
            return;
          }
          await handleSocialCallback("google", resp.access_token);
        },
      })
      .requestAccessToken();
  }

  function handleFacebookLogin() {
    if (!window.FB) {
      setError("Facebook SDK cargando, intenta de nuevo en unos segundos.");
      return;
    }
    setSocialLoading("facebook");
    setError("");
    window.FB.login(
      async (resp: any) => {
        if (resp.status !== "connected") {
          setError("No se pudo conectar con Facebook");
          setSocialLoading(null);
          return;
        }
        await handleSocialCallback("facebook", resp.authResponse.accessToken);
      },
      { scope: "email,public_profile" }
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!aceptoDatos) {
      setError("Debes aceptar el tratamiento de datos personales para continuar.");
      return;
    }
    setSubmitting(true);
    try {
      const recaptchaToken = await getRecaptchaToken("register");
      const body = {
        ...form,
        limitacionesFisicas: form.limitacionesFisicas || undefined,
        aceptoTratamientoDatos: true as const,
        ...(recaptchaToken && { recaptchaToken }),
      };
      const res = await api.post<{ token: string; usuario: any }>("/api/auth/register", body);
      login(res.token, res.usuario);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const anyLoading = submitting || !!socialLoading;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; }
        ::placeholder { color: #555; }
        @media (max-width: 767px) {
          .cg-left { display: none !important; }
          .cg-right { padding: 32px 24px !important; }
        }
        @media (min-width: 768px) {
          .cg-mobile-logo { display: none !important; }
        }
        .cg-footer-link:hover { text-decoration: underline; }
        .cg-login-link:hover { text-decoration: underline; }
        .cg-social-btn:hover:not(:disabled) { background: #1a1a1a !important; border-color: #444 !important; }
        .cg-social-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) brightness(0.5); }
        .grecaptcha-badge { visibility: hidden; }
      `}</style>

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.black, fontFamily: font }}>
        <div style={{ flex: 1, display: "flex" }}>

          {/* ── Panel izquierdo — branding ── */}
          <div
            className="cg-left"
            style={{
              width: "40%", background: C.black, borderRight: `1px solid ${C.border}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "60px 40px", position: "relative", overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: "-80px", left: "-80px", width: "260px", height: "260px", borderRadius: "50%", border: `1px solid ${C.border}` }} />
            <div style={{ position: "absolute", bottom: "-60px", right: "-60px", width: "200px", height: "200px", borderRadius: "50%", border: `1px solid ${C.border}` }} />
            <div style={{ position: "absolute", top: "40px", right: "40px", width: "6px", height: "6px", borderRadius: "50%", background: C.yellow }} />

            <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "280px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "14px", overflow: "hidden", border: `2px solid ${C.yellow}`, flexShrink: 0 }}>
                  <Image src={logo} alt="Castro Gym" width={64} height={64} style={{ objectFit: "cover", width: "100%", height: "100%" }} priority />
                </div>
                <div>
                  <div style={{ color: C.white, fontSize: "22px", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>CASTRO</div>
                  <div style={{ color: C.yellow, fontSize: "22px", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>GYM</div>
                </div>
              </div>

              <p style={{ color: C.gray400, fontSize: "14px", lineHeight: 1.6, marginBottom: "36px" }}>
                Únete y empieza a controlar tu progreso con seguimiento personalizado.
              </p>

              {/* Pasos visuales */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {STEP_INFO.map((s, i) => {
                  const active = i === seccionIdx;
                  const done = i < seccionIdx;
                  return (
                    <div
                      key={s.label}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        padding: "12px 14px", borderRadius: "10px",
                        background: active ? "rgba(245,218,49,0.08)" : "rgba(255,255,255,0.03)",
                        border: active ? "1px solid rgba(245,218,49,0.3)" : `1px solid ${C.border}`,
                        transition: "all 0.2s",
                      }}
                    >
                      <div
                        style={{
                          width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                          background: done || active ? C.yellow : C.border,
                          color: done || active ? C.black : C.gray400,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "11px", fontWeight: 700,
                        }}
                      >
                        {done ? "✓" : `0${i + 1}`}
                      </div>
                      <div>
                        <p style={{ color: active ? C.white : C.gray400, fontSize: "13px", fontWeight: 600 }}>{s.label}</p>
                        <p style={{ color: C.gray600, fontSize: "11px", marginTop: "2px" }}>{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ width: "48px", height: "3px", background: C.yellow, borderRadius: "2px", margin: "36px 0 0" }} />
            </div>
          </div>

          {/* ── Panel derecho — formulario ── */}
          <div
            className="cg-right"
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "48px 40px", background: "#0a0a0a", overflowY: "auto",
            }}
          >
            <div style={{ width: "100%", maxWidth: "400px" }}>

              {/* Logo móvil */}
              <div className="cg-mobile-logo" style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center", marginBottom: "32px" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "12px", overflow: "hidden", border: `2px solid ${C.yellow}`, flexShrink: 0 }}>
                  <Image src={logo} alt="Castro Gym" width={52} height={52} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                </div>
                <span style={{ fontSize: "20px", fontWeight: 700, color: C.white, letterSpacing: "-0.01em" }}>
                  CASTRO <span style={{ color: C.yellow }}>GYM</span>
                </span>
              </div>

              {/* Encabezado */}
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{ color: C.white, fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "4px" }}>
                  Crear cuenta
                </h2>
                <p style={{ color: C.gray400, fontSize: "13px" }}>Completa los 3 pasos o usa tu red social</p>
              </div>

              {/* Stepper lineal */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
                {SECCIONES.map((s, i) => {
                  const active = i === seccionIdx;
                  const done = i < seccionIdx;
                  return (
                    <div key={s} style={{ display: "flex", alignItems: "center", flex: i < SECCIONES.length - 1 ? 1 : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                        <div
                          style={{
                            width: "26px", height: "26px", borderRadius: "50%",
                            background: done || active ? C.yellow : C.border,
                            color: done || active ? C.black : C.gray400,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "11px", fontWeight: 700,
                          }}
                        >
                          {done ? "✓" : i + 1}
                        </div>
                      </div>
                      {i < SECCIONES.length - 1 && (
                        <div style={{ flex: 1, height: "2px", background: done ? C.yellow : C.border, margin: "0 8px", borderRadius: "1px", transition: "background 0.3s" }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Error */}
              {error && (
                <div style={{ marginBottom: "18px", padding: "12px 16px", borderRadius: "8px", background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.errorText, fontSize: "13px" }}>
                  {error}
                </div>
              )}

              {/* ── Botones sociales (solo en paso 1) ── */}
              {seccion === "Cuenta" && (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={anyLoading}
                      className="cg-social-btn"
                      style={{
                        width: "100%", padding: "12px 16px",
                        background: "#111", border: `1px solid ${C.border}`,
                        borderRadius: "8px", color: C.white,
                        fontSize: "14px", fontWeight: 600, fontFamily: font,
                        cursor: "pointer", display: "flex", alignItems: "center",
                        justifyContent: "center", gap: "10px",
                        transition: "background 0.2s, border-color 0.2s",
                      }}
                    >
                      {socialLoading === "google" ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
                          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                      ) : <GoogleIcon />}
                      {socialLoading === "google" ? "Conectando…" : "Registrarse con Google"}
                    </button>

                    <button
                      type="button"
                      onClick={handleFacebookLogin}
                      disabled={anyLoading}
                      className="cg-social-btn"
                      style={{
                        width: "100%", padding: "12px 16px",
                        background: "#111", border: `1px solid ${C.border}`,
                        borderRadius: "8px", color: C.white,
                        fontSize: "14px", fontWeight: 600, fontFamily: font,
                        cursor: "pointer", display: "flex", alignItems: "center",
                        justifyContent: "center", gap: "10px",
                        transition: "background 0.2s, border-color 0.2s",
                      }}
                    >
                      {socialLoading === "facebook" ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                      ) : <FacebookIcon />}
                      {socialLoading === "facebook" ? "Conectando…" : "Registrarse con Facebook"}
                    </button>
                  </div>

                  {/* Divisor */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
                    <div style={{ flex: 1, height: "1px", background: C.border }} />
                    <span style={{ color: C.gray600, fontSize: "12px", fontWeight: 500 }}>o con email</span>
                    <div style={{ flex: 1, height: "1px", background: C.border }} />
                  </div>
                </>
              )}

              {/* ── Formulario multi-paso ── */}
              <form onSubmit={handleSubmit}>

                {/* Paso 1: Cuenta */}
                {seccion === "Cuenta" && (
                  <div>
                    <Field id="nombre" label="Nombre completo" placeholder="Juan García" value={form.nombre} onChange={set("nombre")} required autoComplete="name" />
                    <Field id="email" label="Email" type="email" placeholder="tu@email.com" value={form.email} onChange={set("email")} required autoComplete="email" />
                    <div style={{ ...fieldWrap, position: "relative" }}>
                      <label htmlFor="password" style={labelStyle}>Contraseña</label>
                      <input
                        id="password" type={showPass ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres" value={form.password}
                        onChange={set("password")} required minLength={6}
                        autoComplete="new-password"
                        onFocus={() => setPassFocused(true)} onBlur={() => setPassFocused(false)}
                        style={{ ...inputStyle(passFocused), paddingRight: "44px" }}
                      />
                      <button
                        type="button" tabIndex={-1} onClick={() => setShowPass((v) => !v)}
                        style={{ position: "absolute", right: "12px", top: "38px", background: "none", border: "none", cursor: "pointer", color: C.gray400, display: "flex", alignItems: "center", padding: "4px" }}
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div style={{ display: "flex", marginTop: "8px" }}>
                      <ActionBtn
                        type="button"
                        disabled={anyLoading}
                        onClick={() => {
                          if (!form.nombre || !form.email || !form.password) { setError("Completa todos los campos obligatorios."); return; }
                          setError(""); setSeccion("Personal");
                        }}
                      >
                        Continuar →
                      </ActionBtn>
                    </div>
                  </div>
                )}

                {/* Paso 2: Personal */}
                {seccion === "Personal" && (
                  <div>
                    <Field id="telefono" label="Teléfono" placeholder="+57 312 345 6789" value={form.telefono} onChange={set("telefono")} required autoComplete="tel" />
                    <Field id="fechaNacimiento" label="Fecha de nacimiento" type="date" value={form.fechaNacimiento} onChange={set("fechaNacimiento")} required />
                    <SelectField id="genero" label="Género" value={form.genero} onChange={set("genero")}>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </SelectField>
                    <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                      <ActionBtn variant="secondary" onClick={() => setSeccion("Cuenta")}>← Atrás</ActionBtn>
                      <ActionBtn
                        onClick={() => {
                          if (!form.telefono || !form.fechaNacimiento) { setError("Completa todos los campos obligatorios."); return; }
                          setError(""); setSeccion("Objetivo");
                        }}
                      >
                        Continuar →
                      </ActionBtn>
                    </div>
                  </div>
                )}

                {/* Paso 3: Objetivo */}
                {seccion === "Objetivo" && (
                  <div>
                    <SelectField id="objetivo" label="¿Cuál es tu objetivo?" value={form.objetivo} onChange={set("objetivo")}>
                      <option value="PERDIDA_PESO">Pérdida de peso</option>
                      <option value="GANANCIA_MUSCULAR">Ganancia muscular</option>
                      <option value="TONIFICACION">Tonificación</option>
                      <option value="OTRO">Otro</option>
                    </SelectField>
                    <Field id="limitaciones" label="Limitaciones físicas (opcional)" placeholder="Ej: lesión de rodilla, hipertensión…" value={form.limitacionesFisicas} onChange={set("limitacionesFisicas")} />

                    {/* Checkbox tratamiento de datos */}
                    <div
                      onClick={() => setAceptoDatos((v) => !v)}
                      style={{
                        marginBottom: "20px", padding: "14px 16px", borderRadius: "8px",
                        border: `1px solid ${aceptoDatos ? C.yellow : C.border}`,
                        background: aceptoDatos ? "rgba(245,218,49,0.06)" : C.inputBg,
                        cursor: "pointer", transition: "border-color 0.2s, background 0.2s",
                        display: "flex", alignItems: "flex-start", gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0, marginTop: "1px",
                          background: aceptoDatos ? C.yellow : "transparent",
                          border: `2px solid ${aceptoDatos ? C.yellow : C.inputBorder}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.2s",
                        }}
                      >
                        {aceptoDatos && <span style={{ color: C.black, fontSize: "12px", fontWeight: 700, lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: "13px", color: C.gray400, lineHeight: 1.5, userSelect: "none" }}>
                        Acepto el{" "}
                        <Link
                          href="/politicas#tratamiento_datos" target="_blank"
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: C.yellow, textDecoration: "none", fontWeight: 600 }}
                        >
                          tratamiento de mis datos personales
                        </Link>{" "}
                        según la política de privacidad de Castro Gym (Ley 1581 de 2012).
                        <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <ActionBtn variant="secondary" onClick={() => setSeccion("Personal")}>← Atrás</ActionBtn>
                      <button
                        type="submit" disabled={submitting || !aceptoDatos}
                        style={{
                          flex: 1, padding: "13px",
                          background: !aceptoDatos ? C.border : C.yellow,
                          color: !aceptoDatos ? C.gray400 : C.black,
                          border: "none", borderRadius: "8px",
                          fontSize: "14px", fontWeight: 700,
                          cursor: submitting || !aceptoDatos ? "not-allowed" : "pointer",
                          opacity: submitting ? 0.7 : 1,
                          fontFamily: font,
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                          transition: "background 0.2s",
                        }}
                      >
                        {submitting ? (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
                              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                            Creando cuenta…
                          </>
                        ) : "Crear cuenta"}
                      </button>
                    </div>

                    {/* reCAPTCHA disclaimer */}
                    <p style={{ marginTop: "14px", textAlign: "center", fontSize: "11px", color: C.gray600 }}>
                      Protegido por reCAPTCHA.{" "}
                      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: C.gray600, textDecoration: "underline" }}>Privacidad</a>
                      {" "}·{" "}
                      <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: C.gray600, textDecoration: "underline" }}>Términos</a>
                    </p>
                  </div>
                )}
              </form>

              {/* Link login */}
              <p style={{ marginTop: "24px", textAlign: "center", fontSize: "14px", color: C.gray400 }}>
                ¿Ya tienes cuenta?{" "}
                <Link href="/login" className="cg-login-link" style={{ color: C.yellow, fontWeight: 600, textDecoration: "none" }}>
                  Inicia sesión
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer style={{ borderTop: `1px solid ${C.border}`, padding: "16px 24px", textAlign: "center", color: C.gray600, fontSize: "12px", background: C.black }}>
          Desarrollado por{" "}
          <a href="https://tecnoboss.co" target="_blank" rel="noopener noreferrer" className="cg-footer-link" style={{ color: C.yellow, fontWeight: 600, textDecoration: "none" }}>
            Tecnoboss SAS
          </a>
        </footer>
      </div>
    </>
  );
}
