import { useState } from "react";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { FONT_FAMILIES, useSettingsStore, type FontFamily } from "../store/settings";
import { useVaultStore } from "../store/vault";
import type { SshKeyInfo } from "../types";
import styles from "./Settings.module.css";

type Section = "terminal" | "keys" | "about";

const NAV: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: "terminal",
    label: "Terminal",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  {
    id: "keys",
    label: "SSH Keys",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
  },
  {
    id: "about",
    label: "About",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
];

export function Settings() {
  const [section, setSection] = useState<Section>("terminal");

  return (
    <div className={`page-fade ${styles.root}`}>
      {/* Left nav */}
      <nav className={styles.sidenav}>
        <div className={styles.sidenavLabel}>Settings</div>
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`${styles.sidenavItem} ${section === item.id ? styles.active : ""}`}
            onClick={() => setSection(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className={styles.content}>
        {section === "terminal" && <TerminalSection />}
        {section === "keys" && <KeysSection />}
        {section === "about" && <AboutSection />}
      </div>
    </div>
  );
}

// ─── Terminal section ─────────────────────────────────────────────────────────

function TerminalSection() {
  const {
    terminalFontSize,
    terminalFontFamily,
    terminalLineHeight,
    terminalCursorBlink,
    setTerminalFontSize,
    setTerminalFontFamily,
    setTerminalLineHeight,
    setTerminalCursorBlink,
  } = useSettingsStore();

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Terminal</div>
      <div className={styles.sectionSub}>
        Appearance settings for SSH terminal sessions. Changes apply to new sessions.
      </div>

      <div className={styles.settingGroup}>
        {/* Font size */}
        <div className={styles.settingRow}>
          <div>
            <div className={styles.settingLabel}>Font size</div>
            <div className={styles.settingHint}>Terminal character size in pixels</div>
          </div>
          <div className={styles.control}>
            <input
              type="range"
              min={10}
              max={20}
              step={1}
              value={terminalFontSize}
              onChange={(e) => setTerminalFontSize(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.sliderVal}>{terminalFontSize}</span>
          </div>
        </div>

        {/* Font family */}
        <div className={styles.settingRow}>
          <div>
            <div className={styles.settingLabel}>Font family</div>
            <div className={styles.settingHint}>Monospace font used in the terminal</div>
          </div>
          <select
            className={styles.select}
            value={terminalFontFamily}
            onChange={(e) => setTerminalFontFamily(e.target.value as FontFamily)}
            style={{ fontFamily: terminalFontFamily }}
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* Line height */}
        <div className={styles.settingRow}>
          <div>
            <div className={styles.settingLabel}>Line height</div>
            <div className={styles.settingHint}>Vertical spacing between lines</div>
          </div>
          <div className={styles.control}>
            <input
              type="range"
              min={1.0}
              max={2.0}
              step={0.05}
              value={terminalLineHeight}
              onChange={(e) => setTerminalLineHeight(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.sliderVal}>{terminalLineHeight.toFixed(2)}</span>
          </div>
        </div>

        {/* Cursor blink */}
        <div className={styles.settingRow}>
          <div>
            <div className={styles.settingLabel}>Cursor blink</div>
            <div className={styles.settingHint}>Animate the terminal cursor</div>
          </div>
          <button
            className={`${styles.toggle} ${terminalCursorBlink ? styles.on : ""}`}
            onClick={() => setTerminalCursorBlink(!terminalCursorBlink)}
            title={terminalCursorBlink ? "On" : "Off"}
          >
            <div className={styles.toggleThumb} />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div
        style={{
          background: "#0f0f12",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "1rem 1.25rem",
        }}
      >
        <div
          style={{
            fontSize: "0.68rem",
            color: "var(--text-2)",
            marginBottom: "0.6rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Preview
        </div>
        <div
          style={{
            fontFamily: `"${terminalFontFamily}", ui-monospace, monospace`,
            fontSize: terminalFontSize,
            lineHeight: terminalLineHeight,
            color: "#d4d4d8",
          }}
        >
          <span style={{ color: "#22d17a" }}>user@host</span>
          <span style={{ color: "#4c4c58" }}>:</span>
          <span style={{ color: "#7c6fff" }}>~</span>
          <span style={{ color: "#4c4c58" }}> $</span>
          <span> ssh root@192.168.1.10</span>
          <br />
          <span style={{ color: "#6b6b78" }}>Welcome to Ubuntu 24.04 LTS</span>
        </div>
      </div>
    </div>
  );
}

// ─── SSH Keys section ─────────────────────────────────────────────────────────

function KeysSection() {
  const { keys, generateKey, importKey, deleteKey } = useVaultStore();
  const toast = useToast();

  const [genOpen, setGenOpen] = useState(false);
  const [genName, setGenName] = useState("");
  const [genLoading, setGenLoading] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importName, setImportName] = useState("");
  const [importPem, setImportPem] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SshKeyInfo | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleGenerate() {
    if (!genName.trim()) return;
    setGenLoading(true);
    try {
      await generateKey(genName.trim());
      toast.success(`Key "${genName.trim()}" generated`);
      setGenName("");
      setGenOpen(false);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setGenLoading(false);
    }
  }

  async function handleImport() {
    if (!importName.trim() || !importPem.trim()) return;
    setImportLoading(true);
    try {
      await importKey(importName.trim(), importPem.trim());
      toast.success(`Key "${importName.trim()}" imported`);
      setImportName("");
      setImportPem("");
      setImportOpen(false);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setImportLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteKey(deleteTarget.id);
      toast.success(`Key "${deleteTarget.name}" deleted`);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setDeleteTarget(null);
    }
  }

  function handleCopy(key: SshKeyInfo) {
    navigator.clipboard.writeText(key.public_key);
    setCopiedId(key.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>SSH Keys</div>
      <div className={styles.sectionSub}>
        Manage the SSH keys stored in your vault. Keys can be used for host authentication.
      </div>

      {/* Key list */}
      {keys.length === 0 ? (
        <div className={styles.emptyKeys}>No SSH keys in vault. Generate or import one below.</div>
      ) : (
        <div className={styles.keyList}>
          {keys.map((key) => (
            <div key={key.id} className={styles.keyRow}>
              <div className={styles.keyIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              </div>
              <div className={styles.keyInfo}>
                <div className={styles.keyName}>{key.name}</div>
                <div className={styles.keyMeta}>
                  <span className="badge">{key.key_type}</span>
                  <span className={styles.keyFp}>{key.fingerprint}</span>
                </div>
              </div>
              <div className={styles.keyActions}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleCopy(key)}
                  title="Copy public key"
                  style={{ minWidth: 52, color: copiedId === key.id ? "var(--green)" : undefined }}
                >
                  {copiedId === key.id ? "✓ Copied" : "Copy"}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setDeleteTarget(key)}
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate key */}
      <div className={styles.inlineForm}>
        <div className={styles.inlineFormHeader} onClick={() => setGenOpen((v) => !v)}>
          <span className={styles.inlineFormTitle}>Generate new key</span>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: genOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s", color: "var(--text-2)" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        {genOpen && (
          <div className={styles.inlineFormBody}>
            <div className="field" style={{ margin: 0 }}>
              <label>Key name</label>
              <input
                autoFocus
                placeholder="e.g. my-laptop"
                value={genName}
                onChange={(e) => setGenName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
            </div>
            <div className={styles.formActions}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setGenOpen(false); setGenName(""); }}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleGenerate}
                disabled={!genName.trim() || genLoading}
              >
                {genLoading ? <span className="spinner" /> : "Generate"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import key */}
      <div className={styles.inlineForm}>
        <div className={styles.inlineFormHeader} onClick={() => setImportOpen((v) => !v)}>
          <span className={styles.inlineFormTitle}>Import existing key</span>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: importOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s", color: "var(--text-2)" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        {importOpen && (
          <div className={styles.inlineFormBody}>
            <div className="field" style={{ margin: 0 }}>
              <label>Key name</label>
              <input
                autoFocus
                placeholder="e.g. work-server"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Private key (PEM)</label>
              <textarea
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                value={importPem}
                onChange={(e) => setImportPem(e.target.value)}
                rows={5}
                style={{ resize: "vertical", fontFamily: "monospace", fontSize: "0.78rem" }}
              />
            </div>
            <div className={styles.formActions}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setImportOpen(false); setImportName(""); setImportPem(""); }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleImport}
                disabled={!importName.trim() || !importPem.trim() || importLoading}
              >
                {importLoading ? <span className="spinner" /> : "Import"}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete key"
        message={`Delete "${deleteTarget?.name}"? Any hosts using this key will need to be updated.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── About section ────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>About</div>
      <div className={styles.sectionSub}>Dash SSH Session Manager</div>

      <div className={styles.aboutCard}>
        {[
          ["Version", "0.1.0"],
          ["Framework", "Tauri 2 + React 18"],
          ["SSH library", "russh 0.44"],
          ["Encryption", "ChaCha20-Poly1305"],
          ["Key derivation", "Argon2id"],
          ["Terminal", "xterm.js 5"],
        ].map(([k, v]) => (
          <div key={k} className={styles.aboutRow}>
            <span className={styles.aboutKey}>{k}</span>
            <span className={styles.aboutValue}>{v}</span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: "0.78rem", color: "var(--text-2)", lineHeight: 1.65 }}>
        All credentials are encrypted locally. Your master password is never stored — it is used
        solely to derive the vault encryption key via Argon2id. Nothing leaves this device.
      </p>
    </div>
  );
}
