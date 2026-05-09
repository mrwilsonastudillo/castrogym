"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import logo from "../images/logo.jpg";

const C = {
  black: "#000000",
  yellow: "#F5DA31",
  yellowHover: "#e4c820",
  white: "#FFFFFF",
  gray400: "#9CA3AF",
  gray600: "#4B5563",
  border: "#2A2A2A",
  inputBg: "#111111",
  inputBorder: "#333333",
  errorBg: "#1a0000",
  errorBorder: "#7f1d1d",
  errorText: "#fca5a5",
  successBg: "#001a0a",
  successBorder: "#14532d",
  successText: "#86efac",
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
  boxSizing: "border-box",
};

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; }
        ::placeholder { color: #555; }
        .cg-input:focus { border-color: ${C.yellow} !important; }
        .cg-submit-btn:hover:not(:disabled) { background: ${C.yellowHover} !important; }
        .cg-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .cg-link:hover { text-decoration: underline; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.black, fontFamily: font }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
          <div style={{ width: "100%", maxWidth: "400px" }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "center", marginBottom: "40px" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "12px", overflow: "hidden", border: `2px solid ${C.yellow}`, flexShrink: 0 }}>
                <Image src={logo} alt="Castro Gym" width={52} height={52} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
              </div>
              <span style={{ fontSize: "22px", fontWeight: 700, color: C.white, letterSpacing: "-0.01em" }}>
                CASTRO <span style={{ color: C.yellow }}>GYM</span>
              </span>
            </div>

            {/* Header */}
            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ color: C.white, fontSize: "24px", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "6px" }}>
                Recuperar contraseña
              </h2>
              <p style={{ color: C.gray400, fontSize: "14px" }}>
                Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>
            </div>

            {error && (
              <div style={{ marginBottom: "20px", padding: "12px 16px", borderRadius: "8px", background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.errorText, fontSize: "13px" }}>
                {error}
              </div>
            )}

            {sent ? (
              <div style={{ padding: "20px", borderRadius: "12px", background: C.successBg, border: `1px solid ${C.successBorder}`, color: C.successText, fontSize: "14px", textAlign: "center", lineHeight: 1.6 }}>
                <p style={{ fontWeight: 600, marginBottom: "8px" }}>¡Revisa tu correo!</p>
                <p style={{ color: "#86efac99" }}>
                  Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "20px" }}>
                  <label htmlFor="email" style={{ display: "block", color: C.gray400, fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="cg-input"
                    style={inputBaseStyle}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="cg-submit-btn"
                  style={{ width: "100%", padding: "14px", background: C.yellow, color: C.black, border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: 700, cursor: "pointer", fontFamily: font, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  {submitting ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Enviando…
                    </>
                  ) : "Enviar enlace"}
                </button>
              </form>
            )}

            <p style={{ marginTop: "28px", textAlign: "center", fontSize: "14px", color: C.gray400 }}>
              <Link href="/login" className="cg-link" style={{ color: C.yellow, fontWeight: 600, textDecoration: "none" }}>
                ← Volver al inicio de sesión
              </Link>
            </p>
          </div>
        </div>

        <footer style={{ borderTop: `1px solid ${C.border}`, padding: "16px 24px", textAlign: "center", color: C.gray600, fontSize: "12px", background: C.black }}>
          Desarrollado por{" "}
          <a href="https://tecnoboss.co" target="_blank" rel="noopener noreferrer" style={{ color: C.yellow, fontWeight: 600, textDecoration: "none" }}>
            Tecnoboss SAS
          </a>
        </footer>
      </div>
    </>
  );
}
