"use client";

import { useState, useCallback } from "react";

/*
 * CopyButton — micro-interaction with checkmark feedback
 * Stripe-style: click → ✓ checkmark → fade back to copy icon
 */

export function CopyButton({ text, label, className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border transition-all press-active ${
        copied
          ? "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]"
          : "bg-[#f6f9fc] text-[#533afd] border-[#e5edf5] hover:border-[#b9b9f9] hover:bg-white"
      } ${className}`}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3" /></svg>
          {label && <span>Copied!</span>}
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="7" height="7" rx="1" /><path d="M8 4V2.5A1.5 1.5 0 0 0 6.5 1h-4A1.5 1.5 0 0 0 1 2.5v4A1.5 1.5 0 0 0 2.5 8H4" /></svg>
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
}

/*
 * ContextMenu — right-click on items for quick actions
 * Stripe-style: clean dropdown with icons
 */

interface ContextMenuItem {
  label: string;
  icon?: string;
  action: () => void;
  variant?: "default" | "danger";
}

export function ContextMenu({ items, x, y, onClose }: { items: ContextMenuItem[]; x: number; y: number; onClose: () => void }) {
  // Adjust position to stay in viewport
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - (items.length * 36 + 16));

  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose(); }} />
      <div
        className="fixed z-[91] bg-white border border-[#e5edf5] rounded-lg py-1 min-w-[180px] animate-slide-up"
        style={{
          left: adjustedX,
          top: adjustedY,
          boxShadow: "rgba(50,50,93,0.25) 0px 20px 40px -10px, rgba(0,0,0,0.1) 0px 10px 20px -5px",
        }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => { item.action(); onClose(); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors ${
              item.variant === "danger"
                ? "text-[#dc2626] hover:bg-[#fef2f2]"
                : "text-[#061b31] hover:bg-[#f6f9fc]"
            }`}
          >
            {item.icon && <span className="text-[14px] w-5 text-center">{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

export function useContextMenu() {
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  const openMenu = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, items });
  }, []);

  const closeMenu = useCallback(() => setMenu(null), []);

  return { menu, openMenu, closeMenu };
}