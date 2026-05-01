import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVaultStore } from "../store/vault";

export function Unlock() {
  const { vaultExists, checkVault, createVault, unlock, error, clearError } = useVaultStore();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => { checkVault(); }, [checkVault]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setLocalError("");
    if (!vaultExists && password !== confirm) {
      setLocalError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      if (vaultExists) await unlock(password);
      else await createVault(password);
      navigate("/");
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const displayError = localError || error;

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-0)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-10%",
            left: "-5%",
            width: "50%",
            height: "60%",
            background: "radial-gradient(ellipse, rgba(129,140,248,0.10) 0%, transparent 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-15%",
            right: "-5%",
            width: "50%",
            height: "60%",
            background: "radial-gradient(ellipse, rgba(167,139,250,0.07) 0%, transparent 65%)",
          }}
        />
      </div>

      <div
        className="scale-in"
        style={{ width: 380, padding: "0 1rem", position: "relative", zIndex: 1 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2.2rem" }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "linear-gradient(135deg, #ffffff 30%, #818cf8 100%)",
              borderRadius: 10,
              flexShrink: 0,
              boxShadow: "0 0 28px rgba(129,140,248,0.4), 0 4px 16px rgba(0,0,0,0.4)",
            }}
          />
          <div>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-0)",
                lineHeight: 1.2,
              }}
            >
              Dassh
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-2)", marginTop: "0.1rem" }}>
              SSH Session Manager
            </div>
          </div>
        </div>

        <div
          className="glass-hi"
          style={{
            border: "1px solid var(--border-hi)",
            borderRadius: 16,
            padding: "2rem",
          }}
        >
          <div style={{ marginBottom: "1.5rem" }}>
            <h2 style={{ fontSize: "1rem", marginBottom: "0.35rem", color: "var(--text-0)" }}>
              {vaultExists ? "Welcome back" : "Create vault"}
            </h2>
            <p style={{ color: "var(--text-1)", fontSize: "0.82rem", lineHeight: 1.6 }}>
              {vaultExists
                ? "Enter your master password to unlock your vault."
                : "Choose a strong master password to secure your credentials."}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Master password</label>
              <input
                type="password"
                placeholder={vaultExists ? "Enter password" : "At least 8 characters"}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {!vaultExists && (
              <div className="field">
                <label>Confirm password</label>
                <input
                  type="password"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            )}

            {displayError && <div className="error-msg">{displayError}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: "1.4rem" }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Working…
                </>
              ) : vaultExists ? (
                "Unlock vault"
              ) : (
                "Create vault"
              )}
            </button>
          </form>
        </div>

        {!vaultExists && (
          <p
            style={{
              textAlign: "center",
              color: "var(--text-2)",
              fontSize: "0.7rem",
              marginTop: "1rem",
              lineHeight: 1.7,
              animation: "fadeIn 0.4s ease 0.3s both",
            }}
          >
            ChaCha20-Poly1305 · Argon2id · Credentials never leave this device
          </p>
        )}
      </div>
    </div>
  );
}
