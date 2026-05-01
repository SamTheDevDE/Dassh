import { useEffect, type ReactNode } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

export function Drawer({ open, onClose, title, children, width = 440 }: DrawerProps) {
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
          background: "rgba(0, 0, 0, 0.55)",
          backdropFilter: open ? "blur(8px)" : "none",
          WebkitBackdropFilter: open ? "blur(8px)" : "none",
          zIndex: 40,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "all" : "none",
          transition: "opacity 0.22s, backdrop-filter 0.22s",
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
          background: "var(--bg-1)",
          borderLeft: "1px solid var(--border-hi)",
          zIndex: 41,
          transform: open ? "translateX(0)" : `translateX(${width + 20}px)`,
          transition: open
            ? "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "transform 0.22s ease-in",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-24px 0 64px rgba(0, 0, 0, 0.55)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.15rem 1.5rem",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <h2 className="gradient-text" style={{ fontSize: "0.95rem", fontWeight: 600 }}>
            {title}
          </h2>
          <button
            className="btn-icon"
            onClick={onClose}
            style={{ fontSize: "1.2rem", color: "var(--text-2)", width: 28, height: 28 }}
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {children}
        </div>
      </div>
    </>
  );
}
