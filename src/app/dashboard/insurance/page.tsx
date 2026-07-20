'use client';

import { useState, useMemo } from 'react';

type InsuranceCompany = 'GEICO' | 'Progressive' | 'State Farm' | 'Allstate' | 'USAA' | 'Other';
type RequestType = 'accident' | 'breakdown' | 'lockout' | 'flat_tire' | 'jump_start';
type Status = 'pending' | 'accepted' | 'dispatched' | 'en_route' | 'on_scene' | 'completed';

interface InsuranceRequest {
  id: string;
  claimNumber: string;
  insuranceCompany: InsuranceCompany;
  policyHolder: string;
  policyNumber: string;
  phone: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleColor: string;
  vehiclePlate: string;
  type: RequestType;
  status: Status;
  location: string;
  locationDetails: string;
  payout: number;
  createdAt: string;
  estimatedArrival?: string;
  notes?: string;
}

const MOCK_DATA: InsuranceRequest[] = [
  { id: 'INS-1001', claimNumber: 'GCC-2026-48921', insuranceCompany: 'GEICO', policyHolder: 'Margaret Chen', policyNumber: 'GC-4491827', phone: '(555) 234-8891', vehicleMake: 'Toyota', vehicleModel: 'Camry', vehicleYear: 2022, vehicleColor: 'Silver', vehiclePlate: 'TX-7K9M21', type: 'accident', status: 'pending', location: 'I-35 & Riverside Dr, Austin, TX', locationDetails: 'Right shoulder, rear-end collision. Vehicle drivable but bumper dragging.', payout: 185, createdAt: '2026-07-19 08:14 AM' },
  { id: 'INS-1002', claimNumber: 'PGH-2026-77312', insuranceCompany: 'Progressive', policyHolder: 'David Okafor', policyNumber: 'PG-8831004', phone: '(555) 671-3302', vehicleMake: 'Honda', vehicleModel: 'Civic', vehicleYear: 2024, vehicleColor: 'Blue', vehiclePlate: 'TX-3R2P88', type: 'flat_tire', status: 'accepted', location: '1420 S Lamar Blvd, Austin, TX', locationDetails: 'Front passenger flat. Spare available in trunk.', payout: 95, createdAt: '2026-07-19 07:42 AM', estimatedArrival: '09:15 AM' },
  { id: 'INS-1003', claimNumber: 'SFM-2026-55019', insuranceCompany: 'State Farm', policyHolder: 'Rachel Nguyen', policyNumber: 'SF-2201945', phone: '(555) 443-7718', vehicleMake: 'Ford', vehicleModel: 'Escape', vehicleYear: 2021, vehicleColor: 'White', vehiclePlate: 'TX-9N4L63', type: 'breakdown', status: 'en_route', location: 'Mopac Expy & Hwy 183, Austin, TX', locationDetails: 'Engine overheating. Smoke from hood. Pulled to grass shoulder.', payout: 145, createdAt: '2026-07-19 06:55 AM', estimatedArrival: '08:40 AM' },
  { id: 'INS-1004', claimNumber: 'ALS-2026-33847', insuranceCompany: 'Allstate', policyHolder: 'James Whitfield', policyNumber: 'AS-6602118', phone: '(555) 998-4421', vehicleMake: 'Chevrolet', vehicleModel: 'Malibu', vehicleYear: 2023, vehicleColor: 'Black', vehiclePlate: 'TX-1M7J09', type: 'lockout', status: 'on_scene', location: '7800 N MoPac Expy, Austin, TX', locationDetails: 'Keys locked in vehicle. Parking lot of H-E-B.', payout: 75, createdAt: '2026-07-19 09:01 AM' },
  { id: 'INS-1005', claimNumber: 'USAA-2026-11294', insuranceCompany: 'USAA', policyHolder: 'Capt. Steven Torres', policyNumber: 'UA-3308812', phone: '(555) 225-0019', vehicleMake: 'Jeep', vehicleModel: 'Wrangler', vehicleYear: 2020, vehicleColor: 'Green', vehiclePlate: 'TX-5K3R47', type: 'jump_start', status: 'completed', location: '2100 Barton Springs Rd, Austin, TX', locationDetails: 'Dead battery. Vehicle in residential driveway.', payout: 85, createdAt: '2026-07-19 05:30 AM' },
  { id: 'INS-1006', claimNumber: 'GCC-2026-48955', insuranceCompany: 'GEICO', policyHolder: 'Lisa Patel', policyNumber: 'GC-5512903', phone: '(555) 882-6140', vehicleMake: 'Nissan', vehicleModel: 'Altima', vehicleYear: 2023, vehicleColor: 'Red', vehiclePlate: 'TX-8P1N55', type: 'accident', status: 'dispatched', location: 'Ben White Blvd & Manchaca Rd, Austin, TX', locationDetails: 'T-bone collision at intersection. Vehicle not drivable. Airbags deployed.', payout: 225, createdAt: '2026-07-19 07:08 AM', estimatedArrival: '08:50 AM' },
  { id: 'INS-1007', claimNumber: 'PGH-2026-77340', insuranceCompany: 'Progressive', policyHolder: 'Anthony Brooks', policyNumber: 'PG-9912340', phone: '(555) 334-8827', vehicleMake: 'Hyundai', vehicleModel: 'Tucson', vehicleYear: 2025, vehicleColor: 'Gray', vehiclePlate: 'TX-2J6T14', type: 'breakdown', status: 'pending', location: 'Parmer Lane & Metric Blvd, Austin, TX', locationDetails: 'Transmission failure. Vehicle stuck in park. In turning lane.', payout: 165, createdAt: '2026-07-19 09:22 AM' },
  { id: 'INS-1008', claimNumber: 'SFM-2026-55088', insuranceCompany: 'State Farm', policyHolder: 'Karen Mitchell', policyNumber: 'SF-4418202', phone: '(555) 776-5531', vehicleMake: 'Subaru', vehicleModel: 'Outback', vehicleYear: 2022, vehicleColor: 'Blue', vehiclePlate: 'TX-6L8W33', type: 'flat_tire', status: 'accepted', location: '12400 Research Blvd, Austin, TX', locationDetails: 'Rear driver-side flat. No spare. Need flatbed or tire service.', payout: 110, createdAt: '2026-07-19 08:47 AM', estimatedArrival: '10:00 AM' },
  { id: 'INS-1009', claimNumber: 'ALS-2026-33891', insuranceCompany: 'Allstate', policyHolder: 'Robert Delgado', policyNumber: 'AS-7741005', phone: '(555) 119-3352', vehicleMake: 'BMW', vehicleModel: 'X3', vehicleYear: 2024, vehicleColor: 'White', vehiclePlate: 'TX-4H2K78', type: 'accident', status: 'pending', location: 'Hwy 71 & Bee Cave Rd, Austin, TX', locationDetails: 'Multi-vehicle accident. Vehicle in ditch. Tow to body shop requested.', payout: 275, createdAt: '2026-07-19 09:35 AM' },
  { id: 'INS-1010', claimNumber: 'USAA-2026-11322', insuranceCompany: 'USAA', policyHolder: 'Sgt. Diana Wallace', policyNumber: 'UA-4419920', phone: '(555) 667-1108', vehicleMake: 'Toyota', vehicleModel: 'RAV4', vehicleYear: 2023, vehicleColor: 'Silver', vehiclePlate: 'TX-9G5R12', type: 'jump_start', status: 'completed', location: '3500 Steck Ave, Austin, TX', locationDetails: 'Battery dead after leaving lights on. Apartment complex parking.', payout: 75, createdAt: '2026-07-18 04:15 PM' },
  { id: 'INS-1011', claimNumber: 'GCC-2026-48990', insuranceCompany: 'GEICO', policyHolder: 'Tyler Henderson', policyNumber: 'GC-6631882', phone: '(555) 445-9972', vehicleMake: 'Kia', vehicleModel: 'Sportage', vehicleYear: 2024, vehicleColor: 'Black', vehiclePlate: 'TX-3N7M41', type: 'lockout', status: 'pending', location: '5200 Burnet Rd, Austin, TX', locationDetails: 'Keys in ignition, engine running. In front of a restaurant.', payout: 65, createdAt: '2026-07-19 09:48 AM' },
  { id: 'INS-1012', claimNumber: 'OTHR-2026-00412', insuranceCompany: 'Other', policyHolder: 'Christine Yamamoto', policyNumber: 'LB-1290441', phone: '(555) 889-2217', vehicleMake: 'Mazda', vehicleModel: 'CX-5', vehicleYear: 2021, vehicleColor: 'Red', vehiclePlate: 'TX-7R9P66', type: 'breakdown', status: 'en_route', location: 'E 6th St & Chicon St, Austin, TX', locationDetails: 'Serpentine belt snapped. No power steering. Parked in bike lane.', payout: 135, createdAt: '2026-07-19 08:30 AM', estimatedArrival: '09:55 AM' },
];

const COMPANY_COLORS: Record<InsuranceCompany, { bg: string; text: string; border: string }> = {
  GEICO: { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' },
  Progressive: { bg: '#e3f2fd', text: '#1565c0', border: '#90caf9' },
  'State Farm': { bg: '#fce4ec', text: '#c62828', border: '#ef9a9a' },
  Allstate: { bg: '#fff3e0', text: '#e65100', border: '#ffcc80' },
  USAA: { bg: '#ede7f6', text: '#4527a0', border: '#b39ddb' },
  Other: { bg: '#f5f5f5', text: '#616161', border: '#e0e0e0' },
};

const STATUS_ORDER: Status[] = ['pending', 'accepted', 'dispatched', 'en_route', 'on_scene', 'completed'];

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#b45309', bg: '#fef3c7' },
  accepted: { label: 'Accepted', color: '#1d4ed8', bg: '#dbeafe' },
  dispatched: { label: 'Dispatched', color: '#6d28d9', bg: '#ede9fe' },
  en_route: { label: 'En Route', color: '#0e7490', bg: '#cffafe' },
  on_scene: { label: 'On Scene', color: '#b91c1c', bg: '#fee2e2' },
  completed: { label: 'Completed', color: '#15803d', bg: '#dcfce7' },
};

const TYPE_LABELS: Record<RequestType, { label: string; icon: string }> = {
  accident: { label: 'Accident', icon: '💥' },
  breakdown: { label: 'Breakdown', icon: '🔧' },
  lockout: { label: 'Lockout', icon: '🔑' },
  flat_tire: { label: 'Flat Tire', icon: '🛞' },
  jump_start: { label: 'Jump Start', icon: '🔋' },
};

const COMPANY_TABS: (InsuranceCompany | 'All')[] = ['All', 'GEICO', 'Progressive', 'State Farm', 'Allstate', 'USAA', 'Other'];
const STATUS_TABS: ('all' | Status)[] = ['all', 'pending', 'accepted', 'en_route', 'completed'];

function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}

export default function InsuranceDispatchPage() {
  const [selectedCompany, setSelectedCompany] = useState<InsuranceCompany | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [requests, setRequests] = useState<InsuranceRequest[]>(MOCK_DATA);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (selectedCompany !== 'All' && r.insuranceCompany !== selectedCompany) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return true;
    });
  }, [requests, selectedCompany, statusFilter]);

  const selected = requests.find((r) => r.id === selectedId) || null;

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'pending').length;
    const active = requests.filter((r) => !['pending', 'completed'].includes(r.status)).length;
    const revenue = requests.filter((r) => r.status === 'completed').reduce((s, r) => s + r.payout, 0) + 4260;
    return { pending, active, revenue };
  }, [requests]);

  function advanceStatus(id: string) {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const idx = STATUS_ORDER.indexOf(r.status);
        if (idx < STATUS_ORDER.length - 1) {
          return { ...r, status: STATUS_ORDER[idx + 1] };
        }
        return r;
      })
    );
  }

  function acceptRequest(id: string) {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'accepted' as Status } : r)));
  }

  function declineRequest(id: string) {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function companyCount(company: InsuranceCompany | 'All') {
    if (company === 'All') return requests.filter((r) => r.status === 'pending').length;
    return requests.filter((r) => r.insuranceCompany === company && r.status === 'pending').length;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f6f9fc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5edf5', padding: '20px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#061b31', margin: 0 }}>Insurance Dispatch</h1>
            <p style={{ fontSize: 14, color: '#64748d', margin: '4px 0 0' }}>Manage roadside assistance requests from insurance carriers</p>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <StatCard label="Pending" value={stats.pending} color="#b45309" bg="#fef3c7" />
            <StatCard label="Active" value={stats.active} color="#1d4ed8" bg="#dbeafe" />
            <StatCard label="Monthly Revenue" value={formatCurrency(stats.revenue)} color="#15803d" bg="#dcfce7" />
          </div>
        </div>
      </div>

      {/* Company Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5edf5', padding: '0 32px' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {COMPANY_TABS.map((company) => {
            const active = selectedCompany === company;
            const count = companyCount(company);
            return (
              <button
                key={company}
                onClick={() => { setSelectedCompany(company); setSelectedId(null); }}
                style={{
                  padding: '12px 20px',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#533afd' : '#64748d',
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? '2px solid #533afd' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {company}
                {count > 0 && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    background: active ? '#533afd' : '#e5edf5',
                    color: active ? '#fff' : '#64748d',
                    borderRadius: 10,
                    padding: '1px 7px',
                    minWidth: 18,
                    textAlign: 'center',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Filters */}
      <div style={{ padding: '16px 32px', display: 'flex', gap: 8 }}>
        {STATUS_TABS.map((s) => {
          const active = statusFilter === s;
          const label = s === 'all' ? 'All Statuses' : STATUS_CONFIG[s].label;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 14px',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? '#fff' : '#64748d',
                background: active ? '#533afd' : '#fff',
                border: `1px solid ${active ? '#533afd' : '#e5edf5'}`,
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: 0, padding: '0 32px 32px', height: 'calc(100vh - 210px)' }}>
        {/* List Panel */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 16 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#64748d' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p style={{ fontSize: 15, fontWeight: 500 }}>No requests match your filters</p>
            </div>
          )}
          {filtered.map((req) => {
            const isSelected = req.id === selectedId;
            const cc = COMPANY_COLORS[req.insuranceCompany];
            const sc = STATUS_CONFIG[req.status];
            const tc = TYPE_LABELS[req.type];
            return (
              <div
                key={req.id}
                onClick={() => setSelectedId(req.id)}
                style={{
                  background: isSelected ? '#f0edff' : '#fff',
                  border: isSelected ? '1px solid #533afd' : '1px solid #e5edf5',
                  borderRadius: 10,
                  padding: '16px 20px',
                  marginBottom: 10,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: isSelected ? '0 0 0 1px #533afd' : '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: cc.text,
                      background: cc.bg,
                      border: `1px solid ${cc.border}`,
                      borderRadius: 4,
                      padding: '2px 8px',
                    }}>
                      {req.insuranceCompany}
                    </span>
                    <span style={{ fontSize: 12, color: '#64748d', fontFamily: 'monospace' }}>{req.id}</span>
                    <span style={{ fontSize: 12, color: '#64748d' }}>•</span>
                    <span style={{ fontSize: 12, color: '#64748d', fontFamily: 'monospace' }}>{req.claimNumber}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: sc.color,
                      background: sc.bg,
                      borderRadius: 4,
                      padding: '2px 8px',
                    }}>
                      {sc.label}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#15803d' }}>{formatCurrency(req.payout)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#061b31', marginBottom: 4 }}>
                      {req.policyHolder}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748d', display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span>{tc.icon} {tc.label}</span>
                      <span>{req.vehicleYear} {req.vehicleColor} {req.vehicleMake} {req.vehicleModel}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#64748d' }}>{req.location.split(',')[0]}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{req.createdAt}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        <div style={{ width: 420, flexShrink: 0, paddingLeft: 16 }}>
          {selected ? (
            <div style={{ background: '#fff', border: '1px solid #e5edf5', borderRadius: 12, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Detail Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5edf5', background: '#f6f9fc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: COMPANY_COLORS[selected.insuranceCompany].text,
                    background: COMPANY_COLORS[selected.insuranceCompany].bg,
                    border: `1px solid ${COMPANY_COLORS[selected.insuranceCompany].border}`,
                    borderRadius: 4,
                    padding: '3px 10px',
                  }}>
                    {selected.insuranceCompany}
                  </span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: STATUS_CONFIG[selected.status].color,
                    background: STATUS_CONFIG[selected.status].bg,
                    borderRadius: 4,
                    padding: '3px 10px',
                  }}>
                    {STATUS_CONFIG[selected.status].label}
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#061b31' }}>{selected.policyHolder}</div>
                <div style={{ fontSize: 13, color: '#64748d', marginTop: 4 }}>
                  {TYPE_LABELS[selected.type].icon} {TYPE_LABELS[selected.type].label} • {selected.id}
                </div>
              </div>

              {/* Detail Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                <DetailSection title="Payout">
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#15803d' }}>{formatCurrency(selected.payout)}</div>
                </DetailSection>

                <DetailSection title="Status Progression">
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {STATUS_ORDER.map((s, i) => {
                      const currentIdx = STATUS_ORDER.indexOf(selected.status);
                      const reached = i <= currentIdx;
                      return (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: reached ? '#533afd' : '#e5edf5',
                            color: reached ? '#fff' : '#94a3b8',
                            fontSize: 10,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            {i + 1}
                          </div>
                          <span style={{ fontSize: 10, color: reached ? '#061b31' : '#94a3b8', fontWeight: reached ? 600 : 400 }}>
                            {STATUS_CONFIG[s].label}
                          </span>
                          {i < STATUS_ORDER.length - 1 && (
                            <div style={{ width: 12, height: 1, background: i < currentIdx ? '#533afd' : '#e5edf5' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </DetailSection>

                <DetailSection title="Vehicle Information">
                  <DetailRow label="Vehicle" value={`${selected.vehicleYear} ${selected.vehicleMake} ${selected.vehicleModel}`} />
                  <DetailRow label="Color" value={selected.vehicleColor} />
                  <DetailRow label="Plate" value={selected.vehiclePlate} />
                </DetailSection>

                <DetailSection title="Insurance Details">
                  <DetailRow label="Claim #" value={selected.claimNumber} />
                  <DetailRow label="Policy #" value={selected.policyNumber} />
                  <DetailRow label="Company" value={selected.insuranceCompany} />
                </DetailSection>

                <DetailSection title="Contact">
                  <DetailRow label="Phone" value={selected.phone} />
                </DetailSection>

                <DetailSection title="Breakdown Location">
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#061b31', marginBottom: 6 }}>{selected.location}</div>
                  <div style={{ fontSize: 13, color: '#64748d', lineHeight: 1.5 }}>{selected.locationDetails}</div>
                </DetailSection>

                {selected.notes && (
                  <DetailSection title="Notes">
                    <div style={{ fontSize: 13, color: '#64748d', lineHeight: 1.5 }}>{selected.notes}</div>
                  </DetailSection>
                )}
              </div>

              {/* Detail Actions */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #e5edf5', background: '#f6f9fc', display: 'flex', gap: 10 }}>
                {selected.status === 'pending' && (
                  <>
                    <button
                      onClick={() => acceptRequest(selected.id)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#fff',
                        background: '#533afd',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                    >
                      Accept Request
                    </button>
                    <button
                      onClick={() => declineRequest(selected.id)}
                      style={{
                        padding: '10px 20px',
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#b91c1c',
                        background: '#fff',
                        border: '1px solid #fecaca',
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                    >
                      Decline
                    </button>
                  </>
                )}
                {selected.status !== 'pending' && selected.status !== 'completed' && (
                  <button
                    onClick={() => advanceStatus(selected.id)}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#fff',
                      background: '#533afd',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    Advance to {STATUS_CONFIG[STATUS_ORDER[STATUS_ORDER.indexOf(selected.status) + 1]]?.label}
                  </button>
                )}
                {selected.status === 'completed' && (
                  <div style={{ flex: 1, textAlign: 'center', fontSize: 14, color: '#15803d', fontWeight: 600, padding: '10px 0' }}>
                    ✓ Completed — Payout {formatCurrency(selected.payout)}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e5edf5', borderRadius: 12, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#64748d' }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🚗</div>
              <p style={{ fontSize: 15, fontWeight: 500 }}>Select a request to view details</p>
              <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Click any dispatch card from the list</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: string | number; color: string; bg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 8, padding: '10px 18px', minWidth: 120 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748d', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: '#64748d' }}>{label}</span>
      <span style={{ color: '#061b31', fontWeight: 500, fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}
