import { listen } from "@tauri-apps/api/event";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../components/Toast";
import { getSessionBuffer, resizeTerminal, sendInput } from "../lib/commands";
import { useSettingsStore } from "../store/settings";
import { useSessionsStore } from "../store/sessions";

export function TerminalPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const closeTerminal = useSessionsStore((s) => s.closeTerminal);
  const openTerminal = useSessionsStore((s) => s.openTerminal);
  const sessions = useSessionsStore((s) => s.sessions);
  const navigate = useNavigate();
  const toast = useToast();

  const { terminalFontSize, terminalFontFamily, terminalLineHeight, terminalCursorBlink } =
    useSettingsStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  const [sessionClosed, setSessionClosed] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const session = sessions.find((s) => s.id === sessionId);

  useEffect(() => {
    if (!containerRef.current || !sessionId) return;

    const term = new Terminal({
      cursorBlink: terminalCursorBlink,
      fontSize: terminalFontSize,
      fontFamily: `"${terminalFontFamily}", ui-monospace, monospace`,
      lineHeight: terminalLineHeight,
      theme: {
        background: "#0f0f12",
        foreground: "#d4d4d8",
        cursor: "#7c6fff",
        cursorAccent: "#0f0f12",
        selectionBackground: "#2e2e3a",
        black: "#18181c",
        red: "#f87171",
        green: "#22d17a",
        yellow: "#fbbf24",
        blue: "#7c6fff",
        magenta: "#c084fc",
        cyan: "#22d1c8",
        white: "#a1a1aa",
        brightBlack: "#3f3f46",
        brightRed: "#fca5a5",
        brightGreen: "#4ade80",
        brightYellow: "#fde68a",
        brightBlue: "#a5b4fc",
        brightMagenta: "#d8b4fe",
        brightCyan: "#5eead4",
        brightWhite: "#d4d4d8",
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;
    fitRef.current = fit;

    const unlistenOutput = listen<number[]>(`ssh-output-${sessionId}`, (event) => {
      term.write(new Uint8Array(event.payload));
    });
    unlistenOutput.then(() => {
      getSessionBuffer(sessionId).then((buf) => {
        if (buf.length > 0) term.write(new Uint8Array(buf));
      }).catch(() => {});
    });

    const unlistenClosed = listen<number>(`ssh-closed-${sessionId}`, () => {
      term.writeln("\r\n\x1b[90m── session closed ──\x1b[0m");
      setSessionClosed(true);
    });

    const disposeInput = term.onData((data) => {
      sendInput(sessionId, Array.from(new TextEncoder().encode(data))).catch(() => {});
    });

    const observer = new ResizeObserver(() => {
      fit.fit();
      resizeTerminal(sessionId, term.cols, term.rows).catch(() => {});
    });
    observer.observe(containerRef.current);

    return () => {
      unlistenOutput.then((fn) => fn());
      unlistenClosed.then((fn) => fn());
      disposeInput.dispose();
      observer.disconnect();
      term.dispose();
    };
  }, [sessionId, terminalFontSize, terminalFontFamily, terminalLineHeight, terminalCursorBlink]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "W") {
        e.preventDefault();
        handleDisconnect();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sessionId]);

  async function handleDisconnect() {
    if (!sessionId) return;
    await closeTerminal(sessionId).catch(() => {});
    navigate("/");
  }

  async function handleReconnect() {
    if (!session) return;
    setReconnecting(true);
    try {
      const newId = await openTerminal(
        session.host_id,
        session.host_name,
        termRef.current?.cols ?? 80,
        termRef.current?.rows ?? 24
      );
      navigate(`/terminal/${newId}`);
    } catch (e) {
      toast.error(String(e));
      setReconnecting(false);
    }
  }

  return (
    <div
      className="page-fade"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
        background: "#0f0f12",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 1rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-2)",
          flexShrink: 0,
          gap: "0.75rem",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              flexShrink: 0,
              background: sessionClosed ? "var(--text-3)" : "var(--green)",
              boxShadow: sessionClosed ? "none" : "0 0 6px rgba(45,216,114,0.6)",
              transition: "background 0.3s, box-shadow 0.3s",
            }}
          />
          <span
            style={{
              fontFamily: '"Cascadia Code", "JetBrains Mono", ui-monospace, monospace',
              fontSize: "0.8rem",
              color: "var(--text-1)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {session?.host_name ?? "Terminal"}
          </span>
          {sessionClosed && (
            <span
              style={{
                fontSize: "0.72rem",
                color: "var(--text-2)",
                background: "var(--bg-3)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "0.05rem 0.4rem",
              }}
            >
              closed
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexShrink: 0 }}>
          <kbd
            style={{
              fontSize: "0.68rem",
              color: "var(--text-2)",
              background: "var(--bg-3)",
              border: "1px solid var(--border-hi)",
              borderRadius: 4,
              padding: "0.06rem 0.38rem",
              fontFamily: "monospace",
            }}
          >
            Ctrl+Shift+W
          </kbd>
          <button className="btn btn-danger btn-sm" onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{ flex: 1, overflow: "hidden", padding: "2px 4px" }}
      />

      {sessionClosed && (
        <div
          className="pop-in"
          style={{
            position: "absolute",
            bottom: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-4)",
            border: "1px solid var(--border-hi)",
            borderRadius: 10,
            padding: "0.85rem 1.1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            zIndex: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <span
            style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--text-3)", flexShrink: 0 }}
          />
          <span style={{ color: "var(--text-1)", fontSize: "0.83rem", whiteSpace: "nowrap" }}>
            Session ended
          </span>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleReconnect}
            disabled={reconnecting}
          >
            {reconnecting ? "Connecting…" : "Reconnect"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleDisconnect}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
