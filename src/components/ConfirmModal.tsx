import { useEffect } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") { e.preventDefault(); onConfirm(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.15s ease-out",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
        onClick={onCancel}
      />
      <div
        className="glass-hi scale-in"
        style={{
          position: "relative",
          zIndex: 1,
          border: "1px solid var(--border-hi)",
          borderRadius: 16,
          width: 360,
          maxWidth: "calc(100vw - 2rem)",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.65)",
        }}
      >
        {danger && (
          <div
            style={{
              height: 3,
              background: "#ffffff",
            }}
          />
        )}
        <div style={{ padding: "1.5rem" }}>
          <h3 style={{ marginBottom: "0.5rem", fontSize: "0.95rem", color: "var(--text-0)" }}>
            {title}
          </h3>
          <p style={{ color: "var(--text-1)", fontSize: "0.84rem", marginBottom: "1.5rem", lineHeight: 1.65 }}>
            {message}
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button
              className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
              onClick={onConfirm}
              autoFocus
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
