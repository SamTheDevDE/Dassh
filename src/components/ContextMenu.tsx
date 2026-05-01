import { useEffect, useRef, useState } from "react";
import styles from "./ContextMenu.module.css";

export type ContextMenuItem =
  | { type: "separator" }
  | {
    type?: "item";
    label: string;
    icon?: React.ReactNode;
    shortcut?: string;
    danger?: boolean;
    onClick: () => void;
  };

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let ax = x;
    let ay = y;
    if (ax + rect.width > window.innerWidth) ax = window.innerWidth - rect.width - 8;
    if (ay + rect.height > window.innerHeight) ay = window.innerHeight - rect.height - 8;
    if (ax < 8) ax = 8;
    if (ay < 8) ay = 8;
    setPos({ x: ax, y: ay });
  }, [x, y]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className={styles.overlay} onMouseDown={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        ref={menuRef}
        className={styles.menu}
        style={{ left: pos.x, top: pos.y }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {items.map((item, i) => {
          if (item.type === "separator") {
            return <div key={i} className={styles.separator} />;
          }
          return (
            <button
              key={i}
              className={`${styles.item} ${item.danger ? styles.danger : ""}`}
              onClick={() => { item.onClick(); onClose(); }}
            >
              {item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
              <span className={styles.itemLabel}>{item.label}</span>
              {item.shortcut && <span className={styles.itemShortcut}>{item.shortcut}</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}
