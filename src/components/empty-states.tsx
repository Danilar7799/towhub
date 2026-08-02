"use client";

/*
 * Empty State & Skeleton Components
 * Stripe-style: clear messaging, CTA, professional loading states
 */

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  secondaryAction?: { label: string; href: string };
}

export function EmptyState({ icon = "📋", title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="text-[40px] mb-4 opacity-20">{icon}</div>
      <h3 className="text-[15px] font-semibold text-[#061b31] mb-1">{title}</h3>
      {description && <p className="text-[13px] text-[#64748d] max-w-[320px] mb-4">{description}</p>}
      <div className="flex items-center gap-2">
        {action && (
          action.href ? (
            <a href={action.href} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors">
              {action.label}
            </a>
          ) : (
            <button onClick={action.onClick} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors">
              {action.label}
            </button>
          )
        )}
        {secondaryAction && (
          <a href={secondaryAction.href} className="px-4 py-2 border border-[#e5edf5] rounded text-[13px] font-medium text-[#64748d] hover:border-[#b9b9f9] hover:text-[#533afd] transition-colors">
            {secondaryAction.label}
          </a>
        )}
      </div>
    </div>
  );
}

// Skeleton components for loading states
export function SkeletonCard() {
  return (
    <div className="bg-white border border-[#e5edf5] rounded-lg p-4 space-y-3">
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-3 w-1/2" />
      <div className="skeleton h-3 w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#e5edf5] bg-[#f6f9fc]">
        <div className="skeleton h-4 w-1/4" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-[#e5edf5] last:border-0 flex items-center gap-4">
          <div className="skeleton h-3 w-1/4" />
          <div className="skeleton h-3 w-1/3 flex-1" />
          <div className="skeleton h-3 w-1/6" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="bg-white border border-[#e5edf5] rounded-lg p-4">
      <div className="skeleton h-3 w-1/3 mb-2" />
      <div className="skeleton h-8 w-1/2" />
    </div>
  );
}

export function SkeletonList({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white border border-[#e5edf5] rounded-lg">
          <div className="skeleton w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-2.5 w-1/2" />
          </div>
          <div className="skeleton h-6 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}