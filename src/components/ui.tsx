"use client";

import { forwardRef, type ReactNode, type HTMLAttributes, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type CSSProperties, type DragEvent, useRef, useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────
   DESIGN TOKENS (matching globals.css)
   ────────────────────────────────────────────── */
const colors = {
  primary: "#533afd",
  primaryHover: "#4434d4",
  primaryLight: "#edeaff",
  text: "#061b31",
  muted: "#64748d",
  border: "#e5edf5",
  bg: "#ffffff",
  bgSecondary: "#f6f9fc",
  success: "#15be53",
  danger: "#dc2626",
  warning: "#f59e0b",
  info: "#3b82f6",
};

const radii = { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 };
const shadows = {
  sm: "0 1px 2px rgba(50,50,93,0.06)",
  md: "0 4px 8px rgba(50,50,93,0.08)",
  lg: "0 8px 24px rgba(50,50,93,0.12)",
  xl: "0 20px 40px rgba(50,50,93,0.15)",
};

const transitions = {
  fast: "120ms ease-out",
  normal: "180ms ease-out",
  slow: "240ms ease-out",
};

/* ──────────────────────────────────────────────
   BUTTON
   ────────────────────────────────────────────── */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, icon, iconPosition = "left", children, disabled, ...props }, ref) => {
    const baseStyles = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      fontWeight: 600,
      border: "none",
      borderRadius: radii.md,
      cursor: disabled || loading ? "not-allowed" : "pointer",
      transition: `all ${transitions.fast}`,
      fontFamily: "'Source Sans 3', system-ui, sans-serif",
      fontFeatureSettings: "'ss01'",
      WebkitFontSmoothing: "antialiased",
    } as CSSProperties;

        const variantStyles: Record<string, CSSProperties> = {
          primary: { background: colors.primary, color: "#fff", boxShadow: `0 2px 8px rgba(83,58,253,0.3)` },
          secondary: { background: colors.bgSecondary, color: colors.text, border: `1px solid ${colors.border}` },
          ghost: { background: "transparent", color: colors.primary },
          danger: { background: colors.danger, color: "#fff" },
          success: { background: colors.success, color: "#fff" },
        };

        const sizeStyles: Record<string, CSSProperties> = {
          sm: { padding: "6px 12px", fontSize: 12, minHeight: 32 },
          md: { padding: "10px 20px", fontSize: 13, minHeight: 40 },
          lg: { padding: "14px 28px", fontSize: 14, minHeight: 48 },
        };

        const hoverStyles: Record<string, CSSProperties> = {
          primary: { background: colors.primaryHover, boxShadow: `0 4px 12px rgba(83,58,253,0.4)` },
          secondary: { background: "#ebf0f7", borderColor: "#b9b9f9" },
          ghost: { background: colors.primaryLight },
          danger: { background: "#c02020" },
          success: { background: "#0fa844" },
        };

        const style: CSSProperties = {
      ...baseStyles,
      ...variantStyles[variant],
      ...sizeStyles[size],
      opacity: disabled || loading ? 0.6 : 1,
    };

    return (
      <button
        ref={ref}
        className={cn(className)}
        style={style}
        disabled={disabled || loading}
        {...props}
        onMouseEnter={!disabled && !loading ? (e) => { (e.currentTarget as HTMLElement).style.cssText += `;${Object.entries(hoverStyles[variant]).map(([k,v])=> `${k}:${v}`).join(";")}` } : undefined}
        onMouseLeave={!disabled && !loading ? (e) => { (e.currentTarget as HTMLElement).style.cssText = Object.entries(style).map(([k,v])=> `${k}:${v}`).join(";") } : undefined}
      >
        {loading ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : icon && iconPosition === "left" ? (
          <span style={{ display: "flex" }}>{icon}</span>
        ) : null}
        <span>{children}</span>
        {icon && iconPosition === "right" && <span style={{ display: "flex" }}>{icon}</span>}
      </button>
    );
  }
);
Button.displayName = "Button";

/* ──────────────────────────────────────────────
   INPUT / TEXTAREA / SELECT
   ────────────────────────────────────────────── */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} style={{ display: "block", fontSize: 12, fontWeight: 500, color: colors.text, marginBottom: 6 }}>
            {label}
          </label>
        )}
        <div style={{ position: "relative" }}>
          {icon && <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.muted, pointerEvents: "none" }}>{icon}</div>}
          <input
            ref={ref}
            id={inputId}
            className={cn(className)}
            style={{
              width: "100%",
              padding: icon ? "10px 12px 10px 44px" : "10px 12px",
              fontSize: 13,
              fontFamily: "'Source Sans 3', system-ui, sans-serif",
              color: colors.text,
              background: colors.bg,
              border: `1px solid ${error ? colors.danger : colors.border}`,
              borderRadius: radii.md,
              outline: "none",
              transition: `border ${transitions.fast}, box-shadow ${transitions.fast}`,
              boxShadow: error ? `0 0 0 3px ${colors.danger}20` : "none",
            }}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
        </div>
        {error && <p id={`${inputId}-error`} style={{ marginTop: 4, fontSize: 12, color: colors.danger }}>{error}</p>}
        {hint && !error && <p id={`${inputId}-hint`} style={{ marginTop: 4, fontSize: 12, color: colors.muted }}>{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} style={{ display: "block", fontSize: 12, fontWeight: 500, color: colors.text, marginBottom: 6 }}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(className)}
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 13,
            fontFamily: "'Source Sans 3', system-ui, sans-serif",
            color: colors.text,
            background: colors.bg,
            border: `1px solid ${error ? colors.danger : colors.border}`,
            borderRadius: radii.md,
            outline: "none",
            transition: `border ${transitions.fast}, box-shadow ${transitions.fast}`,
            boxShadow: error ? `0 0 0 3px ${colors.danger}20` : "none",
            minHeight: 100,
            resize: "vertical",
          }}
          aria-invalid={error ? "true" : "false"}
          {...props}
        />
        {error && <p id={`${inputId}-error`} style={{ marginTop: 4, fontSize: 12, color: colors.danger }}>{error}</p>}
        {hint && !error && <p id={`${inputId}-hint`} style={{ marginTop: 4, fontSize: 12, color: colors.muted }}>{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} style={{ display: "block", fontSize: 12, fontWeight: 500, color: colors.text, marginBottom: 6 }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(className)}
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 13,
            fontFamily: "'Source Sans 3', system-ui, sans-serif",
            color: colors.text,
            background: colors.bg,
            border: `1px solid ${error ? colors.danger : colors.border}`,
            borderRadius: radii.md,
            outline: "none",
            transition: `border ${transitions.fast}, box-shadow ${transitions.fast}`,
            boxShadow: error ? `0 0 0 3px ${colors.danger}20` : "none",
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            paddingRight: 40,
          }}
          aria-invalid={error ? "true" : "false"}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p id={`${selectId}-error`} style={{ marginTop: 4, fontSize: 12, color: colors.danger }}>{error}</p>}
        {hint && !error && <p id={`${selectId}-hint`} style={{ marginTop: 4, fontSize: 12, color: colors.muted }}>{hint}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

/* ──────────────────────────────────────────────
   CARD
   ────────────────────────────────────────────── */
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", padding = "md", hover, children, ...props }, ref) => {
    const paddingMap = { none: 0, sm: 12, md: 20, lg: 28 };
    const variantStyles: Record<string, React.CSSProperties> = {
      default: { background: colors.bg, border: `1px solid ${colors.border}` },
      bordered: { background: colors.bg, border: `1px solid ${colors.border}` },
      elevated: { background: colors.bg, boxShadow: shadows.md, border: "none" },
    };

    return (
      <div
        ref={ref}
        className={cn(className)}
        style={{
          borderRadius: radii.lg,
          padding: paddingMap[padding],
          transition: `box-shadow ${transitions.normal}, transform ${transitions.normal}`,
          ...variantStyles[variant],
          ...(hover && { cursor: "pointer" }),
        }}
        onMouseEnter={hover ? (e) => { (e.currentTarget as HTMLElement).style.boxShadow = shadows.lg } : undefined}
        onMouseLeave={hover ? (e) => { (e.currentTarget as HTMLElement).style.boxShadow = variant === "elevated" ? shadows.md : "none" } : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

/* ──────────────────────────────────────────────
   BADGE / STATUS BADGE
   ────────────────────────────────────────────── */
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "primary";
  size?: "sm" | "md";
  dot?: boolean;
}

const badgeColors: Record<string, { bg: string; text: string; border: string }> = {
  default: { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" },
  success: { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
  warning: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  danger: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  info: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
  primary: { bg: "#edeaff", text: "#3730a3", border: "#c7c0ff" },
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "md", dot, children, ...props }, ref) => {
    const c = badgeColors[variant];
    return (
      <span
        ref={ref}
        className={cn(className)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: size === "sm" ? "2px 8px" : "4px 10px",
          fontSize: size === "sm" ? 10 : 11,
          fontWeight: 600,
          borderRadius: radii.full,
          background: c.bg,
          color: c.text,
          border: `1px solid ${c.border}`,
          ...(dot && { position: "relative", paddingLeft: size === "sm" ? 18 : 22 }),
        }}
        {...props}
      >
        {dot && <span style={{ position: "absolute", left: size === "sm" ? 5 : 7, top: "50%", transform: "translateY(-50%)", width: 6, height: 6, borderRadius: "50%", background: c.text }} />}
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";

/* ──────────────────────────────────────────────
   MODAL / DIALOG
   ────────────────────────────────────────────── */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showClose?: boolean;
}

export function Modal({ open, onClose, title, description, children, size = "md", showClose = true }: ModalProps) {
  if (!open) return null;

  const sizeStyles: Record<string, CSSProperties> = {
    sm: { maxWidth: 400 },
    md: { maxWidth: 560 },
    lg: { maxWidth: 720 },
    xl: { maxWidth: 960 },
    full: { maxWidth: "calc(100% - 48px)" },
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(6,27,49,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="relative w-full bg-white rounded-2xl shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]"
        style={{ maxHeight: "90vh", overflow: "hidden", ...sizeStyles[size] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${colors.border}` }}>
          <div>
            <h2 id="modal-title" style={{ fontSize: 18, fontWeight: 600, color: colors.text, margin: 0 }}>{title}</h2>
            {description && <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.muted }}>{description}</p>}
          </div>
          {showClose && (
            <button onClick={onClose} style={{ background: "none", border: "none", color: colors.muted, cursor: "pointer", padding: 4, borderRadius: radii.md, display: "flex" }} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
        <div style={{ padding: "24px", overflow: "auto", maxHeight: `calc(90vh - 120px)` }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   TABLE
   ────────────────────────────────────────────── */
interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  stickyHeader?: boolean;
}

export function Table<T>({ columns, data, keyExtractor, onRowClick, loading, emptyMessage = "No data", stickyHeader = true }: TableProps<T>) {
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: radii.lg, overflow: "hidden", background: colors.bg }}>
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: colors.muted }}>
          <div style={{ width: 28, height: 28, border: `3px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 13 }}>Loading…</p>
        </div>
      ) : data.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: colors.muted }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📋</div>
          <p style={{ fontSize: 14 }}>{emptyMessage}</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead style={{ position: stickyHeader ? "sticky" : "relative", top: 0, zIndex: 1 }}>
              <tr style={{ background: colors.bgSecondary }}>
                {columns.map((col) => (
                  <th key={col.key} style={{ padding: "12px 16px", textAlign: col.align || "left", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", color: colors.muted, borderBottom: `1px solid ${colors.border}`, whiteSpace: "nowrap", width: col.width }}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={keyExtractor(row)} style={{ borderBottom: i < data.length - 1 ? `1px solid ${colors.border}` : "none", background: colors.bg, transition: "background 0.1s", cursor: onRowClick ? "pointer" : "default" }}
                  onClick={() => onRowClick?.(row)}
                  onMouseEnter={(e) => { if (!onRowClick) return; (e.currentTarget as HTMLElement).style.background = colors.bgSecondary }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = colors.bg }}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={{ padding: "12px 16px", textAlign: col.align || "left", color: colors.text, verticalAlign: "middle" }}>
                      {col.render ? col.render(row, i) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   TOAST (re-export from existing)
   ────────────────────────────────────────────── */
export { useToast, ToastProvider } from "@/lib/toast";

/* ──────────────────────────────────────────────
   EMPTY STATE
   ────────────────────────────────────────────── */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center", color: colors.muted }}>
      {icon && <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>{icon}</div>}
      <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: colors.text }}>{title}</h3>
      {description && <p style={{ margin: 0, fontSize: 13, maxWidth: 280 }}>{description}</p>}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

/* ──────────────────────────────────────────────
   AVATAR
   ────────────────────────────────────────────── */
interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "busy" | "away";
}

export function Avatar({ src, alt, name, size = "md", status, className, ...props }: AvatarProps) {
  const sizeMap = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 };
  const dim = sizeMap[size];
  const initials = name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className={cn(className)} style={{ position: "relative", width: dim, height: dim, ...props }}>
      {src ? (
        <img src={src} alt={alt || name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: colors.primaryLight, color: colors.primary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: dim * 0.35 }}>
          {initials}
        </div>
      )}
      {status && (
        <span style={{ position: "absolute", bottom: 0, right: 0, width: dim * 0.25, height: dim * 0.25, borderRadius: "50%", border: `2px solid ${colors.bg}`, background: status === "online" ? colors.success : status === "busy" ? colors.danger : status === "away" ? colors.warning : colors.muted }} />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   DROPDOWN MENU
   ────────────────────────────────────────────── */
interface DropdownItem { label: string; onClick: () => void; icon?: ReactNode; danger?: boolean; divider?: boolean; disabled?: boolean; }

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
}

export function Dropdown({ trigger, items, align = "right" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen(!open)} style={{ display: "inline-flex" }}>{trigger}</div>
      {open && (
        <div style={{ position: "absolute", top: "100%", [align]: 0, marginTop: 8, zIndex: 50, minWidth: 200, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radii.md, boxShadow: shadows.lg, overflow: "hidden", animation: "slideDown 0.15s ease-out" }}>
          {items.map((item, i) => (
            item.divider ? (
              <div key={`divider-${i}`} style={{ height: 1, background: colors.border, margin: "4px 8px" }} />
            ) : (
              <button
                key={item.label}
                onClick={() => { item.onClick(); setOpen(false); }}
                disabled={item.disabled}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  fontFamily: "'Source Sans 3', system-ui, sans-serif",
                  color: item.danger ? colors.danger : colors.text,
                  background: "none",
                  border: "none",
                  textAlign: "left",
                  cursor: item.disabled ? "not-allowed" : "pointer",
                  opacity: item.disabled ? 0.4 : 1,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { if (!item.disabled) (e.currentTarget as HTMLElement).style.background = colors.bgSecondary }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent" }}
              >
                {item.icon && <span style={{ display: "flex", color: item.danger ? colors.danger : colors.muted }}>{item.icon}</span>}
                {item.label}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   TABS
   ────────────────────────────────────────────── */
interface TabProps { id: string; label: string; icon?: ReactNode; count?: number; disabled?: boolean; }
interface TabsProps { tabs: TabProps[]; activeTab: string; onChange: (id: string) => void; variant?: "default" | "pills" | "underline"; className?: string; }

export function Tabs({ tabs, activeTab, onChange, variant = "default", className }: TabsProps) {
  const baseStyles = { display: "flex", gap: variant === "default" ? 4 : 8 } as React.CSSProperties;
  const tabStyles: Record<string, React.CSSProperties> = {
    default: { padding: "10px 16px", fontSize: 13, fontWeight: 500, borderRadius: radii.md, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.muted, cursor: "pointer", transition: "all 0.15s" },
    pills: { padding: "8px 16px", fontSize: 13, fontWeight: 500, borderRadius: radii.full, background: "transparent", color: colors.muted, cursor: "pointer", transition: "all 0.15s" },
    underline: { padding: "10px 4px", fontSize: 13, fontWeight: 500, borderRadius: 0, background: "transparent", color: colors.muted, cursor: "pointer", borderBottom: "2px solid transparent", transition: "all 0.15s" },
  };
  const activeStyles: Record<string, React.CSSProperties> = {
    default: { background: colors.primary, color: "#fff", borderColor: colors.primary, boxShadow: `0 2px 8px rgba(83,58,253,0.2)` },
    pills: { background: colors.primaryLight, color: colors.primary },
    underline: { color: colors.primary, borderBottomColor: colors.primary },
  };

  return (
    <div className={cn(className)} style={baseStyles} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => !tab.disabled && onChange(tab.id)}
          disabled={tab.disabled}
          style={{
            ...tabStyles[variant],
            ...(activeTab === tab.id ? activeStyles[variant] : {}),
            opacity: tab.disabled ? 0.4 : 1,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span style={{
              padding: "2px 6px",
              fontSize: 10,
              fontWeight: 600,
              borderRadius: radii.full,
              background: activeTab === tab.id ? "rgba(255,255,255,0.2)" : colors.bgSecondary,
              color: activeTab === tab.id ? "#fff" : colors.muted,
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────
   SKELETON
   ────────────────────────────────────────────── */
interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "card" | "table-row";
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({ className, variant = "text", width, height, lines = 3, ...props }: SkeletonProps) {
  const baseStyle = {
    background: `linear-gradient(90deg, ${colors.border} 25%, ${colors.bgSecondary} 50%, ${colors.border} 75%)`,
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
    borderRadius: variant === "circular" ? radii.full : variant === "rectangular" ? radii.md : radii.sm,
  } as CSSProperties;

  if (variant === "text") {
    return (
      <div className={cn(className)} style={{ ...baseStyle, height: height || 12, width: width || "100%", maxWidth: "100%" }} {...props} />
    );
  }
  if (variant === "card") {
    return (
      <div className={cn(className)} style={{ width: "100%", ...props }}>
        <div style={{ ...baseStyle, height: 120, width: "100%", marginBottom: 16 }} />
        <div style={{ ...baseStyle, height: 16, width: "60%", marginBottom: 8 }} />
        <div style={{ ...baseStyle, height: 12, width: "40%" }} />
      </div>
    );
  }
  if (variant === "table-row") {
    return (
      <div className={cn(className)} style={{ display: "flex", gap: 16, ...props }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} style={{ ...baseStyle, height: 16, flex: 1 }} />
        ))}
      </div>
    );
  }
  return (
    <div className={cn(className)} style={{ ...baseStyle, width: width || "100%", height: height || 100 }} {...props} />
  );
}

/* ──────────────────────────────────────────────
   SPINNER
   ────────────────────────────────────────────── */
interface SpinnerProps extends HTMLAttributes<HTMLDivElement> { size?: "sm" | "md" | "lg"; color?: string; }

export function Spinner({ className, size = "md", color = colors.primary, ...props }: SpinnerProps) {
  const sizeMap = { sm: 16, md: 24, lg: 32 };
  const dim = sizeMap[size];
  return (
    <svg className={cn(className)} width={dim} height={dim} viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.8s linear infinite", ...props }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ──────────────────────────────────────────────
   DOCUMENT UPLOADER COMPONENT
   ────────────────────────────────────────────── */

interface UploadedFile { id: string; name: string; type: string; size: number; url: string; preview?: string; }
type DocType = "invoice" | "contract" | "police_report" | "bill_of_lading" | "inspection" | "driver_license" | "insurance_card" | "registration" | "photo" | "other";

interface DocumentUploaderProps {
  entityType: "documents" | "driver_documents" | "vehicle_documents";
  entityId: string; // jobId, driverId, vehicleId
  orgId: string;
  acceptedTypes?: string[];
  maxFiles?: number;
  maxSizeMB?: number;
  onUploadComplete?: (files: UploadedFile[]) => void;
  existingFiles?: UploadedFile[];
  onDelete?: (fileId: string) => Promise<void>;
}

export function DocumentUploader({ entityType, entityId, orgId, acceptedTypes, maxFiles = 10, maxSizeMB = 50, onUploadComplete, existingFiles = [], onDelete }: DocumentUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (fileList: FileList) => {
    const newFiles = Array.from(fileList);
    if (files.length + newFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);
    const uploaded: UploadedFile[] = [];

    for (const file of newFiles) {
      if (acceptedTypes && !acceptedTypes.includes(file.type)) continue;
      if (file.size > maxSizeMB * 1024 * 1024) continue;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);
      formData.append("documentType", "photo"); // default

      try {
        const res = await fetch(`/api/upload?type=${entityType}&${entityType === "driver_documents" ? "driverId" : entityType === "vehicle_documents" ? "vehicleId" : "jobId"}=${entityId}`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.ok) {
          uploaded.push({ id: data.document.id, name: file.name, type: file.type, size: file.size, url: data.fileUrl });
        }
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    setFiles((prev) => [...prev, ...uploaded]);
    onUploadComplete?.([...files, ...uploaded]);
    setUploading(false);
  }, [files, entityType, entityId, maxFiles, maxSizeMB, acceptedTypes, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragActive(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragActive(false); }, []);

  const removeFile = async (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file) return;
    if (onDelete) await onDelete(id);
    setFiles((prev) => prev.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        ref={fileInputRef as any}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? colors.primary : colors.border}`,
          borderRadius: radii.lg,
          padding: 32,
          textAlign: "center",
          background: dragActive ? colors.primaryLight : colors.bgSecondary,
          transition: `all ${transitions.fast}`,
          cursor: "pointer",
        }}
      >
        <input type="file" ref={fileInputRef} multiple accept={acceptedTypes?.join(",")} onChange={(e) => e.target.files && handleUpload(e.target.files)} style={{ display: "none" }} />
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={dragActive ? colors.primary : colors.muted} strokeWidth="1.5" style={{ marginBottom: 12 }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 500, color: colors.text }}>Drag & drop files here, or click to browse</p>
        <p style={{ margin: 0, fontSize: 12, color: colors.muted }}>Supports: PDF, Images, Word, Excel • Max {maxSizeMB}MB each • Up to {maxFiles} files</p>
        {uploading && <Spinner size="sm" style={{ marginTop: 12 }} />}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {files.map((file) => (
            <div key={file.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radii.md }}>
              <div style={{ width: 40, height: 40, borderRadius: radii.md, background: colors.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", color: colors.primary, flexShrink: 0 }}>
                {file.type.startsWith("image/") ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                ) : file.type === "application/pdf" ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 500, color: colors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: colors.muted }}>{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>} aria-label="Delete" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}