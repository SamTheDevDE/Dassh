import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type Kind = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  kind: Kind;
}

interface ToastApi {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const Ctx = createContext<ToastApi>({ success: () => { }, error: () => { }, info: () => { } });

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, kind: Kind) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <Ctx.Provider value={{ success: (m) => push(m, "success"), error: (m) => push(m, "error"), info: (m) => push(m, "info") }}>
      {children}
      <ToastContainer toasts={toasts} />
    </Ctx.Provider>
  );
}

const KIND_STYLES: Record<Kind, { accent: string; icon: ReactNode }> = {
  success: {
    accent: "var(--green)",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  error: {
    accent: "var(--red)",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
  },
  info: {
    accent: "var(--indigo)",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
};

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (!toasts.length) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastBubble key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastBubble({ toast }: { toast: ToastItem }) {
  const k = KIND_STYLES[toast.kind];
  return (
    <div
      style={{
        background: "rgba(18, 18, 30, 0.94)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        border: "1px solid var(--border-hi)",
        borderLeft: `3px solid ${k.accent}`,
        borderRadius: 10,
        padding: "0.7rem 0.95rem",
        display: "flex",
        alignItems: "center",
        gap: "0.65rem",
        minWidth: 240,
        maxWidth: 340,
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        pointerEvents: "all",
        animation: "toastIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <span
        style={{
          color: k.accent,
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {k.icon}
      </span>
      <span style={{ fontSize: "0.84rem", color: "var(--text-0)", flex: 1, lineHeight: 1.5 }}>
        {toast.message}
      </span>
    </div>
  );
}
