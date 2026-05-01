import { useEffect, type ReactNode } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

export function Drawer({ open, onClose, title, children, width = 420 }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          zIndex: 40,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "all" : "none",
          transition: "opacity 0.2s",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width,
          background: "var(--bg-2)",
          borderLeft: "1px solid var(--border-hi)",
          zIndex: 41,
          transform: open ? "translateX(0)" : `translateX(${width}px)`,
          transition: "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-20px 0 60px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.1rem 1.4rem",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <h2 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-0)" }}>
            {title}
          </h2>
          <button
            className="btn-icon"
            onClick={onClose}
            style={{ fontSize: "1.1rem", color: "var(--text-2)" }}
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "1.4rem" }}>
          {children}
        </div>
      </div>
    </>
  );
}
