import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import { ContextMenu, type ContextMenuItem } from "../components/ContextMenu";
import { Drawer } from "../components/Drawer";
import { HostForm } from "../components/HostForm";
import { useToast } from "../components/Toast";
import { useSessionsStore } from "../store/sessions";
import { useSettingsStore, type SortOrder } from "../store/settings";
import { useVaultStore } from "../store/vault";
import type { Host, HostInput } from "../types";
import styles from "./Dashboard.module.css";

const TAG_PALETTE = [
  { bg: "rgba(255,255,255,0.04)", color: "#cfcfcf", border: "rgba(255,255,255,0.12)" },
  { bg: "rgba(255,255,255,0.06)", color: "#bfbfbf", border: "rgba(255,255,255,0.14)" },
  { bg: "rgba(255,255,255,0.08)", color: "#a0a0a0", border: "rgba(255,255,255,0.16)" },
  { bg: "rgba(255,255,255,0.06)", color: "#b0b0b0", border: "rgba(255,255,255,0.14)" },
  { bg: "rgba(255,255,255,0.05)", color: "#bfbfbf", border: "rgba(255,255,255,0.12)" },
  { bg: "rgba(255,255,255,0.07)", color: "#a8a8a8", border: "rgba(255,255,255,0.15)" },
];

function tagPalette(tag: string) {
  let h = 0;
  for (const c of tag) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

export function TagPill({ tag }: { tag: string }) {
  const c = tagPalette(tag);
  return (
    <span
      className="tag-pill"
      style={{ "--tag-bg": c.bg, "--tag-color": c.color, "--tag-border": c.border } as React.CSSProperties}
    >
      {tag}
    </span>
  );
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function parseQuickConnect(s: string): { hostname: string; username: string; port: number } | null {
  const m = s.trim().match(/^(?:([^@\s]+)@)?([^:\s]+)(?::(\d+))?$/);
  if (!m || !m[2]) return null;
  return { username: m[1] || "root", hostname: m[2], port: m[3] ? Number(m[3]) : 22 };
}

export function Dashboard() {
  const hosts = useVaultStore((s) => s.hosts);
  const addHost = useVaultStore((s) => s.addHost);
  const deleteHost = useVaultStore((s) => s.deleteHost);
  const { openTerminal, openSftp } = useSessionsStore();
  const { favorites, lastConnected, sortOrder, setSortOrder, toggleFavorite, setLastConnected, quickConnectHistory, pushQuickConnectHistory } = useSettingsStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const q = searchParams.get("q")?.toLowerCase().trim() ?? "";
  const view = searchParams.get("view");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<Host | null>(null);
  const [prefill, setPrefill] = useState<Partial<HostInput> | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Host | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; host: Host } | null>(null);
  const [qcOpen, setQcOpen] = useState(false);
  const [qcInput, setQcInput] = useState("");
  const qcRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setEditingHost(null);
        setPrefill(undefined);
        setDrawerOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setQcOpen(true);
        setTimeout(() => qcRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && qcOpen) {
        setQcOpen(false);
        setQcInput("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [qcOpen]);

  const processed = useMemo(() => {
    let result = hosts.filter((h) => {
      if (view === "starred" && !favorites.includes(h.id)) return false;
      if (q) {
        return (
          h.name.toLowerCase().includes(q) ||
          h.hostname.toLowerCase().includes(q) ||
          h.username.toLowerCase().includes(q) ||
          h.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
    if (sortOrder === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === "lastConnected") {
      result = [...result].sort((a, b) => (lastConnected[b.id] ?? 0) - (lastConnected[a.id] ?? 0));
    } else if (sortOrder === "favorites") {
      result = [...result].sort((a, b) => {
        const af = favorites.includes(a.id) ? 0 : 1;
        const bf = favorites.includes(b.id) ? 0 : 1;
        return af - bf || a.name.localeCompare(b.name);
      });
    }
    return result;
  }, [hosts, favorites, lastConnected, sortOrder, q, view]);

  const groups = useMemo((): { label: string; items: Host[] }[] => {
    if (q || sortOrder !== "name" || view === "starred") {
      return [{ label: "", items: processed }];
    }
    const byTag: Record<string, Host[]> = {};
    const noTag: Host[] = [];
    for (const h of processed) {
      if (h.tags.length > 0) {
        (byTag[h.tags[0]] ??= []).push(h);
      } else {
        noTag.push(h);
      }
    }
    const result: { label: string; items: Host[] }[] = Object.keys(byTag)
      .sort()
      .map((tag) => ({ label: tag, items: byTag[tag] }));
    if (noTag.length > 0) {
      result.push({ label: result.length > 0 ? "General" : "", items: noTag });
    }
    return result;
  }, [processed, q, sortOrder, view]);

  async function handleConnect(host: Host) {
    setConnecting(host.id);
    setLastConnected(host.id);
    try {
      const id = await openTerminal(host.id, host.name, 80, 24);
      navigate(`/terminal/${id}`);
    } catch (e) {
      toast.error(String(e));
      setConnecting(null);
    }
  }

  async function handleSftp(host: Host) {
    setConnecting(host.id + "-sftp");
    setLastConnected(host.id);
    try {
      const id = await openSftp(host.id, host.name);
      navigate(`/sftp/${id}`);
    } catch (e) {
      toast.error(String(e));
      setConnecting(null);
    }
  }

  function handleCopy(host: Host) {
    navigator.clipboard.writeText(`${host.username}@${host.hostname}:${host.port}`);
    setCopiedId(host.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function handleDuplicate(host: Host) {
    try {
      await addHost({
        name: `${host.name} (copy)`,
        hostname: host.hostname,
        port: host.port,
        username: host.username,
        auth_type: host.auth_type,
        secret: "",
        tags: host.tags,
        jump_host_id: host.jump_host_id,
      });
      toast.success(`"${host.name}" duplicated`);
    } catch (e) {
      toast.error(String(e));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteHost(deleteTarget.id);
    toast.success(`"${deleteTarget.name}" removed`);
    setDeleteTarget(null);
  }

  function handleExport() {
    const data = hosts.map(({ name, hostname, port, username, auth_type, tags }) => ({
      name, hostname, port, username, auth_type, tags,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dassh-hosts.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${hosts.length} host${hosts.length !== 1 ? "s" : ""}`);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Partial<HostInput>[];
      let count = 0;
      for (const item of data) {
        if (!item.name || !item.hostname) continue;
        await addHost({
          name: item.name,
          hostname: item.hostname,
          port: item.port ?? 22,
          username: item.username ?? "root",
          auth_type: item.auth_type ?? "agent",
          secret: "",
          tags: item.tags ?? [],
        });
        count++;
      }
      toast.success(`Imported ${count} host${count !== 1 ? "s" : ""}`);
    } catch (e) {
      toast.error(`Import failed: ${String(e)}`);
    }
  }

  function handleQuickConnect() {
    const parsed = parseQuickConnect(qcInput);
    if (!parsed) return;
    pushQuickConnectHistory(qcInput.trim());
    setQcOpen(false);
    setQcInput("");
    setPrefill(parsed);
    setEditingHost(null);
    setDrawerOpen(true);
  }

  function openContextMenu(e: React.MouseEvent, host: Host) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, host });
  }

  function buildContextItems(host: Host): ContextMenuItem[] {
    const isBusy = connecting === host.id || connecting === host.id + "-sftp";
    const isFav = favorites.includes(host.id);
    return [
      {
        label: "Connect SSH",
        icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>,
        onClick: () => !isBusy && handleConnect(host),
      },
      {
        label: "Connect SFTP",
        icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>,
        onClick: () => !isBusy && handleSftp(host),
      },
      { type: "separator" },
      {
        label: isFav ? "Unstar" : "Star",
        icon: <svg width="12" height="12" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
        onClick: () => toggleFavorite(host.id),
      },
      {
        label: "Copy address",
        icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
        onClick: () => handleCopy(host),
      },
      {
        label: "Duplicate",
        icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
        onClick: () => handleDuplicate(host),
      },
      { type: "separator" },
      {
        label: "Edit",
        icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
        onClick: () => { setEditingHost(host); setPrefill(undefined); setDrawerOpen(true); },
      },
      { type: "separator" },
      {
        label: "Delete",
        danger: true,
        icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>,
        onClick: () => setDeleteTarget(host),
      },
    ];
  }

  let cardIndex = 0;

  return (
    <div className={`page-fade ${styles.root}`}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.sortWrap}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-2)", flexShrink: 0 }}>
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <select
              className={styles.sortSelect}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            >
              <option value="name">Name</option>
              <option value="lastConnected">Last connected</option>
              <option value="favorites">Starred first</option>
            </select>
          </div>
        </div>

        <div className={styles.toolbarRight}>
          <button className="btn btn-ghost btn-sm" onClick={handleExport} title="Export hosts as JSON">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Export
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => importRef.current?.click()} title="Import hosts from JSON">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Import
          </button>
          <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImport} />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setQcOpen(true); setTimeout(() => qcRef.current?.focus(), 50); }}
            title="Quick connect (Ctrl+K)"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="13 17 18 12 13 7" />
              <polyline points="6 17 11 12 6 7" />
            </svg>
            Quick connect
            <kbd className={styles.kbd}>⌃K</kbd>
          </button>
          <div className={styles.toolbarDivider} />
          <span className={styles.hostCount}>
            {processed.length !== hosts.length
              ? `${processed.length} of ${hosts.length}`
              : `${hosts.length} host${hosts.length !== 1 ? "s" : ""}`}
          </span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setEditingHost(null); setPrefill(undefined); setDrawerOpen(true); }}
          >
            + New host
          </button>
          <kbd className={styles.kbd}>⌃N</kbd>
        </div>
      </div>

      <div className={styles.list}>
        {hosts.length === 0 ? (
          <EmptyState onAdd={() => { setEditingHost(null); setPrefill(undefined); setDrawerOpen(true); }} />
        ) : processed.length === 0 ? (
          <div className={styles.noResults}>
            <div className={styles.noResultsIcon}>⊘</div>
            <span>No hosts match the current filter</span>
          </div>
        ) : (
          groups.map(({ label, items }) => (
            <div key={label || "__untagged"}>
              {label && (
                <div className={styles.groupHeader}>
                  <TagPill tag={label} />
                  <div className={styles.divider} />
                  <span className={styles.groupCount}>{items.length}</span>
                </div>
              )}
              {items.map((host) => {
                const idx = cardIndex++;
                return (
                  <HostCard
                    key={host.id}
                    host={host}
                    connecting={connecting}
                    copied={copiedId === host.id}
                    isFav={favorites.includes(host.id)}
                    lastTs={lastConnected[host.id]}
                    animIndex={idx}
                    onConnect={() => handleConnect(host)}
                    onSftp={() => handleSftp(host)}
                    onCopy={() => handleCopy(host)}
                    onEdit={() => { setEditingHost(host); setPrefill(undefined); setDrawerOpen(true); }}
                    onDelete={() => setDeleteTarget(host)}
                    onStar={() => toggleFavorite(host.id)}
                    onMenu={(e) => openContextMenu(e, host)}
                  />
                );
              })}
            </div>
          ))
        )}
      </div>

      {qcOpen && (
        <div className={styles.qcBackdrop} onMouseDown={() => { setQcOpen(false); setQcInput(""); }}>
          <div className={styles.qcPanel} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.qcTitle}>Quick connect</div>
            <input
              ref={qcRef}
              className={styles.qcInput}
              placeholder="user@hostname:port"
              value={qcInput}
              onChange={(e) => setQcInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuickConnect();
                if (e.key === "Escape") { setQcOpen(false); setQcInput(""); }
              }}
            />
            {quickConnectHistory.length > 0 && (
              <div className={styles.qcHistory}>
                {quickConnectHistory.slice(0, 5).map((addr) => (
                  <button
                    key={addr}
                    className={styles.qcHistoryItem}
                    onClick={() => { setQcInput(addr); qcRef.current?.focus(); }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="12 8 12 12 14 14" /><circle cx="12" cy="12" r="10" />
                    </svg>
                    {addr}
                  </button>
                ))}
              </div>
            )}
            <div className={styles.qcActions}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setQcOpen(false); setQcInput(""); }}>Cancel</button>
              <button
                className="btn btn-primary btn-sm"
                disabled={!parseQuickConnect(qcInput)}
                onClick={handleQuickConnect}
              >
                Open in new host form
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildContextItems(contextMenu.host)}
          onClose={() => setContextMenu(null)}
        />
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingHost ? "Edit host" : "New host"}
      >
        {drawerOpen && (
          <HostForm
            initial={editingHost ?? undefined}
            prefill={prefill}
            onSaved={() => {
              setDrawerOpen(false);
              toast.success(editingHost ? "Host updated" : "Host added");
            }}
            onCancel={() => setDrawerOpen(false)}
          />
        )}
      </Drawer>

      <ConfirmModal
        open={!!deleteTarget}
        title="Remove host"
        message={`Remove "${deleteTarget?.name}" from your vault? This action cannot be undone.`}
        confirmLabel="Remove"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function HostCard({
  host,
  connecting,
  copied,
  isFav,
  lastTs,
  animIndex,
  onConnect,
  onSftp,
  onCopy,
  onEdit,
  onDelete,
  onStar,
  onMenu,
}: {
  host: Host;
  connecting: string | null;
  copied: boolean;
  isFav: boolean;
  lastTs?: number;
  animIndex: number;
  onConnect: () => void;
  onSftp: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStar: () => void;
  onMenu: (e: React.MouseEvent) => void;
}) {
  const isBusy = connecting === host.id || connecting === host.id + "-sftp";
  const isConnectingSSH = connecting === host.id;
  const isConnectingSFTP = connecting === host.id + "-sftp";

  return (
    <div
      className={styles.card}
      style={{ animationDelay: `${Math.min(animIndex * 40, 320)}ms` }}
      onContextMenu={onMenu}
    >
      <div className={styles.cardBody}>
        <button
          className={`${styles.starBtn} ${isFav ? styles.starOn : ""}`}
          onClick={onStar}
          title={isFav ? "Unstar" : "Star"}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>

        <div className={styles.cardInfo}>
          <div className={styles.nameRow}>
            <span className={styles.hostName}>{host.name}</span>
            {host.tags.map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
          <div className={styles.addrRow}>
            <span className={`mono ${styles.addr}`}>
              {host.username}@{host.hostname}:{host.port}
            </span>
            <button
              className={`${styles.copyBtn} ${copied ? styles.copied : ""}`}
              onClick={onCopy}
              title="Copy connection string"
            >
              {copied ? "✓" : "⎘"}
            </button>
            <span className="badge">{host.auth_type}</span>
            {lastTs && (
              <span className={styles.lastConnected}>{relativeTime(lastTs)}</span>
            )}
          </div>
        </div>

        <div className={styles.cardActions}>
          <button
            className="btn btn-primary btn-sm"
            onClick={onConnect}
            disabled={isBusy}
            style={{ minWidth: 54 }}
          >
            {isConnectingSSH ? <span className="spinner" /> : "SSH"}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onSftp}
            disabled={isBusy}
            style={{ minWidth: 54 }}
          >
            {isConnectingSFTP ? <span className="spinner" /> : "SFTP"}
          </button>
          <div className={styles.cardSecondary}>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={onDelete}>Del</button>
            <button className="btn-icon" onClick={onMenu} title="More options">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIllo}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--indigo)" }}>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
          <path d="M8 10l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className={styles.emptyTitle}>No hosts yet</h3>
      <p className={styles.emptySub}>
        Add your first SSH host to get started. Credentials are encrypted locally using Argon2id + ChaCha20-Poly1305.
      </p>
      <button className="btn btn-primary" onClick={onAdd}>
        + Add first host
      </button>
    </div>
  );
}
