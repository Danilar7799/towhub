import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f9fc]" style={{ fontFamily: "'Source Sans 3', system-ui, sans-serif" }}>
      <div className="text-center">
        <div className="text-[64px] font-light text-[#e5edf5] tracking-[-2px] mb-4">404</div>
        <h1 className="text-[20px] font-semibold text-[#061b31] mb-2">Page not found</h1>
        <p className="text-[15px] text-[#64748d] mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="bg-[#533afd] text-white px-6 py-2.5 rounded text-[14px] font-medium hover:bg-[#4434d4] transition-colors shadow-[0_4px_16px_rgba(83,58,253,0.3)]">
          Go home
        </Link>
      </div>
    </div>
  );
}
