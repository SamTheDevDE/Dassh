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
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.7)",
        }}
        onClick={onCancel}
      />
      <div
        className="pop-in"
        style={{
          position: "relative",
          zIndex: 1,
          background: "var(--bg-4)",
          border: "1px solid var(--border-hi)",
          borderRadius: 10,
          padding: "1.5rem",
          width: 340,
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6)",
        }}
      >
        <h3 style={{ marginBottom: "0.5rem", fontSize: "0.95rem" }}>{title}</h3>
        <p
          style={{
            color: "var(--text-1)",
            fontSize: "0.84rem",
            marginBottom: "1.5rem",
            lineHeight: 1.6,
          }}
        >
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
  );
}
