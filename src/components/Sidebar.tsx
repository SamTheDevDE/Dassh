import { useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useVaultStore } from "../store/vault";
import { useSessionsStore } from "../store/sessions";
import type { ActiveSession } from "../types";
import styles from "./Sidebar.module.css";

export function Sidebar() {
  const lock = useVaultStore((s) => s.lock);
  const hosts = useVaultStore((s) => s.hosts);
  const sessions = useSessionsStore((s) => s.sessions);
  const closeTerminal = useSessionsStore((s) => s.closeTerminal);
  const closeSftp = useSessionsStore((s) => s.closeSftp);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  const isHome = location.pathname === "/";
  const currentView = searchParams.get("view");
  const currentQ = searchParams.get("q") ?? "";

  const isAllHosts = isHome && currentView !== "starred";
  const isStarred = isHome && currentView === "starred";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && isHome) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isHome]);

  function handleSearch(q: string) {
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      if (q) next.set("q", q);
      else next.delete("q");
      return next;
    }, { replace: true });
  }

  function handleAllHosts() {
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.delete("view");
      return next;
    }, { replace: true });
    if (!isHome) navigate("/");
  }

  function handleStarred() {
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set("view", "starred");
      return next;
    }, { replace: true });
    if (!isHome) navigate("/");
  }

  async function handleLock() {
    await lock();
    navigate("/unlock");
  }

  async function handleCloseSession(s: ActiveSession) {
    if (s.kind === "terminal") await closeTerminal(s.id).catch(() => {});
    else await closeSftp(s.id).catch(() => {});
    const sessionPath = s.kind === "terminal" ? `/terminal/${s.id}` : `/sftp/${s.id}`;
    if (location.pathname === sessionPath) navigate("/");
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.aurora} />

      <div className={styles.logo}>
        <div className={styles.logoMark} />
        <span className={styles.logoText}>Dassh</span>
      </div>

      {isHome && (
        <div className={styles.searchWrap}>
          <div className={styles.searchInputWrap}>
            <span className={styles.searchIcon}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              ref={searchRef}
              className={styles.searchInput}
              placeholder="Search hosts…"
              value={currentQ}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      <nav className={styles.nav}>
        <button
          className={`${styles.navItem} ${isAllHosts ? styles.active : ""}`}
          onClick={handleAllHosts}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={styles.navIcon}>
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          All Hosts
          {hosts.length > 0 && (
            <span className={styles.navBadge}>{hosts.length}</span>
          )}
        </button>
        <button
          className={`${styles.navItem} ${isStarred ? styles.active : ""}`}
          onClick={handleStarred}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={isStarred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75" className={styles.navIcon}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Starred
        </button>
      </nav>

      {sessions.length > 0 && (
        <>
          <div className={styles.divider} />
          <div className={styles.sessions}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionLabel}>Sessions</span>
              <span className={styles.sectionCount}>{sessions.length}</span>
            </div>
            {sessions.map((s) => (
              <div key={s.id} className={styles.sessionRow}>
                <NavLink
                  to={s.kind === "terminal" ? `/terminal/${s.id}` : `/sftp/${s.id}`}
                  className={({ isActive }) =>
                    `${styles.navItem} ${styles.sessionItem} ${isActive ? styles.active : ""}`
                  }
                >
                  <span
                    className={styles.sessionDot}
                    style={{
                      background: s.kind === "terminal" ? "var(--green)" : "var(--blue)",
                      color: s.kind === "terminal" ? "var(--green)" : "var(--blue)",
                      boxShadow: s.kind === "terminal"
                        ? "0 0 6px rgba(52,211,153,0.6)"
                        : "0 0 6px rgba(91,138,246,0.6)",
                    }}
                  />
                  <span className={styles.sessionKind}>
                    {s.kind === "terminal" ? "ssh" : "sftp"}
                  </span>
                  <span className={`${styles.sessionName} truncate`}>{s.host_name}</span>
                </NavLink>
                <button
                  className={styles.sessionClose}
                  onClick={() => handleCloseSession(s)}
                  title="Close session"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={styles.spacer} />

      <div className={styles.bottom}>
        <NavLink
          to="/settings"
          className={({ isActive }) => `${styles.bottomItem} ${isActive ? styles.active : ""}`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </NavLink>
        <button className={`${styles.bottomItem} ${styles.lockItem}`} onClick={handleLock}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Lock vault
        </button>
      </div>
    </aside>
  );
}
