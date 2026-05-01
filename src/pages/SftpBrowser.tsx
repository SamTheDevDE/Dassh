import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { sftpDelete, sftpListDir, sftpMkdir } from "../lib/commands";
import { useSessionsStore } from "../store/sessions";
import type { FileEntry } from "../types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function SftpBrowser() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const closeSftp = useSessionsStore((s) => s.closeSftp);
  const sessions = useSessionsStore((s) => s.sessions);
  const navigate = useNavigate();
  const toast = useToast();

  const [path, setPath] = useState("/");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [mkdirOpen, setMkdirOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null);

  const session = sessions.find((s) => s.id === sessionId);

  async function loadDir(p: string) {
    if (!sessionId) return;
    setLoading(true);
    try {
      const result = await sftpListDir(sessionId, p);
      const sorted = [...result].sort((a, b) => {
        if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setEntries(sorted);
      setPath(p);
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDir("/"); }, [sessionId]);

  useEffect(() => {
    if (mkdirOpen) setTimeout(() => folderInputRef.current?.focus(), 50);
  }, [mkdirOpen]);

  function goUp() {
    const parts = path.split("/").filter(Boolean);
    parts.pop();
    loadDir("/" + parts.join("/") || "/");
  }

  async function handleMkdir() {
    const name = folderName.trim();
    if (!name || !sessionId) return;
    try {
      await sftpMkdir(sessionId, `${path}/${name}`.replace("//", "/"));
      toast.success(`Created "${name}"`);
      setMkdirOpen(false);
      setFolderName("");
      loadDir(path);
    } catch (e) {
      toast.error(String(e));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !sessionId) return;
    try {
      await sftpDelete(sessionId, deleteTarget.path, deleteTarget.is_dir);
      toast.success(`Deleted "${deleteTarget.name}"`);
      setDeleteTarget(null);
      loadDir(path);
    } catch (e) {
      toast.error(String(e));
      setDeleteTarget(null);
    }
  }

  async function handleDisconnect() {
    if (!sessionId) return;
    await closeSftp(sessionId);
    navigate("/");
  }

  const breadcrumbs = path.split("/").filter(Boolean);

  return (
    <div className="page-fade" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.55rem 1rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-1)",
          flexShrink: 0,
          gap: "1rem",
          zIndex: 1,
          height: 44,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              flexShrink: 0,
              background: "var(--blue)",
              boxShadow: "0 0 8px rgba(91,138,246,0.6)",
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: -3,
                borderRadius: "50%",
                border: "1.5px solid var(--blue)",
                animation: "pulseRing 2s ease-out infinite",
                opacity: 0,
              }}
            />
          </span>
          <span
            className="gradient-text"
            style={{
              fontFamily: '"Cascadia Code", "JetBrains Mono", ui-monospace, monospace',
              fontSize: "0.82rem",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {session?.host_name ?? "SFTP"} — files
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexShrink: 0 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setFolderName(""); setMkdirOpen(true); }}
          >
            + Folder
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
          padding: "0.4rem 1rem",
          borderBottom: "1px solid var(--border)",
          fontSize: "0.8rem",
          color: "var(--text-2)",
          flexShrink: 0,
          flexWrap: "wrap",
          background: "var(--bg-1)",
        }}
      >
        <button
          className="btn btn-ghost btn-sm"
          style={{ padding: "0.1rem 0.38rem", fontSize: "0.8rem" }}
          onClick={() => loadDir("/")}
        >
          /
        </button>
        {breadcrumbs.map((part, i) => {
          const crumbPath = "/" + breadcrumbs.slice(0, i + 1).join("/");
          return (
            <span key={crumbPath} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <span style={{ color: "var(--text-3)" }}>/</span>
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: "0.1rem 0.38rem", fontSize: "0.8rem" }}
                onClick={() => loadDir(crumbPath)}
              >
                {part}
              </button>
            </span>
          );
        })}
        {path !== "/" && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: "auto", padding: "0.1rem 0.42rem", fontSize: "0.78rem" }}
            onClick={goUp}
          >
            ↑ Up
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-1)" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-2)", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <span className="spinner" />
            Loading…
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-2)", fontSize: "0.85rem" }}>
            Empty directory
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-2)" }}>
                {["Name", "Size", "Modified", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.48rem 1rem",
                      textAlign: "left",
                      fontSize: "0.64rem",
                      color: "var(--text-2)",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.path}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    transition: "background 0.1s",
                    cursor: entry.is_dir ? "pointer" : "default",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  onDoubleClick={() => entry.is_dir && loadDir(entry.path)}
                >
                  <td style={{ padding: "0.6rem 1rem" }}>
                    <span
                      style={{
                        cursor: entry.is_dir ? "pointer" : "default",
                        color: entry.is_dir ? "var(--indigo)" : "var(--text-0)",
                        fontSize: "0.85rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.55rem",
                      }}
                      onClick={() => entry.is_dir && loadDir(entry.path)}
                    >
                      {entry.is_dir ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-2)" }}>
                          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                          <polyline points="13 2 13 9 20 9" />
                        </svg>
                      )}
                      {entry.name}
                    </span>
                  </td>
                  <td style={{ padding: "0.6rem 1rem", color: "var(--text-2)", fontSize: "0.8rem" }}>
                    {entry.is_dir ? "—" : formatSize(entry.size)}
                  </td>
                  <td style={{ padding: "0.6rem 1rem", color: "var(--text-2)", fontSize: "0.8rem" }}>
                    {entry.modified ? new Date(entry.modified * 1000).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>
                    <button
                      className="btn-icon"
                      onClick={() => setDeleteTarget(entry)}
                      title={`Delete ${entry.name}`}
                      style={{ color: "var(--text-2)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--red)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--red-surface)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {mkdirOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            animation: "fadeIn 0.15s ease-out",
          }}
          onClick={(e) => e.target === e.currentTarget && setMkdirOpen(false)}
        >
          <div
            className="glass-hi scale-in"
            style={{
              border: "1px solid var(--border-hi)",
              borderRadius: 16,
              padding: "1.5rem",
              width: 340,
              boxShadow: "0 24px 64px rgba(0,0,0,0.65)",
            }}
          >
            <h3 style={{ fontSize: "0.95rem", marginBottom: "1.1rem", color: "var(--text-0)" }}>New folder</h3>
            <div className="field">
              <label>Folder name</label>
              <input
                ref={folderInputRef}
                placeholder="my-folder"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleMkdir();
                  if (e.key === "Escape") setMkdirOpen(false);
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setMkdirOpen(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleMkdir} disabled={!folderName.trim()}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.is_dir ? "folder" : "file"}`}
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
