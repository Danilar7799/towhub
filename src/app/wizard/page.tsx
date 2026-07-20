'use client';

import { useState, useCallback } from 'react';

/* ──────────────────────────── types ──────────────────────────── */

interface CompanyProfile {
  name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  yearsInBusiness: string;
  employees: string;
  logoUrl: string;
}

interface License {
  mcNumber: string;
  dotNumber: string;
  businessLicenseNumber: string;
  businessLicenseState: string;
  businessLicenseExpiry: string;
  insuranceProvider: string;
  policyNumber: string;
  policyExpiry: string;
  cargoInsurance: boolean;
  liabilityInsurance: boolean;
}

interface Vehicle {
  id: string;
  name: string;
  type: string;
  makeModelYear: string;
  plate: string;
  vin: string;
  capacity: string;
  mileage: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

interface ServicesPricing {
  selected: string[];
  baseRates: Record<string, string>;
  perMileRate: string;
  afterHoursMultiplier: string;
  weekendMultiplier: string;
  holidayMultiplier: string;
  serviceAreaRadius: string;
}

interface Integrations {
  twilio: boolean;
  blandAi: boolean;
  googleBusiness: boolean;
  quickbooks: boolean;
  copart: boolean;
  iaa: boolean;
  manheim: boolean;
  honk: boolean;
  urgently: boolean;
  agero: boolean;
}

interface WebsiteLeads {
  apiKey: string;
  embedCode: string;
  formName: string;
  formPhone: string;
  formEmail: string;
  formMessage: string;
}

/* ──────────────────────────── constants ──────────────────────── */

const STEPS = [
  { key: 'company', label: 'Company Profile', icon: '🏢' },
  { key: 'licensing', label: 'Licensing & Insurance', icon: '📋' },
  { key: 'fleet', label: 'Fleet Setup', icon: '🚛' },
  { key: 'team', label: 'Team Setup', icon: '👥' },
  { key: 'services', label: 'Services & Pricing', icon: '💰' },
  { key: 'integrations', label: 'Integrations', icon: '🔗' },
  { key: 'website', label: 'Website & Leads', icon: '🌐' },
  { key: 'launch', label: 'Launch', icon: '🚀' },
] as const;

const VEHICLE_TYPES = [
  { value: 'flatbed', label: 'Flatbed' },
  { value: 'wheel-lift', label: 'Wheel Lift' },
  { value: 'heavy-duty', label: 'Heavy Duty' },
  { value: 'medium-duty', label: 'Medium Duty' },
  { value: 'rollback', label: 'Rollback' },
  { value: 'integrated', label: 'Integrated' },
];

const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full access to all settings and data' },
  { value: 'dispatcher', label: 'Dispatcher', desc: 'Manage dispatch, assign drivers, view reports' },
  { value: 'driver', label: 'Driver', desc: 'View assigned jobs, update status, log mileage' },
];

const AVAILABLE_SERVICES = [
  { id: 'light-duty', label: 'Light Duty Towing', desc: 'Cars, SUVs, small trucks' },
  { id: 'medium-duty', label: 'Medium Duty Towing', desc: 'Box trucks, RVs, vans' },
  { id: 'heavy-duty', label: 'Heavy Duty Towing', desc: 'Semi-trucks, buses, equipment' },
  { id: 'roadside-assistance', label: 'Roadside Assistance', desc: 'Jump starts, tire changes, lockouts' },
  { id: 'fuel-delivery', label: 'Fuel Delivery', desc: 'Emergency fuel drop-off' },
  { id: 'winch-out', label: 'Winch-Out / Recovery', desc: 'Ditch, mud, snow recovery' },
  { id: 'accident-recovery', label: 'Accident Recovery', desc: 'Scene cleanup and vehicle recovery' },
  { id: 'transport', label: 'Long-Distance Transport', desc: 'Cross-city or cross-state hauling' },
  { id: 'impound', label: 'Impound Services', desc: 'Private property and police impounds' },
  { id: 'auction-transport', label: 'Auction Transport', desc: 'Copart / IAA / Manheim pickups' },
];

const INTEGRATIONS = {
  core: [
    { id: 'twilio' as keyof Integrations, label: 'Twilio', desc: 'SMS & voice notifications for drivers and customers', cat: 'Communications' },
    { id: 'blandAi' as keyof Integrations, label: 'Bland.ai', desc: 'AI-powered phone answering and dispatch', cat: 'Communications' },
    { id: 'googleBusiness' as keyof Integrations, label: 'Google Business', desc: 'Sync reviews, hours, and location data', cat: 'Marketing' },
    { id: 'quickbooks' as keyof Integrations, label: 'QuickBooks', desc: 'Auto-sync invoices, expenses, and payroll', cat: 'Accounting' },
  ],
  auction: [
    { id: 'copart' as keyof Integrations, label: 'Copart', desc: 'Auto-pull auction listings and schedule pickups', cat: 'Auction' },
    { id: 'iaa' as keyof Integrations, label: 'IAA (Insurance Auto Auctions)', desc: 'Manage IAA transport assignments', cat: 'Auction' },
    { id: 'manheim' as keyof Integrations, label: 'Manheim', desc: 'Access Manheim dealer-only lanes', cat: 'Auction' },
  ],
  roadside: [
    { id: 'honk' as keyof Integrations, label: 'HONK', desc: 'Receive dispatch requests from HONK network', cat: 'Roadside' },
    { id: 'urgently' as keyof Integrations, label: 'Urgently', desc: 'On-demand roadside assistance jobs', cat: 'Roadside' },
    { id: 'agero' as keyof Integrations, label: 'Agero', desc: 'Insurance and OEM roadside dispatch partner', cat: 'Roadside' },
  ],
};

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

/* ──────────────────────────── helpers ────────────────────────── */

const uid = () => Math.random().toString(36).slice(2, 10);

function inputClass(error?: boolean) {
  return [
    'w-full px-3.5 py-2.5 rounded-lg border text-[15px] leading-5',
    'bg-white text-gray-900 placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
    'transition-shadow duration-150',
    error ? 'border-red-400' : 'border-gray-300',
  ].join(' ');
}

function labelClass() {
  return 'block text-[13px] font-medium text-gray-700 mb-1.5';
}

function sectionTitle(text: string) {
  return <h3 className="text-[15px] font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">{text}</h3>;
}

/* ──────────────────────────── page ───────────────────────────── */

export default function SetupWizardPage() {
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState<CompanyProfile>({
    name: '', phone: '', email: '', website: '', address: '', city: '', state: '', zip: '',
    yearsInBusiness: '', employees: '', logoUrl: '',
  });
  const [license, setLicense] = useState<License>({
    mcNumber: '', dotNumber: '', businessLicenseNumber: '', businessLicenseState: '',
    businessLicenseExpiry: '', insuranceProvider: '', policyNumber: '', policyExpiry: '',
    cargoInsurance: false, liabilityInsurance: false,
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [services, setServices] = useState<ServicesPricing>({
    selected: [], baseRates: {}, perMileRate: '', afterHoursMultiplier: '1.5',
    weekendMultiplier: '1.25', holidayMultiplier: '2.0', serviceAreaRadius: '50',
  });
  const [integrations, setIntegrations] = useState<Integrations>({
    twilio: false, blandAi: false, googleBusiness: false, quickbooks: false,
    copart: false, iaa: false, manheim: false, honk: false, urgently: false, agero: false,
  });
  const [websiteLeads] = useState<WebsiteLeads>({
    apiKey: 'thw_live_' + uid() + uid(),
    embedCode: '',
    formName: '', formPhone: '', formEmail: '', formMessage: '',
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteSent, setShowInviteSent] = useState(false);
  const [launched, setLaunched] = useState(false);

  /* ── vehicle form state ── */
  const [vForm, setVForm] = useState({ name: '', type: 'flatbed', makeModelYear: '', plate: '', vin: '', capacity: '', mileage: '' });
  const [showVForm, setShowVForm] = useState(false);

  /* ── team form state ── */
  const [tForm, setTForm] = useState({ name: '', email: '', phone: '', role: 'driver' });
  const [showTForm, setShowTForm] = useState(false);

  /* ── navigation ── */
  const canNext = useCallback(() => {
    if (step === 0) return company.name.length > 0 && company.phone.length > 0 && company.email.length > 0;
    return true;
  }, [step, company]);

  const next = () => { if (step < 7 && canNext()) setStep(step + 1); };
  const back = () => { if (step > 0) setStep(step - 1); };
  const skip = () => { if (step < 7) setStep(step + 1); };

  /* ── add vehicle ── */
  const addVehicle = () => {
    if (!vForm.name || !vForm.makeModelYear) return;
    setVehicles([...vehicles, { id: uid(), ...vForm }]);
    setVForm({ name: '', type: 'flatbed', makeModelYear: '', plate: '', vin: '', capacity: '', mileage: '' });
    setShowVForm(false);
  };

  /* ── add team member ── */
  const addTeamMember = () => {
    if (!tForm.name || !tForm.email) return;
    setTeam([...team, { id: uid(), ...tForm }]);
    setTForm({ name: '', email: '', phone: '', role: 'driver' });
    setShowTForm(false);
  };

  /* ── toggle service ── */
  const toggleService = (id: string) => {
    const sel = services.selected.includes(id)
      ? services.selected.filter(s => s !== id)
      : [...services.selected, id];
    setServices({ ...services, selected: sel });
  };

  /* ── invite via email ── */
  const sendInvite = () => {
    if (!inviteEmail) return;
    setShowInviteSent(true);
    setTimeout(() => setShowInviteSent(false), 3000);
    setInviteEmail('');
  };

  /* ────────────────────── step content ────────────────────── */

  function renderStep() {
    switch (step) {
      case 0: return renderCompany();
      case 1: return renderLicensing();
      case 2: return renderFleet();
      case 3: return renderTeam();
      case 4: return renderServices();
      case 5: return renderIntegrations();
      case 6: return renderWebsite();
      case 7: return renderLaunch();
      default: return null;
    }
  }

  /* ── Step 1: Company ── */
  function renderCompany() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Company Profile</h2>
          <p className="text-sm text-gray-500 mt-1">Tell us about your towing business. This information appears on invoices, the customer portal, and dispatch displays.</p>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-5 p-5 bg-gray-50 rounded-xl border border-gray-200">
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {company.name ? company.name[0].toUpperCase() : '?'}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Company Logo</p>
            <p className="text-xs text-gray-500 mt-0.5">PNG, JPG or SVG · Max 2 MB</p>
            <button className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-md transition-colors">Upload Logo</button>
          </div>
        </div>

        {sectionTitle('Business Details')}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass()}>Company Name *</label>
            <input className={inputClass()} placeholder="e.g. Metro Towing & Recovery" value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} />
          </div>
          <div>
            <label className={labelClass()}>Phone Number *</label>
            <input className={inputClass()} placeholder="(555) 123-4567" value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} />
          </div>
          <div>
            <label className={labelClass()}>Email Address *</label>
            <input type="email" className={inputClass()} placeholder="dispatch@metrotowing.com" value={company.email} onChange={e => setCompany({ ...company, email: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass()}>Website</label>
            <input className={inputClass()} placeholder="https://metrotowing.com" value={company.website} onChange={e => setCompany({ ...company, website: e.target.value })} />
          </div>
        </div>

        {sectionTitle('Location')}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass()}>Street Address</label>
            <input className={inputClass()} placeholder="123 Main Street" value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} />
          </div>
          <div>
            <label className={labelClass()}>City</label>
            <input className={inputClass()} placeholder="Dallas" value={company.city} onChange={e => setCompany({ ...company, city: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass()}>State</label>
              <select className={inputClass()} value={company.state} onChange={e => setCompany({ ...company, state: e.target.value })}>
                <option value="">--</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass()}>ZIP Code</label>
              <input className={inputClass()} placeholder="75201" value={company.zip} onChange={e => setCompany({ ...company, zip: e.target.value })} />
            </div>
          </div>
        </div>

        {sectionTitle('Operations')}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass()}>Years in Business</label>
            <input type="number" className={inputClass()} placeholder="5" value={company.yearsInBusiness} onChange={e => setCompany({ ...company, yearsInBusiness: e.target.value })} />
          </div>
          <div>
            <label className={labelClass()}>Number of Employees</label>
            <input type="number" className={inputClass()} placeholder="12" value={company.employees} onChange={e => setCompany({ ...company, employees: e.target.value })} />
          </div>
        </div>
      </div>
    );
  }

  /* ── Step 2: Licensing & Insurance ── */
  function renderLicensing() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Licensing & Insurance</h2>
          <p className="text-sm text-gray-500 mt-1">Your DOT and MC numbers are required for interstate commerce. Insurance must be current to dispatch on partnered networks.</p>
        </div>

        {sectionTitle('Federal Operating Authority')}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass()}>MC Number</label>
            <input className={inputClass()} placeholder="MC-123456" value={license.mcNumber} onChange={e => setLicense({ ...license, mcNumber: e.target.value })} />
            <p className="text-xs text-gray-400 mt-1">Motor Carrier number from FMCSA</p>
          </div>
          <div>
            <label className={labelClass()}>DOT Number</label>
            <input className={inputClass()} placeholder="12345678" value={license.dotNumber} onChange={e => setLicense({ ...license, dotNumber: e.target.value })} />
            <p className="text-xs text-gray-400 mt-1">USDOT number for commercial vehicles</p>
          </div>
        </div>

        {sectionTitle('Business License')}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass()}>License Number</label>
            <input className={inputClass()} placeholder="BL-2024-001" value={license.businessLicenseNumber} onChange={e => setLicense({ ...license, businessLicenseNumber: e.target.value })} />
          </div>
          <div>
            <label className={labelClass()}>State</label>
            <select className={inputClass()} value={license.businessLicenseState} onChange={e => setLicense({ ...license, businessLicenseState: e.target.value })}>
              <option value="">Select state</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass()}>Expiry Date</label>
            <input type="date" className={inputClass()} value={license.businessLicenseExpiry} onChange={e => setLicense({ ...license, businessLicenseExpiry: e.target.value })} />
          </div>
        </div>

        {sectionTitle('Insurance Coverage')}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass()}>Insurance Provider</label>
            <input className={inputClass()} placeholder="National Interstate" value={license.insuranceProvider} onChange={e => setLicense({ ...license, insuranceProvider: e.target.value })} />
          </div>
          <div>
            <label className={labelClass()}>Policy Number</label>
            <input className={inputClass()} placeholder="POL-987654" value={license.policyNumber} onChange={e => setLicense({ ...license, policyNumber: e.target.value })} />
          </div>
          <div>
            <label className={labelClass()}>Policy Expiry</label>
            <input type="date" className={inputClass()} value={license.policyExpiry} onChange={e => setLicense({ ...license, policyExpiry: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {[
            { key: 'cargoInsurance' as const, label: 'Cargo Insurance', desc: 'Covers cargo damage during transport' },
            { key: 'liabilityInsurance' as const, label: 'Liability Insurance', desc: 'General liability for operations' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setLicense({ ...license, [item.key]: !license[item.key] })}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                license[item.key]
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                license[item.key] ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
              }`}>
                {license[item.key] && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                )}
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900">{item.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── Step 3: Fleet ── */
  function renderFleet() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Fleet Setup</h2>
          <p className="text-sm text-gray-500 mt-1">Add the vehicles in your fleet. You can add more anytime from Settings → Fleet.</p>
        </div>

        {/* Vehicle list */}
        {vehicles.length > 0 && (
          <div className="space-y-2">
            {vehicles.map(v => (
              <div key={v.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg">
                    {v.type === 'flatbed' ? '🛏️' : v.type === 'wheel-lift' ? '🔧' : v.type === 'heavy-duty' ? '🏗️' : '🚛'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{v.name}</p>
                    <p className="text-xs text-gray-500">{v.makeModelYear} · {v.plate || 'No plate'} · {v.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {v.capacity && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{v.capacity}</span>}
                  <button onClick={() => setVehicles(vehicles.filter(x => x.id !== v.id))} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add vehicle form */}
        {showVForm ? (
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Add Vehicle</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelClass()}>Vehicle Name</label>
                <input className={inputClass()} placeholder="Unit 1" value={vForm.name} onChange={e => setVForm({ ...vForm, name: e.target.value })} />
              </div>
              <div>
                <label className={labelClass()}>Type</label>
                <select className={inputClass()} value={vForm.type} onChange={e => setVForm({ ...vForm, type: e.target.value })}>
                  {VEHICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass()}>Make / Model / Year</label>
                <input className={inputClass()} placeholder="Ford F-550 · 2022" value={vForm.makeModelYear} onChange={e => setVForm({ ...vForm, makeModelYear: e.target.value })} />
              </div>
              <div>
                <label className={labelClass()}>License Plate</label>
                <input className={inputClass()} placeholder="ABC-1234" value={vForm.plate} onChange={e => setVForm({ ...vForm, plate: e.target.value })} />
              </div>
              <div>
                <label className={labelClass()}>VIN</label>
                <input className={inputClass()} placeholder="1FTBF2B69NED12345" value={vForm.vin} onChange={e => setVForm({ ...vForm, vin: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass()}>Capacity (tons)</label>
                  <input type="number" className={inputClass()} placeholder="8" value={vForm.capacity} onChange={e => setVForm({ ...vForm, capacity: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass()}>Current Mileage</label>
                  <input type="number" className={inputClass()} placeholder="45,000" value={vForm.mileage} onChange={e => setVForm({ ...vForm, mileage: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={addVehicle} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Add Vehicle</button>
              <button onClick={() => setShowVForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowVForm(true)} className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Vehicle
          </button>
        )}

        {vehicles.length === 0 && !showVForm && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🚛</div>
            <p className="text-sm text-gray-500">No vehicles added yet. Add your first vehicle to get started.</p>
          </div>
        )}
      </div>
    );
  }

  /* ── Step 4: Team ── */
  function renderTeam() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team Setup</h2>
          <p className="text-sm text-gray-500 mt-1">Add your team members and set their roles. Permissions are automatically assigned based on role.</p>
        </div>

        {/* Role descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ROLES.map(r => (
            <div key={r.value} className="p-3 rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{r.value === 'admin' ? '👑' : r.value === 'dispatcher' ? '📋' : '🚛'}</span>
                <span className="text-sm font-semibold text-gray-900">{r.label}</span>
              </div>
              <p className="text-xs text-gray-500">{r.desc}</p>
            </div>
          ))}
        </div>

        {/* Team list */}
        {team.length > 0 && (
          <div className="space-y-2">
            {team.map(m => (
              <div key={m.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                    {m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.email} · {m.phone || 'No phone'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    m.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    m.role === 'dispatcher' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>{m.role}</span>
                  <button onClick={() => setTeam(team.filter(x => x.id !== m.id))} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add member form */}
        {showTForm ? (
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Add Team Member</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelClass()}>Full Name</label>
                <input className={inputClass()} placeholder="Jane Doe" value={tForm.name} onChange={e => setTForm({ ...tForm, name: e.target.value })} />
              </div>
              <div>
                <label className={labelClass()}>Email</label>
                <input type="email" className={inputClass()} placeholder="jane@example.com" value={tForm.email} onChange={e => setTForm({ ...tForm, email: e.target.value })} />
              </div>
              <div>
                <label className={labelClass()}>Phone</label>
                <input className={inputClass()} placeholder="(555) 987-6543" value={tForm.phone} onChange={e => setTForm({ ...tForm, phone: e.target.value })} />
              </div>
              <div>
                <label className={labelClass()}>Role</label>
                <select className={inputClass()} value={tForm.role} onChange={e => setTForm({ ...tForm, role: e.target.value })}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={addTeamMember} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Add Member</button>
              <button onClick={() => setShowTForm(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowTForm(true)} className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Team Member
          </button>
        )}

        {/* Invite by email */}
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-2">Invite via Email</p>
          <p className="text-xs text-gray-500 mb-3">Send an invitation link. They will set their own password and complete their profile.</p>
          <div className="flex gap-2">
            <input
              type="email"
              className={inputClass()}
              placeholder="teammate@company.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
            />
            <button onClick={sendInvite} className="shrink-0 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
              Send Invite
            </button>
          </div>
          {showInviteSent && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Invitation sent successfully!
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ── Step 5: Services & Pricing ── */
  function renderServices() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Services & Pricing</h2>
          <p className="text-sm text-gray-500 mt-1">Select the services you offer and set your rates. These appear on your booking form and dispatch board.</p>
        </div>

        {sectionTitle('Services Offered')}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {AVAILABLE_SERVICES.map(svc => {
            const active = services.selected.includes(svc.id);
            return (
              <button
                key={svc.id}
                onClick={() => toggleService(svc.id)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  active ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                  active ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                }`}>
                  {active && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900">{svc.label}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{svc.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {services.selected.length > 0 && (
          <>
            {sectionTitle('Base Rates')}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {services.selected.map(svcId => {
                const svc = AVAILABLE_SERVICES.find(s => s.id === svcId)!;
                return (
                  <div key={svcId} className="flex items-center gap-3">
                    <label className="text-sm text-gray-700 w-40 shrink-0 truncate">{svc.label}</label>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        className={inputClass() + ' pl-7'}
                        placeholder="75.00"
                        value={services.baseRates[svcId] || ''}
                        onChange={e => setServices({ ...services, baseRates: { ...services.baseRates, [svcId]: e.target.value } })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {sectionTitle('Rate Modifiers')}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelClass()}>Per-Mile Rate ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" step="0.01" className={inputClass() + ' pl-7'} placeholder="3.50" value={services.perMileRate} onChange={e => setServices({ ...services, perMileRate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelClass()}>After-Hours Multiplier</label>
            <input type="number" step="0.25" className={inputClass()} placeholder="1.5" value={services.afterHoursMultiplier} onChange={e => setServices({ ...services, afterHoursMultiplier: e.target.value })} />
            <p className="text-xs text-gray-400 mt-1">e.g. 1.5 = 50% more</p>
          </div>
          <div>
            <label className={labelClass()}>Weekend Multiplier</label>
            <input type="number" step="0.25" className={inputClass()} placeholder="1.25" value={services.weekendMultiplier} onChange={e => setServices({ ...services, weekendMultiplier: e.target.value })} />
          </div>
          <div>
            <label className={labelClass()}>Holiday Multiplier</label>
            <input type="number" step="0.25" className={inputClass()} placeholder="2.0" value={services.holidayMultiplier} onChange={e => setServices({ ...services, holidayMultiplier: e.target.value })} />
          </div>
        </div>

        {sectionTitle('Service Area')}
        <div className="max-w-xs">
          <label className={labelClass()}>Radius from Base (miles)</label>
          <input type="number" className={inputClass()} placeholder="50" value={services.serviceAreaRadius} onChange={e => setServices({ ...services, serviceAreaRadius: e.target.value })} />
          <p className="text-xs text-gray-400 mt-1">Jobs outside this radius will be flagged for review</p>
        </div>
      </div>
    );
  }

  /* ── Step 6: Integrations ── */
  function renderIntegrations() {
    const renderGroup = (title: string, items: typeof INTEGRATIONS.core) => (
      <div>
        <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h3>
        <div className="space-y-2">
          {items.map(item => {
            const connected = integrations[item.id];
            return (
              <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                    connected ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {item.id === 'twilio' ? '📱' : item.id === 'blandAi' ? '🤖' : item.id === 'googleBusiness' ? '🔍' :
                     item.id === 'quickbooks' ? '📊' : item.id === 'copart' ? '🏷️' : item.id === 'iaa' ? '🔨' :
                     item.id === 'manheim' ? '🏛️' : item.id === 'honk' ? '📯' : item.id === 'urgently' ? '⚡' : '🛡️'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIntegrations({ ...integrations, [item.id]: !integrations[item.id] })}
                  className={`shrink-0 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                    connected
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {connected ? '✓ Connected' : 'Connect'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Integrations</h2>
          <p className="text-sm text-gray-500 mt-1">Connect the tools you already use. You can set up API keys after completing the wizard.</p>
        </div>
        {renderGroup('Core', INTEGRATIONS.core)}
        {renderGroup('Auction Platforms', INTEGRATIONS.auction)}
        {renderGroup('Roadside Networks', INTEGRATIONS.roadside)}
      </div>
    );
  }

  /* ── Step 7: Website & Leads ── */
  function renderWebsite() {
    const embedCode = `<!-- TowHub Lead Capture Form -->
<div id="towhub-lead-form"></div>
<script src="https://app.towhub.io/embed/form.js"
  data-api-key="${websiteLeads.apiKey}"
  data-theme="light"
  data-company="${company.name || 'Your Company'}"
  async></script>`;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Website & Leads</h2>
          <p className="text-sm text-gray-500 mt-1">Embed a lead capture form on your website or use the API to send leads directly into TowHub.</p>
        </div>

        {sectionTitle('Your API Key')}
        <div className="p-4 bg-gray-900 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400">API Key</span>
            <button
              onClick={() => navigator.clipboard?.writeText(websiteLeads.apiKey)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >Copy</button>
          </div>
          <code className="text-sm text-green-400 font-mono break-all">{websiteLeads.apiKey}</code>
        </div>

        {sectionTitle('Embed Code')}
        <div className="p-4 bg-gray-900 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400">HTML</span>
            <button
              onClick={() => navigator.clipboard?.writeText(embedCode)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >Copy</button>
          </div>
          <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">{embedCode}</pre>
        </div>

        {sectionTitle('Lead Form Preview')}
        <div className="p-6 bg-white rounded-xl border border-gray-200 max-w-md">
          <div className="text-center mb-5">
            <h3 className="text-lg font-semibold text-gray-900">{company.name || 'Your Company'}</h3>
            <p className="text-sm text-gray-500">Request a tow or roadside assistance</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className={labelClass()}>Your Name</label>
              <input disabled className={inputClass() + ' bg-gray-50'} placeholder="John Doe" />
            </div>
            <div>
              <label className={labelClass()}>Phone Number</label>
              <input disabled className={inputClass() + ' bg-gray-50'} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className={labelClass()}>Email</label>
              <input disabled className={inputClass() + ' bg-gray-50'} placeholder="john@example.com" />
            </div>
            <div>
              <label className={labelClass()}>What do you need help with?</label>
              <textarea disabled rows={3} className={inputClass() + ' bg-gray-50 resize-none'} placeholder="Describe your situation..." />
            </div>
            <button disabled className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg opacity-75">Request Assistance</button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-3">Powered by <span className="font-semibold">TowHub</span></p>
        </div>
      </div>
    );
  }

  /* ── Step 8: Launch ── */
  function renderLaunch() {
    const configuredItems = [
      { label: 'Company Profile', done: !!company.name, icon: '🏢' },
      { label: 'Licensing & Insurance', done: !!license.mcNumber || !!license.dotNumber, icon: '📋' },
      { label: 'Fleet', done: vehicles.length > 0, icon: '🚛', detail: `${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''}` },
      { label: 'Team', done: team.length > 0, icon: '👥', detail: `${team.length} member${team.length !== 1 ? 's' : ''}` },
      { label: 'Services & Pricing', done: services.selected.length > 0, icon: '💰', detail: `${services.selected.length} service${services.selected.length !== 1 ? 's' : ''}` },
      { label: 'Integrations', done: Object.values(integrations).some(Boolean), icon: '🔗', detail: `${Object.values(integrations).filter(Boolean).length} connected` },
      { label: 'Website & Leads', done: true, icon: '🌐', detail: 'API key generated' },
    ];

    if (launched) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{"You're All Set!"}</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">Your TowHub workspace is configured and ready. Welcome to smarter towing operations.</p>
          <a href="/dashboard" className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-base shadow-lg shadow-indigo-500/25">
            Open Dashboard
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </a>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Ready to Launch 🚀</h2>
          <p className="text-sm text-gray-500 mt-1">Review your setup below. You can always change these settings later from the dashboard.</p>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {configuredItems.map(item => (
            <div key={item.label} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                {item.detail && <p className="text-xs text-gray-500">{item.detail}</p>}
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                item.done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {item.done ? '✓ Done' : 'Skipped'}
              </span>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="p-5 bg-indigo-50 rounded-xl border border-indigo-100">
          <h3 className="text-sm font-semibold text-indigo-900 mb-3">Quick Actions After Launch</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: 'Create your first job', href: '/jobs/new', icon: '📝' },
              { label: 'View dispatch board', href: '/dispatch', icon: '🗺️' },
              { label: 'Send your first invoice', href: '/invoices/new', icon: '💳' },
              { label: 'Invite more team members', href: '/team', icon: '✉️' },
            ].map(action => (
              <a key={action.label} href={action.href} className="flex items-center gap-2 p-3 bg-white rounded-lg border border-indigo-100 hover:border-indigo-300 transition-colors text-sm text-indigo-800 font-medium">
                <span>{action.icon}</span>
                {action.label}
              </a>
            ))}
          </div>
        </div>

        <button
          onClick={() => setLaunched(true)}
          className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors text-base shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
        >
          🚀 Launch Dashboard
        </button>
      </div>
    );
  }

  /* ──────────────────────── progress ──────────────────────── */

  const progressPct = Math.round(((step + 1) / STEPS.length) * 100);

  /* ──────────────────────── render ────────────────────────── */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <span className="text-lg font-bold text-gray-900">TowHub</span>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Setup Wizard</span>
          </div>
          <button onClick={skip} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Skip to Dashboard →
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <nav className="lg:w-56 shrink-0">
          <ol className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {STEPS.map((s, i) => (
              <li key={s.key}>
                <button
                  onClick={() => setStep(i)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all text-sm whitespace-nowrap ${
                    i === step
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : i < step
                      ? 'text-gray-600 hover:bg-gray-100'
                      : 'text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i === step
                      ? 'bg-indigo-600 text-white'
                      : i < step
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {i < step ? '✓' : i + 1}
                  </span>
                  <span className="hidden lg:inline">{s.label}</span>
                  <span className="lg:hidden">{s.icon}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            {renderStep()}
          </div>

          {/* Navigation */}
          {step < 7 && (
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={back}
                disabled={step === 0}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2">
                {step > 0 && step < 7 && (
                  <button onClick={skip} className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                    Skip
                  </button>
                )}
                <button
                  onClick={next}
                  disabled={!canNext()}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
