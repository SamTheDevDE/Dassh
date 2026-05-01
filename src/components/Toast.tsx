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
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <Ctx.Provider value={{ success: (m) => push(m, "success"), error: (m) => push(m, "error"), info: (m) => push(m, "info") }}>
      {children}
      <ToastContainer toasts={toasts} />
    </Ctx.Provider>
  );
}

const KIND: Record<Kind, { icon: string; iconBg: string; iconColor: string; border: string }> = {
  success: { icon: "✓", iconBg: "rgba(45,216,114,0.15)", iconColor: "#2dd872", border: "rgba(45,216,114,0.35)" },
  error: { icon: "!", iconBg: "rgba(240,82,82,0.15)", iconColor: "#f07070", border: "rgba(240,82,82,0.35)" },
  info: { icon: "·", iconBg: "rgba(91,138,246,0.15)", iconColor: "#5b8af6", border: "rgba(91,138,246,0.35)" },
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
  const k = KIND[toast.kind];
  return (
    <div
      className="slide-in-right"
      style={{
        background: "var(--bg-4)",
        border: `1px solid ${k.border}`,
        borderRadius: 8,
        padding: "0.65rem 0.9rem",
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        minWidth: 240,
        maxWidth: 340,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        pointerEvents: "all",
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: k.iconBg,
          color: k.iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: k.icon === "·" ? "1.4rem" : "0.78rem",
          fontWeight: 700,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {k.icon}
      </span>
      <span style={{ fontSize: "0.84rem", color: "var(--text-0)", flex: 1, lineHeight: 1.45 }}>
        {toast.message}
      </span>
    </div>
  );
}
