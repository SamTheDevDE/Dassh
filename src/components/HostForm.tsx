import { useState } from "react";
import { useVaultStore } from "../store/vault";
import type { Host, HostInput } from "../types";

interface Props {
  initial?: Host;
  prefill?: Partial<HostInput>;
  onSaved: () => void;
  onCancel: () => void;
}

const DEFAULT: HostInput = {
  name: "",
  hostname: "",
  port: 22,
  username: "",
  auth_type: "password",
  secret: "",
  tags: [],
  jump_host_id: undefined,
};

const AUTH_OPTIONS: { value: HostInput["auth_type"]; label: string }[] = [
  { value: "password", label: "Password" },
  { value: "key",      label: "SSH Key"  },
  { value: "agent",    label: "Agent"    },
];

export function HostForm({ initial, prefill, onSaved, onCancel }: Props) {
  const keys = useVaultStore((s) => s.keys);
  const addHost = useVaultStore((s) => s.addHost);
  const updateHost = useVaultStore((s) => s.updateHost);

  const [form, setForm] = useState<HostInput>(
    initial
      ? {
          name: initial.name,
          hostname: initial.hostname,
          port: initial.port,
          username: initial.username,
          auth_type: initial.auth_type,
          secret: "",
          tags: initial.tags,
          jump_host_id: initial.jump_host_id,
        }
      : { ...DEFAULT, ...prefill }
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof HostInput>(k: K, v: HostInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (initial) {
        await updateHost({ ...initial, ...form });
      } else {
        await addHost(form);
      }
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label>Name</label>
        <input
          required
          autoFocus
          placeholder="e.g. Production Web"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: "0.75rem" }}>
        <div className="field">
          <label>Hostname / IP</label>
          <input
            required
            placeholder="192.168.1.1"
            value={form.hostname}
            onChange={(e) => set("hostname", e.target.value)}
          />
        </div>
        <div className="field">
          <label>Port</label>
          <input
            type="number"
            min={1}
            max={65535}
            value={form.port}
            onChange={(e) => set("port", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="field">
        <label>Username</label>
        <input
          required
          placeholder="root"
          value={form.username}
          onChange={(e) => set("username", e.target.value)}
        />
      </div>

      <div className="field">
        <label>Authentication</label>
        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.1rem" }}>
          {AUTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set("auth_type", opt.value)}
              style={{
                flex: 1,
                padding: "0.38rem 0.5rem",
                borderRadius: 7,
                border: "1px solid",
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "background 0.12s, border-color 0.12s, color 0.12s",
                background: form.auth_type === opt.value ? "var(--indigo-surface)" : "var(--bg-3)",
                borderColor: form.auth_type === opt.value ? "var(--indigo)" : "var(--border-hi)",
                color: form.auth_type === opt.value ? "var(--indigo)" : "var(--text-1)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {form.auth_type === "password" && (
        <div className="field">
          <label>
            {initial ? "Password" : "Password"}
            {initial && (
              <span style={{ color: "var(--text-2)", fontWeight: 400, marginLeft: "0.35rem" }}>
                leave blank to keep current
              </span>
            )}
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={form.secret ?? ""}
            onChange={(e) => set("secret", e.target.value)}
          />
        </div>
      )}

      {form.auth_type === "key" && (
        <div className="field">
          <label>SSH Key</label>
          {keys.length === 0 ? (
            <p style={{ color: "var(--text-2)", fontSize: "0.82rem", marginTop: "0.25rem", lineHeight: 1.6 }}>
              No keys in vault — add one in Settings.
            </p>
          ) : (
            <select
              value={form.secret ?? ""}
              onChange={(e) => set("secret", e.target.value)}
            >
              <option value="">Select key…</option>
              {keys.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name} ({k.key_type})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="field">
        <label>
          Tags
          <span style={{ color: "var(--text-2)", fontWeight: 400, marginLeft: "0.35rem" }}>
            comma-separated
          </span>
        </label>
        <input
          placeholder="production, web"
          value={form.tags.join(", ")}
          onChange={(e) =>
            set(
              "tags",
              e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            )
          }
        />
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          justifyContent: "flex-end",
          marginTop: "1.4rem",
          paddingTop: "1rem",
          borderTop: "1px solid var(--border)",
        }}
      >
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? (
            <>
              <span className="spinner" />
              Saving…
            </>
          ) : initial ? "Save changes" : "Add host"}
        </button>
      </div>
    </form>
  );
}
