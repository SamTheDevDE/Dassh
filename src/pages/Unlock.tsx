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
      className="page-fade"
      style={{
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-0)",
      }}
    >
      <div style={{ width: 360, padding: "0 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem", marginBottom: "2rem" }}>
          <div
            style={{
              width: 30,
              height: 30,
              background: "var(--accent)",
              borderRadius: 7,
              flexShrink: 0,
            }}
          />
          <div>
            <div
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-0)",
                lineHeight: 1.2,
              }}
            >
              Dash
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-2)", marginTop: "0.1rem" }}>
              SSH Session Manager
            </div>
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "1.75rem",
          }}
        >
          <div style={{ marginBottom: "1.4rem" }}>
            <h2 style={{ fontSize: "1rem", marginBottom: "0.3rem" }}>
              {vaultExists ? "Welcome back" : "Create vault"}
            </h2>
            <p style={{ color: "var(--text-1)", fontSize: "0.82rem", lineHeight: 1.55 }}>
              {vaultExists
                ? "Enter your master password to unlock."
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
              style={{ width: "100%", marginTop: "1.25rem" }}
              disabled={loading}
            >
              {loading
                ? "Working…"
                : vaultExists
                ? "Unlock vault"
                : "Create vault"}
            </button>
          </form>
        </div>

        {!vaultExists && (
          <p
            style={{
              textAlign: "center",
              color: "var(--text-2)",
              fontSize: "0.71rem",
              marginTop: "0.9rem",
              lineHeight: 1.65,
            }}
          >
            ChaCha20-Poly1305 · Argon2id · Credentials never leave this device
          </p>
        )}
      </div>
    </div>
  );
}
