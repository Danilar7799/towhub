'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/* ── Design tokens ───────────────────────────────────────────────── */
const PRIMARY = '#533afd';
const TEXT = '#061b31';
const MUTED = '#64748d';
const BORDER = '#e5edf5';
const BG = '#f8fafc';
const WHITE = '#ffffff';
const SUCCESS = '#10b981';
const WARNING = '#f59e0b';
const DANGER = '#ef4444';

/* ── Types ───────────────────────────────────────────────────────── */
type ConditionStatus = 'good' | 'damaged' | 'missing' | '';

interface ChecklistItem {
  id: string;
  label: string;
  status: ConditionStatus;
  photoPlaceholder: boolean;
}

interface Inspection {
  id: string;
  jobId: string;
  vehicle: string;
  date: string;
  status: 'draft' | 'completed';
  exterior: ChecklistItem[];
  interior: ChecklistItem[];
  damageNotes: string;
  odometer: string;
  fuelLevel: number;
  hasSignature: boolean;
}

/* ── Helpers ─────────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string) => {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const EXTERIOR_SECTIONS = [
  { id: 'front', label: 'Front' },
  { id: 'rear', label: 'Rear' },
  { id: 'left', label: 'Left Side' },
  { id: 'right', label: 'Right Side' },
  { id: 'roof', label: 'Roof' },
  { id: 'hood', label: 'Hood' },
  { id: 'trunk', label: 'Trunk' },
] as const;

const INTERIOR_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'seats', label: 'Seats' },
  { id: 'steering', label: 'Steering' },
  { id: 'console', label: 'Console' },
] as const;

const FUEL_LABELS = ['Empty', '¼', '½', '¾', 'Full'];

/* ── Seed data ───────────────────────────────────────────────────── */
const seedInspections: Inspection[] = [
  {
    id: uid(),
    jobId: 'JOB-1042',
    vehicle: '2021 Honda Civic — Silver',
    date: '2026-07-18',
    status: 'completed',
    exterior: EXTERIOR_SECTIONS.map((s) => ({ id: s.id, label: s.label, status: 'good', photoPlaceholder: true })),
    interior: INTERIOR_SECTIONS.map((s) => ({ id: s.id, label: s.label, status: 'good', photoPlaceholder: true })),
    damageNotes: '',
    odometer: '34,210',
    fuelLevel: 3,
    hasSignature: true,
  },
  {
    id: uid(),
    jobId: 'JOB-1039',
    vehicle: '2019 Ford F-150 — Black',
    date: '2026-07-17',
    status: 'draft',
    exterior: EXTERIOR_SECTIONS.map((s) => ({ id: s.id, label: s.label, status: s.id === 'rear' ? 'damaged' : 'good', photoPlaceholder: true })),
    interior: INTERIOR_SECTIONS.map((s) => ({ id: s.id, label: s.label, status: 'good', photoPlaceholder: true })),
    damageNotes: 'Rear bumper has existing dent, approx 4 inches.',
    odometer: '78,450',
    fuelLevel: 1,
    hasSignature: false,
  },
  {
    id: uid(),
    jobId: 'JOB-1035',
    vehicle: '2023 Toyota Camry — White',
    date: '2026-07-15',
    status: 'completed',
    exterior: EXTERIOR_SECTIONS.map((s) => ({ id: s.id, label: s.label, status: 'good', photoPlaceholder: true })),
    interior: INTERIOR_SECTIONS.map((s) => ({ id: s.id, label: s.label, status: 'good', photoPlaceholder: true })),
    damageNotes: '',
    odometer: '12,800',
    fuelLevel: 4,
    hasSignature: true,
  },
  {
    id: uid(),
    jobId: 'JOB-1031',
    vehicle: '2018 Chevy Malibu — Red',
    date: '2026-07-12',
    status: 'completed',
    exterior: EXTERIOR_SECTIONS.map((s) => ({ id: s.id, label: s.label, status: s.id === 'left' ? 'damaged' : 'good', photoPlaceholder: true })),
    interior: INTERIOR_SECTIONS.map((s) => ({ id: s.id, label: s.label, status: 'good', photoPlaceholder: true })),
    damageNotes: 'Scratch on left rear quarter panel.',
    odometer: '61,300',
    fuelLevel: 2,
    hasSignature: true,
  },
];

/* ── Main component ──────────────────────────────────────────────── */
export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>(seedInspections);
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'completed'>('all');

  /* New inspection form state */
  const [jobId, setJobId] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [exterior, setExterior] = useState<ChecklistItem[]>(
    EXTERIOR_SECTIONS.map((s) => ({ id: s.id, label: s.label, status: '', photoPlaceholder: true }))
  );
  const [interior, setInterior] = useState<ChecklistItem[]>(
    INTERIOR_SECTIONS.map((s) => ({ id: s.id, label: s.label, status: '', photoPlaceholder: true }))
  );
  const [damageNotes, setDamageNotes] = useState('');
  const [odometer, setOdometer] = useState('');
  const [fuelLevel, setFuelLevel] = useState(2);
  const signatureRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  /* Stats */
  const totalInspections = inspections.length;
  const pendingCount = inspections.filter((i) => i.status === 'draft').length;
  const completedThisMonth = inspections.filter((i) => {
    const d = new Date(i.date);
    const now = new Date();
    return i.status === 'completed' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  /* Filtered list */
  const filteredInspections = filterStatus === 'all' ? inspections : inspections.filter((i) => i.status === filterStatus);

  /* ── Canvas signature ──────────────────────────────────────────── */
  const canvasSetup = useCallback(() => {
    const canvas = signatureRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = TEXT;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    if (view === 'new') {
      // small delay so canvas is mounted
      const t = setTimeout(canvasSetup, 50);
      return () => clearTimeout(t);
    }
  }, [view, canvasSetup]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = signatureRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = signatureRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = signatureRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = signatureRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  /* ── Checklist update ──────────────────────────────────────────── */
  const updateChecklist = (
    type: 'exterior' | 'interior',
    id: string,
    status: ConditionStatus
  ) => {
    const setter = type === 'exterior' ? setExterior : setInterior;
    setter((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  /* ── Submit ────────────────────────────────────────────────────── */
  const handleSubmit = (asDraft: boolean) => {
    const inspection: Inspection = {
      id: uid(),
      jobId: jobId || `JOB-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicle: vehicle || 'Unknown Vehicle',
      date: today(),
      status: asDraft ? 'draft' : 'completed',
      exterior: [...exterior],
      interior: [...interior],
      damageNotes,
      odometer,
      fuelLevel,
      hasSignature,
    };
    setInspections((prev) => [inspection, ...prev]);
    resetForm();
    setView('list');
  };

  const resetForm = () => {
    setJobId('');
    setVehicle('');
    setExterior(EXTERIOR_SECTIONS.map((s) => ({ id: s.id, label: s.label, status: '', photoPlaceholder: true })));
    setInterior(INTERIOR_SECTIONS.map((s) => ({ id: s.id, label: s.label, status: '', photoPlaceholder: true })));
    setDamageNotes('');
    setOdometer('');
    setFuelLevel(2);
    setHasSignature(false);
  };

  const handlePrint = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setView('detail');
    setTimeout(() => window.print(), 300);
  };

  /* ── Status badge ──────────────────────────────────────────────── */
  const StatusBadge = ({ status }: { status: 'draft' | 'completed' }) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        background: status === 'completed' ? '#ecfdf5' : '#fef9c3',
        color: status === 'completed' ? '#065f46' : '#92400e',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: status === 'completed' ? SUCCESS : WARNING,
        }}
      />
      {status === 'completed' ? 'Completed' : 'Draft'}
    </span>
  );

  /* ── Condition selector ────────────────────────────────────────── */
  const ConditionSelector = ({
    type,
    item,
  }: {
    type: 'exterior' | 'interior';
    item: ChecklistItem;
  }) => {
    const options: { value: ConditionStatus; label: string; color: string }[] = [
      { value: 'good', label: 'Good', color: SUCCESS },
      { value: 'damaged', label: 'Damaged', color: DANGER },
      { value: 'missing', label: 'Missing', color: WARNING },
    ];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 500, color: TEXT, minWidth: 100, fontSize: 14 }}>{item.label}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateChecklist(type, item.id, opt.value)}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: `1.5px solid ${item.status === opt.value ? opt.color : BORDER}`,
                background: item.status === opt.value ? opt.color + '18' : WHITE,
                color: item.status === opt.value ? opt.color : MUTED,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {/* Photo upload placeholder */}
        <div
          style={{
            marginLeft: 'auto',
            width: 36,
            height: 36,
            borderRadius: 8,
            border: `1.5px dashed ${BORDER}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          title="Upload photo"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════════════════
     RENDER — LIST VIEW
     ══════════════════════════════════════════════════════════════════ */
  if (view === 'list') {
    return (
      <div style={{ minHeight: '100vh', background: BG, padding: '32px 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: TEXT, margin: 0 }}>Vehicle Inspections</h1>
              <p style={{ color: MUTED, fontSize: 14, margin: '4px 0 0' }}>Digital condition reports — protect against damage claims</p>
            </div>
            <button
              onClick={() => { resetForm(); setView('new'); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 8,
                background: PRIMARY,
                color: WHITE,
                fontWeight: 600,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(83,58,253,0.3)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New Inspection
            </button>
          </div>

          {/* Stats cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Total Inspections', value: totalInspections, icon: '📋', color: PRIMARY },
              { label: 'Pending Drafts', value: pendingCount, icon: '⏳', color: WARNING },
              { label: 'Completed This Month', value: completedThisMonth, icon: '✅', color: SUCCESS },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: WHITE,
                  borderRadius: 12,
                  border: `1px solid ${BORDER}`,
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: stat.color + '12',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                  }}
                >
                  {stat.icon}
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: TEXT }}>{stat.value}</div>
                  <div style={{ fontSize: 13, color: MUTED }}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
            {(['all', 'draft', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: filterStatus === tab ? PRIMARY : 'transparent',
                  color: filterStatus === tab ? WHITE : MUTED,
                }}
              >
                {tab === 'all' ? 'All' : tab === 'draft' ? 'Drafts' : 'Completed'}
              </button>
            ))}
          </div>

          {/* Inspection list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredInspections.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: MUTED, fontSize: 14 }}>No inspections found.</div>
            )}
            {filteredInspections.map((insp) => (
              <div
                key={insp.id}
                style={{
                  background: WHITE,
                  borderRadius: 12,
                  border: `1px solid ${BORDER}`,
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  transition: 'box-shadow 0.15s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 200 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: PRIMARY + '10',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: TEXT, fontSize: 15 }}>{insp.vehicle}</div>
                    <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
                      {insp.jobId} &middot; {fmtDate(insp.date)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <StatusBadge status={insp.status} />
                  {insp.status === 'completed' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePrint(insp); }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        border: `1px solid ${BORDER}`,
                        background: WHITE,
                        color: TEXT,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      Print
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     RENDER — NEW INSPECTION
     ══════════════════════════════════════════════════════════════════ */
  if (view === 'new') {
    return (
      <div style={{ minHeight: '100vh', background: BG, padding: '32px 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Back + title */}
          <button
            onClick={() => setView('list')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: MUTED,
              fontSize: 13,
              fontWeight: 500,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginBottom: 20,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            Back to Inspections
          </button>

          <h1 style={{ fontSize: 24, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>New Vehicle Inspection</h1>
          <p style={{ color: MUTED, fontSize: 14, margin: '0 0 28px' }}>Complete the condition report before and/or after tow</p>

          {/* Job & Vehicle info */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Job Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Job ID</label>
                <input
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  placeholder="e.g. JOB-1043"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Vehicle</label>
                <input
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  placeholder="e.g. 2022 Honda Accord — Blue"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Exterior checklist */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              Exterior Condition
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {exterior.map((item) => (
                <ConditionSelector key={item.id} type="exterior" item={item} />
              ))}
            </div>
          </div>

          {/* Interior checklist */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
              Interior Condition
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {interior.map((item) => (
                <ConditionSelector key={item.id} type="interior" item={item} />
              ))}
            </div>
          </div>

          {/* Photo upload section */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
              </svg>
              Photo Documentation
            </h2>
            <p style={{ color: MUTED, fontSize: 13, margin: '0 0 16px' }}>Upload photos for each vehicle section (6 exterior + 4 interior)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {[...EXTERIOR_SECTIONS, ...INTERIOR_SECTIONS].map((section) => (
                <div
                  key={section.id}
                  style={{
                    border: `1.5px dashed ${BORDER}`,
                    borderRadius: 10,
                    padding: '20px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = PRIMARY; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 500, color: MUTED, textAlign: 'center' }}>{section.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Damage notes */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Pre-Existing Damage Notes</h2>
            <textarea
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              placeholder="Describe any pre-existing damage, scratches, dents, or issues..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }}
            />
          </div>

          {/* Odometer & Fuel */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Vehicle Readings</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <label style={labelStyle}>Odometer Reading</label>
                <input
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  placeholder="e.g. 34,210"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Fuel Level</label>
                <div style={{ marginTop: 8 }}>
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={1}
                    value={fuelLevel}
                    onChange={(e) => setFuelLevel(Number(e.target.value))}
                    style={{ width: '100%', accentColor: PRIMARY }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    {FUEL_LABELS.map((lbl, i) => (
                      <span key={lbl} style={{ fontSize: 11, color: i <= fuelLevel ? PRIMARY : MUTED, fontWeight: i === fuelLevel ? 700 : 400 }}>
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer signature */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              Customer Signature
            </h2>
            <div
              style={{
                border: `1.5px solid ${BORDER}`,
                borderRadius: 10,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <canvas
                ref={signatureRef}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
                style={{
                  width: '100%',
                  height: 140,
                  cursor: 'crosshair',
                  display: 'block',
                  touchAction: 'none',
                }}
              />
              {!hasSignature && (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: MUTED,
                    fontSize: 13,
                    pointerEvents: 'none',
                  }}
                >
                  Sign here
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={clearSignature}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  border: `1px solid ${BORDER}`,
                  background: WHITE,
                  color: MUTED,
                  cursor: 'pointer',
                }}
              >
                Clear Signature
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8, marginBottom: 48 }}>
            <button
              onClick={() => handleSubmit(true)}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                border: `1.5px solid ${BORDER}`,
                background: WHITE,
                color: TEXT,
                cursor: 'pointer',
              }}
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSubmit(false)}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                background: PRIMARY,
                color: WHITE,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(83,58,253,0.3)',
              }}
            >
              Submit Inspection
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     RENDER — DETAIL / PRINT VIEW
     ══════════════════════════════════════════════════════════════════ */
  if (view === 'detail' && selectedInspection) {
    const insp = selectedInspection;
    return (
      <div style={{ minHeight: '100vh', background: BG, padding: '32px 24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Print-only header */}
          <div style={{ display: 'none' }} className="print-header">
            <h1>Vehicle Inspection Report — TowHub</h1>
          </div>

          {/* Back */}
          <button
            onClick={() => setView('list')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: MUTED,
              fontSize: 13,
              fontWeight: 500,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginBottom: 20,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            Back to Inspections
          </button>

          {/* Report header */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0 }}>Inspection Report</h1>
                <p style={{ color: MUTED, fontSize: 14, margin: '4px 0 0' }}>{insp.jobId} &middot; {fmtDate(insp.date)}</p>
              </div>
              <StatusBadge status={insp.status} />
            </div>
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>Vehicle</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{insp.vehicle}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>Odometer</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{insp.odometer || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>Fuel Level</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{FUEL_LABELS[insp.fuelLevel]}</div>
              </div>
            </div>
          </div>

          {/* Exterior summary */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Exterior Condition</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {insp.exterior.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: item.status === 'good' ? SUCCESS : item.status === 'damaged' ? DANGER : WARNING,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 12, color: MUTED, marginLeft: 'auto', textTransform: 'capitalize' }}>{item.status || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interior summary */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Interior Condition</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {insp.interior.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: item.status === 'good' ? SUCCESS : item.status === 'damaged' ? DANGER : WARNING,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 12, color: MUTED, marginLeft: 'auto', textTransform: 'capitalize' }}>{item.status || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Damage notes */}
          {insp.damageNotes && (
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Damage Notes</h2>
              <p style={{ fontSize: 14, color: TEXT, margin: 0, lineHeight: 1.6 }}>{insp.damageNotes}</p>
            </div>
          )}

          {/* Signature */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Customer Signature</h2>
            <div
              style={{
                height: 80,
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fafbfc',
              }}
            >
              {insp.hasSignature ? (
                <span style={{ fontSize: 18, fontFamily: 'cursive', color: TEXT }}>— Signature Captured —</span>
              ) : (
                <span style={{ fontSize: 13, color: MUTED }}>No signature captured</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8, marginBottom: 48 }}>
            <button
              onClick={() => window.print()}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                background: PRIMARY,
                color: WHITE,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 1px 3px rgba(83,58,253,0.3)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print / PDF
            </button>
          </div>
        </div>

        {/* Print styles */}
        <style>{`
          @media print {
            body { background: white !important; }
            button { display: none !important; }
            .print-header { display: block !important; text-align: center; margin-bottom: 24px; }
          }
        `}</style>
      </div>
    );
  }

  return null;
}

/* ── Shared styles ───────────────────────────────────────────────── */
const cardStyle: React.CSSProperties = {
  background: WHITE,
  borderRadius: 12,
  border: `1px solid ${BORDER}`,
  padding: '24px',
  marginBottom: 20,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: TEXT,
  margin: '0 0 16px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: TEXT,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: `1.5px solid ${BORDER}`,
  fontSize: 14,
  color: TEXT,
  background: WHITE,
  outline: 'none',
  boxSizing: 'border-box',
};
