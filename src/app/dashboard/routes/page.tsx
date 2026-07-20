'use client';

import { useState, useCallback, useRef } from 'react';

// --- Design Tokens ---
const t = {
  primary: '#533afd',
  primaryLight: '#ede8ff',
  text: '#061b31',
  muted: '#64748d',
  border: '#e5edf5',
  bg: '#fafbfd',
  white: '#ffffff',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#ef4444',
};

// --- Types ---
interface Stop {
  id: string;
  address: string;
  customerName: string;
  jobType: 'pickup' | 'delivery';
  timeWindow: string;
  lat: number;
  lng: number;
}

interface RouteStats {
  totalMiles: number;
  totalTimeMin: number;
  fuelCost: number;
}

interface SavedRoute {
  id: string;
  name: string;
  stops: Stop[];
  driver: string;
  createdAt: string;
  stats: RouteStats;
}

// --- Helpers ---
const uid = () => Math.random().toString(36).slice(2, 10);

const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

const calcRouteStats = (stops: Stop[]): RouteStats => {
  let totalMiles = 0;
  for (let i = 1; i < stops.length; i++) {
    totalMiles += haversine(stops[i - 1], stops[i]);
  }
  totalMiles = Math.round(totalMiles * 10) / 10;
  const totalTimeMin = Math.round(totalMiles * 2.5 + stops.length * 10);
  const fuelCost = Math.round(((totalMiles / 8) * 3.5) * 100) / 100;
  return { totalMiles, totalTimeMin, fuelCost };
};

const nearestNeighbor = (stops: Stop[]): Stop[] => {
  if (stops.length <= 2) return stops;
  const remaining = stops.slice(1);
  const ordered: Stop[] = [stops[0]];
  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((s, i) => {
      const d = haversine(last, s);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered;
};

const formatTime = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// --- Mock Data ---
const MOCK_DRIVERS = ['Mike Johnson', 'Sarah Chen', 'David Park', 'Lisa Rodriguez', 'James Wilson'];

const SAMPLE_STOPS: Stop[] = [
  { id: uid(), address: '1200 Main St, Springfield', customerName: 'John Doe', jobType: 'pickup', timeWindow: '8:00 AM – 10:00 AM', lat: 39.7817, lng: -89.6501 },
  { id: uid(), address: '450 Oak Ave, Springfield', customerName: 'Jane Smith', jobType: 'delivery', timeWindow: '9:00 AM – 11:00 AM', lat: 39.7903, lng: -89.6437 },
  { id: uid(), address: '789 Elm Blvd, Chatham', customerName: 'Bob Wilson', jobType: 'pickup', timeWindow: '10:00 AM – 12:00 PM', lat: 39.6856, lng: -89.7043 },
  { id: uid(), address: '321 Pine Rd, Rochester', customerName: 'Alice Brown', jobType: 'delivery', timeWindow: '11:00 AM – 1:00 PM', lat: 39.7495, lng: -89.5315 },
];

// --- Sub-components ---

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 12, padding: '20px 24px', flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 13, color: t.muted, fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || t.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function StopCard({
  stop, index, total, onRemove, dragHandlers,
}: {
  stop: Stop; index: number; total: number;
  onRemove: () => void;
  dragHandlers: { draggable: boolean; onDragStart: (e: React.DragEvent) => void; onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void; onDragEnd: () => void };
}) {
  const isPickup = stop.jobType === 'pickup';
  return (
    <div
      {...dragHandlers}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 16, background: t.white,
        border: `1px solid ${t.border}`, borderRadius: 12, padding: 16,
        cursor: 'grab', transition: 'box-shadow .15s',
        borderLeft: `4px solid ${isPickup ? t.primary : t.success}`,
      }}
    >
      {/* Step number */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%', background: isPickup ? t.primaryLight : '#dcfce7',
        color: isPickup ? t.primary : t.success, fontWeight: 700, fontSize: 15,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {index + 1}
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
            background: isPickup ? t.primaryLight : '#dcfce7', color: isPickup ? t.primary : t.success,
            padding: '2px 8px', borderRadius: 4,
          }}>
            {stop.jobType}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{stop.customerName}</span>
        </div>
        <div style={{ fontSize: 14, color: t.text, marginBottom: 2 }}>{stop.address}</div>
        <div style={{ fontSize: 12, color: t.muted }}>⏱ {stop.timeWindow}</div>
      </div>
      {/* Connector line */}
      {index < total - 1 && (
        <div style={{
          position: 'absolute', left: 35, bottom: -18, width: 2, height: 16,
          background: t.border, zIndex: 0,
        }} />
      )}
      {/* Remove */}
      <button onClick={onRemove} style={{
        background: 'none', border: 'none', color: t.muted, cursor: 'pointer', fontSize: 18,
        padding: '0 4px', lineHeight: 1, alignSelf: 'flex-start',
      }} title="Remove stop">×</button>
    </div>
  );
}

// --- Main Page ---
export default function RouteOptimizationPage() {
  const [stops, setStops] = useState<Stop[]>(SAMPLE_STOPS);
  const [driver, setDriver] = useState('');
  const [routeName, setRouteName] = useState('');
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newStop, setNewStop] = useState({ address: '', customerName: '', jobType: 'pickup' as 'pickup' | 'delivery', timeWindow: '' });
  const [toast, setToast] = useState('');

  // Stats
  const optimized = stops.length >= 2 ? calcRouteStats(stops) : null;
  const optimizedOrder = stops.length >= 2 ? nearestNeighbor(stops) : stops;
  const optimizedStats = stops.length >= 2 ? calcRouteStats(optimizedOrder) : null;

  const milesSaved = optimized && optimizedStats ? Math.round((optimized.totalMiles - optimizedStats.totalMiles) * 10) / 10 : 0;
  const timeSaved = optimized && optimizedStats ? optimized.totalTimeMin - optimizedStats.totalTimeMin : 0;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  // Drag & drop reorder
  const onDragStart = (i: number) => (e: React.DragEvent) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; };
  const onDragOver = (i: number) => (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const onDrop = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    setStops(prev => { const next = [...prev]; const [item] = next.splice(dragIdx, 1); next.splice(i, 0, item); return next; });
    setDragIdx(null);
  };

  const addStop = () => {
    if (!newStop.address || !newStop.customerName) return;
    setStops(prev => [...prev, {
      id: uid(), ...newStop,
      lat: 39.7 + Math.random() * 0.1, lng: -89.6 + Math.random() * 0.1,
    }]);
    setNewStop({ address: '', customerName: '', jobType: 'pickup', timeWindow: '' });
    setShowAdd(false);
    showToast('Stop added');
  };

  const removeStop = (id: string) => setStops(prev => prev.filter(s => s.id !== id));

  const optimizeRoute = () => {
    if (stops.length < 2) return;
    const ordered = nearestNeighbor(stops);
    setStops(ordered);
    showToast('Route optimized!');
  };

  const saveRoute = () => {
    if (!routeName || stops.length < 2) return;
    const stats = calcRouteStats(stops);
    setSavedRoutes(prev => [...prev, { id: uid(), name: routeName, stops: [...stops], driver, createdAt: new Date().toLocaleDateString(), stats }]);
    showToast('Route saved!');
  };

  const loadRoute = (r: SavedRoute) => {
    setStops([...r.stops]);
    setDriver(r.driver);
    setRouteName(r.name);
    showToast(`Loaded "${r.name}"`);
  };

  // Stats for current order vs unoptimized (random)
  const currentStats = stops.length >= 2 ? calcRouteStats(stops) : null;

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: t.text }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999, background: t.text, color: '#fff',
          padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,.15)',
          animation: 'fadeIn .2s',
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ background: t.white, borderBottom: `1px solid ${t.border}`, padding: '24px 32px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: t.text }}>Route Optimization</h1>
        <p style={{ fontSize: 14, color: t.muted, margin: '4px 0 0' }}>Plan efficient multi-stop routes for your drivers</p>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px' }}>
        {/* Summary Cards */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard label="Total Distance" value={currentStats ? `${currentStats.totalMiles} mi` : '—'} sub={currentStats ? `${stops.length} stops` : undefined} />
          <StatCard label="Est. Time" value={currentStats ? formatTime(currentStats.totalTimeMin) : '—'} sub="incl. service time" />
          <StatCard label="Fuel Cost" value={currentStats ? `$${currentStats.fuelCost.toFixed(2)}` : '—'} sub="$3.50/gal · 8 mpg" />
          <StatCard label="Savings" value={milesSaved > 0 ? `${milesSaved} mi` : '—'} sub={timeSaved > 0 ? `~${formatTime(timeSaved)} saved` : 'Optimize to see savings'} color={milesSaved > 0 ? t.success : t.muted} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
          {/* Left: Stops */}
          <div>
            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <button onClick={() => setShowAdd(true)} style={btnStyle(t.primary, '#fff')}>+ Add Stop</button>
              <button onClick={optimizeRoute} style={btnStyle(t.success, '#fff')} disabled={stops.length < 2}>⚡ Optimize Route</button>
              <input
                placeholder="Route name…"
                value={routeName}
                onChange={e => setRouteName(e.target.value)}
                style={{ ...inputStyle, width: 180 }}
              />
              <select value={driver} onChange={e => setDriver(e.target.value)} style={{ ...inputStyle, width: 180 }}>
                <option value="">Assign driver…</option>
                {MOCK_DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button onClick={saveRoute} style={btnStyle(t.text, '#fff')} disabled={!routeName || stops.length < 2}>💾 Save Route</button>
            </div>

            {/* Add Stop Form */}
            {showAdd && (
              <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <input placeholder="Customer name" value={newStop.customerName} onChange={e => setNewStop(s => ({ ...s, customerName: e.target.value }))} style={inputStyle} />
                  <select value={newStop.jobType} onChange={e => setNewStop(s => ({ ...s, jobType: e.target.value as 'pickup' | 'delivery' }))} style={inputStyle}>
                    <option value="pickup">Pickup</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </div>
                <input placeholder="Address" value={newStop.address} onChange={e => setNewStop(s => ({ ...s, address: e.target.value }))} style={{ ...inputStyle, width: '100%', marginBottom: 12 }} />
                <input placeholder="Time window (e.g. 9:00 AM – 11:00 AM)" value={newStop.timeWindow} onChange={e => setNewStop(s => ({ ...s, timeWindow: e.target.value }))} style={{ ...inputStyle, width: '100%', marginBottom: 12 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={addStop} style={btnStyle(t.primary, '#fff')} disabled={!newStop.address || !newStop.customerName}>Add</button>
                  <button onClick={() => setShowAdd(false)} style={btnStyle('#e2e8f0', t.text)}>Cancel</button>
                </div>
              </div>
            )}

            {/* Stops List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stops.length === 0 && (
                <div style={{ textAlign: 'center', padding: 48, color: t.muted, background: t.white, borderRadius: 12, border: `1px solid ${t.border}` }}>
                  No stops yet. Click <b>+ Add Stop</b> to begin planning a route.
                </div>
              )}
              {stops.map((stop, i) => (
                <div key={stop.id} style={{ position: 'relative' }}>
                  <StopCard
                    stop={stop} index={i} total={stops.length}
                    onRemove={() => removeStop(stop.id)}
                    dragHandlers={{ draggable: true, onDragStart: onDragStart(i), onDragOver: onDragOver(i), onDrop: onDrop(i), onDragEnd: () => setDragIdx(null) }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Text-based route display */}
            <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: t.text }}>Route Map</h3>
              {stops.length === 0 ? (
                <div style={{ color: t.muted, fontSize: 13 }}>Add stops to see route</div>
              ) : (
                <div style={{ fontSize: 13, lineHeight: 2 }}>
                  {stops.map((s, i) => (
                    <div key={s.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          background: i === 0 ? t.primary : i === stops.length - 1 ? t.success : t.primaryLight,
                          color: i === 0 || i === stops.length - 1 ? '#fff' : t.primary,
                        }}>{i + 1}</span>
                        <span style={{ fontWeight: 500 }}>{s.address}</span>
                      </div>
                      {i < stops.length - 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 10 }}>
                          <span style={{ color: t.muted, fontSize: 12 }}>│ {(() => { const d = haversine(s, stops[i+1]); return `${Math.round(d*10)/10} mi · ~${Math.round(d*2.5)}min`; })()}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Route Summary */}
            {currentStats && (
              <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: t.text }}>Route Summary</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <SummaryRow label="Total Distance" value={`${currentStats.totalMiles} miles`} />
                  <SummaryRow label="Estimated Time" value={formatTime(currentStats.totalTimeMin)} />
                  <SummaryRow label="Fuel Cost" value={`$${currentStats.fuelCost.toFixed(2)}`} sub="($3.50/gal, 8 mpg)" />
                  <SummaryRow label="Stops" value={`${stops.length}`} />
                  {driver && <SummaryRow label="Driver" value={driver} />}
                </div>
                {milesSaved > 0 && (
                  <div style={{ marginTop: 16, padding: '12px 16px', background: '#dcfce7', borderRadius: 8, fontSize: 13, color: t.success, fontWeight: 500 }}>
                    ✅ Optimized route saves {milesSaved} mi & ~{formatTime(timeSaved)} vs. unoptimized
                  </div>
                )}
              </div>
            )}

            {/* Saved Routes */}
            {savedRoutes.length > 0 && (
              <div style={{ background: t.white, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 16px', color: t.text }}>Saved Routes</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {savedRoutes.map(r => (
                    <button key={r.id} onClick={() => loadRoute(r)} style={{
                      textAlign: 'left', background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8,
                      padding: '10px 14px', cursor: 'pointer', transition: 'border-color .15s',
                    }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: t.text }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: t.muted }}>{r.stops.length} stops · {r.stats.totalMiles} mi · {r.driver || 'Unassigned'}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: t.muted }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{value}</span>
        {sub && <div style={{ fontSize: 11, color: t.muted }}>{sub}</div>}
      </div>
    </div>
  );
}

const btnStyle = (bg: string, color: string): React.CSSProperties => ({
  background: bg, color, border: 'none', borderRadius: 8, padding: '10px 18px',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
});

const inputStyle: React.CSSProperties = {
  border: `1px solid ${t.border}`, borderRadius: 8, padding: '10px 14px',
  fontSize: 13, outline: 'none', color: t.text, background: t.white,
};
