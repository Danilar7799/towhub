"use client";

export function SkeletonCard() {
  return (
    <div className="bg-white border border-[#e5edf5] rounded-lg p-5 animate-pulse">
      <div className="h-3 bg-[#f6f9fc] rounded w-1/3 mb-3" />
      <div className="h-7 bg-[#f6f9fc] rounded w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
      <div className="bg-[#f6f9fc] px-5 py-2.5 border-b border-[#e5edf5]">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-3 bg-[#e5edf5] rounded animate-pulse" style={{ width: `${100 / cols}%` }} />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="px-5 py-3.5 border-b border-[#e5edf5] last:border-0">
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-3 bg-[#f6f9fc] rounded animate-pulse" style={{ width: `${100 / cols}%` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#f6f9fc] rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-[#f6f9fc] rounded w-1/3" />
              <div className="h-2.5 bg-[#f6f9fc] rounded w-2/3" />
            </div>
            <div className="h-5 bg-[#f6f9fc] rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-5 animate-pulse">
          <div className="h-4 bg-[#f6f9fc] rounded w-1/4 mb-3" />
          <div className="h-5 bg-[#f6f9fc] rounded w-2/3 mb-2" />
          <div className="h-3 bg-[#f6f9fc] rounded w-full mb-1" />
          <div className="h-3 bg-[#f6f9fc] rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 bg-[#f6f9fc] rounded w-40 animate-pulse" />
          <div className="h-3 bg-[#f6f9fc] rounded w-60 animate-pulse" />
        </div>
        <div className="h-9 bg-[#f6f9fc] rounded w-32 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <SkeletonTable />
    </div>
  );
}
