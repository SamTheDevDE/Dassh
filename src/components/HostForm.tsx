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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 88px", gap: "0.75rem" }}>
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
        <select
          value={form.auth_type}
          onChange={(e) => set("auth_type", e.target.value as HostInput["auth_type"])}
        >
          <option value="password">Password</option>
          <option value="key">SSH Key</option>
          <option value="agent">SSH Agent</option>
        </select>
      </div>

      {form.auth_type === "password" && (
        <div className="field">
          <label>
            {initial ? "Password — leave blank to keep current" : "Password"}
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
            <p style={{ color: "var(--text-2)", fontSize: "0.82rem", marginTop: "0.25rem" }}>
              No keys in vault. Add one in Settings.
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
          marginTop: "1.25rem",
          paddingTop: "1rem",
          borderTop: "1px solid var(--border)",
        }}
      >
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : initial ? "Save changes" : "Add host"}
        </button>
      </div>
    </form>
  );
}
