"use client";

import { useState, useEffect } from "react";

interface Ad {
  id: string;
  placement: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaLink: string;
  bgColor: string;
  textColor: string;
}

export function TopAdBanner() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user dismissed this session
    if (sessionStorage.getItem("ad_dismissed_top")) return;

    fetch("/api/ads").then(r => r.json()).then(d => {
      const topAd = (d.ads || []).find((a: Ad) => a.placement === "top_banner");
      if (topAd) setAd(topAd);
    }).catch(() => {});
  }, []);

  if (!ad || dismissed) return null;

  return (
    <div className="relative px-6 py-2.5 text-center" style={{ backgroundColor: ad.bgColor, color: ad.textColor }}>
      <div className="flex items-center justify-center gap-3 text-[13px]">
        <span className="font-medium">{ad.title}</span>
        <span className="opacity-80 hidden sm:inline">{ad.subtitle}</span>
        <a href={ad.ctaLink} className="inline-flex items-center px-3 py-1 rounded text-[12px] font-semibold bg-white/20 hover:bg-white/30 transition-colors">
          {ad.cta}
        </a>
      </div>
      <button onClick={() => { setDismissed(true); sessionStorage.setItem("ad_dismissed_top", "1"); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
        style={{ color: ad.textColor }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  );
}

export function SidebarAd() {
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    fetch("/api/ads").then(r => r.json()).then(d => {
      const sidebarAd = (d.ads || []).find((a: Ad) => a.placement === "sidebar");
      if (sidebarAd) setAd(sidebarAd);
    }).catch(() => {});
  }, []);

  if (!ad) return null;

  return (
    <a href={ad.ctaLink} className="block border border-[#e5edf5] rounded-lg overflow-hidden hover:border-[#b9b9f9] transition-colors">
      <div className="p-4" style={{ backgroundColor: ad.bgColor, color: ad.textColor }}>
        <div className="text-[13px] font-semibold mb-0.5">{ad.title}</div>
        <div className="text-[11px] opacity-80 mb-2">{ad.subtitle}</div>
        <span className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-medium bg-white/20 hover:bg-white/30 transition-colors">
          {ad.cta}
        </span>
      </div>
      <div className="px-3 py-1.5 bg-[#f6f9fc] text-[9px] text-[#94a3b8] text-center uppercase tracking-wider">Sponsored</div>
    </a>
  );
}
