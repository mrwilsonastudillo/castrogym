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
    google: any;
    grecaptcha: any;
  }
}

/* ─── Paleta de marca ─────────────────────────────── */
const C = {
  black: "#000000",
  yellow: "#F5DA31",
  yellowHover: "#e4c820",
  white: "#FFFFFF",
  gray100: "#F5F5F5",
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

const inputBaseStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: C.inputBg,
  border: `1px solid ${C.inputBorder}`,
  borderRadius: "8px",
  color: C.white,
  fontSize: "14px",
  fontFamily: font,
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

/* ─── Sub-componentes con estilos inline ─────────── */
function Badge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 14px",
        borderRadius: "999px",
        background: "rgba(245,218,49,0.12)",
        border: `1px solid ${C.yellow}`,
        color: C.yellow,
        fontSize: "12px",
        fontWeight: 600,
        letterSpacing: "0.06em",
        fontFamily: font,
      }}
    >
      {label}
    </span>
  );
}

/* ─── Iconos SVG para redes sociales ─────────────── */
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


export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "cliente@mail.com", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  // ── Cargar SDKs externos ──────────────────────────────
  useEffect(() => {
    // reCAPTCHA v3
    const rcKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (rcKey && !document.getElementById("recaptcha-script")) {
      const s = document.createElement("script");
      s.id = "recaptcha-script";
      s.src = `https://www.google.com/recaptcha/api.js?render=${rcKey}`;
      s.async = true;
      document.head.appendChild(s);
    }

    // Google GSI
    if (!document.getElementById("gsi-script")) {
      const s = document.createElement("script");
      s.id = "gsi-script";
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      document.head.appendChild(s);
    }

  }, []);

  // ── Helpers ─────────────────────────────────────────
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
      setError(e.message ?? "Error al iniciar sesión con red social");
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const recaptchaToken = await getRecaptchaToken("login");
      const res = await api.post<{ token: string; usuario: any }>("/api/auth/login", {
        ...form,
        ...(recaptchaToken && { recaptchaToken }),
      });
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
        .cg-submit-btn:hover:not(:disabled) { background: ${C.yellowHover} !important; }
        .cg-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .cg-social-btn:hover:not(:disabled) { background: #1a1a1a !important; border-color: #444 !important; }
        .cg-social-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .cg-register-link:hover { text-decoration: underline; }
        .cg-footer-link:hover { text-decoration: underline; }
        .cg-input:focus { border-color: ${C.yellow} !important; }
        .grecaptcha-badge { visibility: hidden; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: C.black,
          fontFamily: font,
        }}
      >
        <div style={{ flex: 1, display: "flex" }}>

          {/* ── Panel izquierdo — branding ── */}
          <div
            className="cg-left"
            style={{
              width: "50%",
              background: C.black,
              borderRight: `1px solid ${C.border}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 48px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: "-80px", left: "-80px", width: "260px", height: "260px", borderRadius: "50%", border: `1px solid ${C.border}` }} />
            <div style={{ position: "absolute", bottom: "-60px", right: "-60px", width: "200px", height: "200px", borderRadius: "50%", border: `1px solid ${C.border}` }} />
            <div style={{ position: "absolute", top: "40px", right: "40px", width: "6px", height: "6px", borderRadius: "50%", background: C.yellow }} />
            <div style={{ position: "absolute", bottom: "80px", left: "60px", width: "4px", height: "4px", borderRadius: "50%", background: C.yellow, opacity: 0.5 }} />

            <div style={{ position: "relative", zIndex: 1, maxWidth: "320px", textAlign: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "140px", height: "140px", borderRadius: "24px", overflow: "hidden", marginBottom: "28px", border: `2px solid ${C.yellow}` }}>
                <Image src={logo} alt="Castro Gym" width={140} height={140} style={{ objectFit: "cover", width: "100%", height: "100%" }} priority />
              </div>
              <h1 style={{ color: C.white, fontSize: "40px", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: "8px" }}>CASTRO</h1>
              <h1 style={{ color: C.yellow, fontSize: "40px", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: "24px" }}>GYM</h1>
              <p style={{ color: C.gray400, fontSize: "15px", lineHeight: 1.65, marginBottom: "36px" }}>
                Seguimiento de medidas, agendamiento y control de progreso en un solo lugar.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                {["Coaches", "Mediciones", "VIP"].map((b) => <Badge key={b} label={b} />)}
              </div>
              <div style={{ marginTop: "48px", width: "48px", height: "3px", background: C.yellow, borderRadius: "2px", margin: "48px auto 0" }} />
            </div>
          </div>

          {/* ── Panel derecho — formulario ── */}
          <div
            className="cg-right"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 40px",
              background: "#0a0a0a",
            }}
          >
            <div style={{ width: "100%", maxWidth: "380px" }}>

              {/* Logo móvil */}
              <div className="cg-mobile-logo" style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center", marginBottom: "36px" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "12px", overflow: "hidden", border: `2px solid ${C.yellow}`, flexShrink: 0 }}>
                  <Image src={logo} alt="Castro Gym" width={56} height={56} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                </div>
                <span style={{ fontSize: "22px", fontWeight: 700, color: C.white, letterSpacing: "-0.01em" }}>
                  CASTRO <span style={{ color: C.yellow }}>GYM</span>
                </span>
              </div>

              {/* Encabezado */}
              <div style={{ marginBottom: "28px" }}>
                <h2 style={{ color: C.white, fontSize: "26px", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "6px" }}>
                  Bienvenido de vuelta
                </h2>
                <p style={{ color: C.gray400, fontSize: "14px" }}>Inicia sesión para continuar</p>
              </div>

              {/* Error */}
              {error && (
                <div style={{ marginBottom: "20px", padding: "12px 16px", borderRadius: "8px", background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.errorText, fontSize: "13px" }}>
                  {error}
                </div>
              )}

              {/* ── Botones sociales ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={anyLoading}
                  className="cg-social-btn"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "#111",
                    border: `1px solid ${C.border}`,
                    borderRadius: "8px",
                    color: C.white,
                    fontSize: "14px",
                    fontWeight: 600,
                    fontFamily: font,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    transition: "background 0.2s, border-color 0.2s",
                  }}
                >
                  {socialLoading === "google" ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  ) : <GoogleIcon />}
                  {socialLoading === "google" ? "Conectando…" : "Continuar con Google"}
                </button>

              </div>

              {/* Divisor */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div style={{ flex: 1, height: "1px", background: C.border }} />
                <span style={{ color: C.gray600, fontSize: "12px", fontWeight: 500 }}>o</span>
                <div style={{ flex: 1, height: "1px", background: C.border }} />
              </div>

              {/* Formulario email/password */}
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "16px" }}>
                  <label htmlFor="email" style={{ display: "block", color: C.gray400, fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="cliente@mail.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    autoComplete="email"
                    className="cg-input"
                    style={inputBaseStyle}
                  />
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label htmlFor="password" style={{ display: "block", color: C.gray400, fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
                    Contraseña
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="password"
                      type={showPass ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      autoComplete="current-password"
                      className="cg-input"
                      style={{ ...inputBaseStyle, paddingRight: "44px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      tabIndex={-1}
                      style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.gray400, display: "flex", alignItems: "center", padding: "4px" }}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={anyLoading}
                  className="cg-submit-btn"
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: C.yellow,
                    color: C.black,
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "15px",
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    cursor: "pointer",
                    transition: "background 0.2s",
                    fontFamily: font,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {submitting ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Iniciando sesión…
                    </>
                  ) : "Iniciar sesión"}
                </button>
              </form>

              {/* Registro */}
              <p style={{ marginTop: "24px", textAlign: "center", fontSize: "14px", color: C.gray400 }}>
                ¿No tienes cuenta?{" "}
                <Link href="/register" className="cg-register-link" style={{ color: C.yellow, fontWeight: 600, textDecoration: "none" }}>
                  Regístrate
                </Link>
              </p>

              {/* reCAPTCHA disclaimer */}
              <p style={{ marginTop: "16px", textAlign: "center", fontSize: "11px", color: C.gray600 }}>
                Protegido por reCAPTCHA.{" "}
                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: C.gray600, textDecoration: "underline" }}>Privacidad</a>
                {" "}·{" "}
                <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: C.gray600, textDecoration: "underline" }}>Términos</a>
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
