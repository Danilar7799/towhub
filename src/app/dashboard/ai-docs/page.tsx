'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/* ─── Design Tokens ─── */
const t = {
  primary: '#533afd',
  primaryLight: '#ede8ff',
  primaryDark: '#3e28c8',
  text: '#061b31',
  muted: '#64748d',
  border: '#e5edf5',
  surface: '#f6f9fc',
  white: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

/* ─── Types ─── */
type DocType = 'invoice' | 'receipt' | 'contract' | 'police_report' | 'bill_of_lading' | 'insurance_claim' | 'unknown';

interface ExtractedField {
  label: string;
  value: string;
  key: string;
}

interface UploadedDocument {
  id: string;
  name: string;
  type: DocType;
  date: string;
  fields: ExtractedField[];
  status: 'extracting' | 'review' | 'saved';
}

interface GeneratedDocument {
  id: string;
  name: string;
  type: DocType;
  date: string;
  jobId: string;
  customer: string;
}

interface LibraryDocument {
  id: string;
  name: string;
  type: DocType;
  date: string;
  source: 'uploaded' | 'generated';
  customer?: string;
  jobId?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface GenerateTemplate {
  id: string;
  type: DocType;
  title: string;
  description: string;
  icon: string;
}

/* ─── Constants ─── */
const DOC_TYPE_LABELS: Record<DocType, string> = {
  invoice: 'Invoice',
  receipt: 'Receipt',
  contract: 'Contract',
  police_report: 'Police Report',
  bill_of_lading: 'Bill of Lading',
  insurance_claim: 'Insurance Claim',
  unknown: 'Unknown',
};

const DOC_TYPE_COLORS: Record<DocType, string> = {
  invoice: '#533afd',
  receipt: '#10b981',
  contract: '#3b82f6',
  police_report: '#ef4444',
  bill_of_lading: '#f59e0b',
  insurance_claim: '#8b5cf6',
  unknown: '#64748d',
};

const DOC_TYPE_ICONS: Record<DocType, string> = {
  invoice: '📄',
  receipt: '🧾',
  contract: '📝',
  police_report: '🚔',
  bill_of_lading: '🚢',
  insurance_claim: '🛡️',
  unknown: '📎',
};

const GENERATE_TEMPLATES: GenerateTemplate[] = [
  { id: 'gen-invoice', type: 'invoice', title: 'Generate Invoice', description: 'Select a job and auto-generate a PDF invoice with company branding.', icon: '📄' },
  { id: 'gen-receipt', type: 'receipt', title: 'Generate Receipt', description: 'Select a completed job to create a payment receipt.', icon: '🧾' },
  { id: 'gen-contract', type: 'contract', title: 'Generate Contract', description: 'Choose B2B or B2C template, fill in parties, rates, and terms.', icon: '📝' },
  { id: 'gen-police', type: 'police_report', title: 'Generate Police Report', description: 'Auto-fill tow details for police department submission.', icon: '🚔' },
  { id: 'gen-bol', type: 'bill_of_lading', title: 'Generate Bill of Lading', description: 'Transport document for auction tows.', icon: '🚢' },
  { id: 'gen-claim', type: 'insurance_claim', title: 'Generate Insurance Claim', description: 'Pre-fill claim form with job, vehicle, and damage details.', icon: '🛡️' },
];

const SAMPLE_JOBS = [
  { id: 'JOB-1042', customer: 'John Martinez', vehicle: '2021 Toyota Camry', status: 'completed' },
  { id: 'JOB-1043', customer: 'Sarah Williams', vehicle: '2019 Ford F-150', status: 'completed' },
  { id: 'JOB-1044', customer: 'Mike\'s Auto Shop', vehicle: '2020 Honda Civic', status: 'in_progress' },
  { id: 'JOB-1045', customer: 'Lisa Chen', vehicle: '2022 BMW X5', status: 'completed' },
  { id: 'JOB-1046', customer: 'ABC Towing Corp', vehicle: '2018 Chevy Silverado', status: 'completed' },
];

const SAMPLE_LIBRARY: LibraryDocument[] = [
  { id: 'lib-1', name: 'Invoice_INV-2026-0042.pdf', type: 'invoice', date: '2026-07-18', source: 'generated', customer: 'John Martinez', jobId: 'JOB-1042' },
  { id: 'lib-2', name: 'Police_Report_JULY-15.pdf', type: 'police_report', date: '2026-07-15', source: 'uploaded', customer: 'Sarah Williams', jobId: 'JOB-1043' },
  { id: 'lib-3', name: 'Contract_ABC_Towing.pdf', type: 'contract', date: '2026-07-10', source: 'generated', customer: 'ABC Towing Corp' },
  { id: 'lib-4', name: 'Insurance_Claim_Lisa_Chen.pdf', type: 'insurance_claim', date: '2026-07-12', source: 'uploaded', customer: 'Lisa Chen', jobId: 'JOB-1045' },
  { id: 'lib-5', name: 'Receipt_JOB-1043.pdf', type: 'receipt', date: '2026-07-16', source: 'generated', customer: 'Sarah Williams', jobId: 'JOB-1043' },
  { id: 'lib-6', name: 'Bill_of_Lading_Auction.pdf', type: 'bill_of_lading', date: '2026-07-14', source: 'uploaded' },
  { id: 'lib-7', name: 'Invoice_INV-2026-0043.pdf', type: 'invoice', date: '2026-07-19', source: 'generated', customer: 'Lisa Chen', jobId: 'JOB-1045' },
  { id: 'lib-8', name: 'Contract_Mikes_Auto.pdf', type: 'contract', date: '2026-07-08', source: 'generated', customer: "Mike's Auto Shop" },
];

const QUICK_PROMPTS = [
  'Generate invoice for job #1042',
  'Create contract for ABC Corp',
  'Summarize this police report',
  'Extract data from uploaded insurance card',
  'Generate receipt for Lisa Chen',
  'What documents are missing for job #1044?',
];

/* ─── Styles ─── */
const s = {
  page: { padding: '32px', maxWidth: '1400px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: t.text },
  header: { marginBottom: '32px' },
  h1: { fontSize: '28px', fontWeight: 700 as const, color: t.text, margin: '0 0 6px 0' },
  subtitle: { fontSize: '14px', color: t.muted, margin: 0 },
  tabs: { display: 'flex', gap: '4px', borderBottom: `2px solid ${t.border}`, marginBottom: '28px' },
  tab: (active: boolean) => ({ padding: '10px 20px', fontSize: '14px', fontWeight: active ? 600 : 400, color: active ? t.primary : t.muted, background: 'none', border: 'none', borderBottom: active ? `2px solid ${t.primary}` : '2px solid transparent', cursor: 'pointer', marginBottom: '-2px', transition: 'all 0.15s' }),
  card: { background: t.white, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '24px', marginBottom: '20px' },
  sectionTitle: { fontSize: '18px', fontWeight: 600, color: t.text, margin: '0 0 4px 0' },
  sectionDesc: { fontSize: '13px', color: t.muted, margin: '0 0 20px 0' },
  btn: (variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary') => {
    const base = { padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500 as const, cursor: 'pointer', border: 'none', transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: '6px' } as const;
    if (variant === 'primary') return { ...base, background: t.primary, color: t.white };
    if (variant === 'danger') return { ...base, background: t.danger, color: t.white };
    if (variant === 'ghost') return { ...base, background: 'transparent', color: t.muted, border: `1px solid ${t.border}` };
    return { ...base, background: t.surface, color: t.text, border: `1px solid ${t.border}` };
  },
  input: { width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, fontSize: '13px', color: t.text, background: t.white, outline: 'none', boxSizing: 'border-box' as const },
  select: { padding: '8px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, fontSize: '13px', color: t.text, background: t.white, outline: 'none', cursor: 'pointer' },
  badge: (color: string) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600, color, background: color + '15', border: `1px solid ${color}30` }),
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' },
  flex: (gap = '12px', align = 'center') => ({ display: 'flex', gap, alignItems: align }),
  flexBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
};

/* ─── Upload & Extract Section ─── */
function UploadExtract() {
  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState<UploadedDocument | null>(null);
  const [editFields, setEditFields] = useState<ExtractedField[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [linkJob, setLinkJob] = useState('');
  const [linkCustomer, setLinkCustomer] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const simulateExtract = useCallback((fileName: string) => {
    setExtracting(true);
    setUploaded({ id: 'up-' + Date.now(), name: fileName, type: 'unknown', date: new Date().toISOString().slice(0, 10), fields: [], status: 'extracting' });
    setTimeout(() => {
      const types: DocType[] = ['invoice', 'police_report', 'insurance_claim'];
      const detectedType = types[Math.floor(Math.random() * types.length)];
      const sampleFields: ExtractedField[] = [
        { label: 'Full Name', value: 'John Martinez', key: 'name' },
        { label: 'Date', value: '2026-07-18', key: 'date' },
        { label: 'Policy Number', value: 'POL-2026-88421', key: 'policy' },
        { label: 'VIN', value: '1HGBH41JXMN109186', key: 'vin' },
        { label: 'Address', value: '1425 Elm Street, Springfield, IL 62704', key: 'address' },
        { label: 'Amount', value: '$1,250.00', key: 'amount' },
      ];
      setEditFields(sampleFields);
      setUploaded(prev => prev ? { ...prev, type: detectedType, fields: sampleFields, status: 'review' } : null);
      setExtracting(false);
    }, 2200);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) simulateExtract(file.name);
  }, [simulateExtract]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) simulateExtract(file.name);
  }, [simulateExtract]);

  const updateField = (key: string, value: string) => {
    setEditFields(prev => prev.map(f => f.key === key ? { ...f, value } : f));
  };

  const handleSave = () => {
    setUploaded(prev => prev ? { ...prev, status: 'saved' } : null);
    setTimeout(() => {
      setUploaded(null);
      setEditFields([]);
      setLinkJob('');
      setLinkCustomer('');
    }, 1500);
  };

  return (
    <div>
      <div style={s.card}>
        <h3 style={s.sectionTitle}>Upload & Extract</h3>
        <p style={s.sectionDesc}>Drag and drop documents for AI-powered data extraction. Supports insurance cards, police reports, driver licenses, registration, and invoices.</p>
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? t.primary : t.border}`,
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? t.primaryLight : t.surface,
            transition: 'all 0.2s',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📤</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: t.text, marginBottom: '4px' }}>Drop files here or click to browse</div>
          <div style={{ fontSize: '13px', color: t.muted }}>PDF, PNG, JPG up to 20MB • AI auto-detects document type</div>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handleFileSelect} />
        </div>

        {/* Extraction in progress */}
        {extracting && (
          <div style={{ background: t.primaryLight, borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px', animation: 'spin 1.5s linear infinite' }}>⚡</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: t.primary }}>AI is analyzing your document…</div>
            <div style={{ fontSize: '12px', color: t.muted, marginTop: '4px' }}>Detecting type, extracting fields, reading content</div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Extracted data review */}
        {uploaded && uploaded.status !== 'extracting' && (
          <div style={{ background: t.surface, borderRadius: '10px', padding: '20px', border: `1px solid ${t.border}` }}>
            <div style={{ ...s.flexBetween, marginBottom: '16px' }}>
              <div style={s.flex()}>
                <span style={{ fontSize: '18px' }}>{DOC_TYPE_ICONS[uploaded.type]}</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{uploaded.name}</div>
                  <div style={{ fontSize: '12px', color: t.muted }}>Detected as: <span style={s.badge(DOC_TYPE_COLORS[uploaded.type])}>{DOC_TYPE_LABELS[uploaded.type]}</span></div>
                </div>
              </div>
              {uploaded.status === 'saved' && <span style={s.badge(t.success)}>✓ Saved</span>}
            </div>

            <div style={s.grid2}>
              {editFields.map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: t.muted, display: 'block', marginBottom: '4px' }}>{f.label}</label>
                  <input
                    style={s.input}
                    value={f.value}
                    onChange={e => updateField(f.key, e.target.value)}
                    disabled={uploaded.status === 'saved'}
                  />
                </div>
              ))}
            </div>

            {uploaded.status !== 'saved' && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select style={s.select} value={linkJob} onChange={e => setLinkJob(e.target.value)}>
                  <option value="">Link to Job…</option>
                  {SAMPLE_JOBS.map(j => <option key={j.id} value={j.id}>{j.id} — {j.customer}</option>)}
                </select>
                <input style={{ ...s.input, maxWidth: '220px' }} placeholder="Link to Customer…" value={linkCustomer} onChange={e => setLinkCustomer(e.target.value)} />
                <div style={{ flex: 1 }} />
                <button style={s.btn('ghost')} onClick={() => { setUploaded(null); setEditFields([]); }}>Discard</button>
                <button style={s.btn('primary')} onClick={handleSave}>💾 Save to Database</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Generate Section ─── */
function GenerateDocs() {
  const [selectedTemplate, setSelectedTemplate] = useState<GenerateTemplate | null>(null);
  const [selectedJob, setSelectedJob] = useState('');
  const [contractType, setContractType] = useState<'b2b' | 'b2c'>('b2b');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedDocument | null>(null);

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    setTimeout(() => {
      setGenerated({
        id: 'gen-' + Date.now(),
        name: `${DOC_TYPE_LABELS[selectedTemplate.type]}_${selectedJob || 'NEW'}.pdf`,
        type: selectedTemplate.type,
        date: new Date().toISOString().slice(0, 10),
        jobId: selectedJob || 'N/A',
        customer: SAMPLE_JOBS.find(j => j.id === selectedJob)?.customer || 'New Customer',
      });
      setGenerating(false);
    }, 1800);
  };

  return (
    <div>
      <div style={s.card}>
        <h3 style={s.sectionTitle}>Generate Documents</h3>
        <p style={s.sectionDesc}>AI-powered document generation. Select a template, choose a job, and get a branded document instantly.</p>

        <div style={{ ...s.grid3, marginBottom: '20px' }}>
          {GENERATE_TEMPLATES.map(tmpl => (
            <div
              key={tmpl.id}
              onClick={() => { setSelectedTemplate(tmpl); setGenerated(null); }}
              style={{
                padding: '18px',
                borderRadius: '10px',
                border: `2px solid ${selectedTemplate?.id === tmpl.id ? t.primary : t.border}`,
                background: selectedTemplate?.id === tmpl.id ? t.primaryLight : t.white,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{tmpl.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: t.text, marginBottom: '4px' }}>{tmpl.title}</div>
              <div style={{ fontSize: '12px', color: t.muted, lineHeight: '1.5' }}>{tmpl.description}</div>
            </div>
          ))}
        </div>

        {selectedTemplate && (
          <div style={{ background: t.surface, borderRadius: '10px', padding: '20px', border: `1px solid ${t.border}` }}>
            <h4 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 14px 0' }}>
              Configure: {selectedTemplate.title}
            </h4>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
              {selectedTemplate.type === 'contract' ? (
                <div style={s.flex()}>
                  <label style={{ fontSize: '13px', color: t.muted }}>Template:</label>
                  <select style={s.select} value={contractType} onChange={e => setContractType(e.target.value as 'b2b' | 'b2c')}>
                    <option value="b2b">Business to Business (B2B)</option>
                    <option value="b2c">Business to Consumer (B2C)</option>
                  </select>
                </div>
              ) : (
                <div style={s.flex()}>
                  <label style={{ fontSize: '13px', color: t.muted }}>Job:</label>
                  <select style={{ ...s.select, minWidth: '260px' }} value={selectedJob} onChange={e => setSelectedJob(e.target.value)}>
                    <option value="">Select a job…</option>
                    {SAMPLE_JOBS.map(j => <option key={j.id} value={j.id}>{j.id} — {j.customer} ({j.vehicle})</option>)}
                  </select>
                </div>
              )}
              <div style={{ flex: 1 }} />
              <button style={s.btn('secondary')}>👁 Preview</button>
              <button style={s.btn('primary')} onClick={handleGenerate} disabled={generating}>
                {generating ? '⏳ Generating…' : '📄 Generate PDF'}
              </button>
            </div>

            {generating && (
              <div style={{ textAlign: 'center', padding: '24px', background: t.primaryLight, borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px', animation: 'spin 1.5s linear infinite' }}>⚡</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: t.primary }}>Generating your document…</div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {generated && !generating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '28px' }}>✅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{generated.name}</div>
                  <div style={{ fontSize: '12px', color: t.muted }}>{DOC_TYPE_LABELS[generated.type]} • {generated.date} • Job: {generated.jobId}</div>
                </div>
                <button style={s.btn('secondary')}>👁 Preview</button>
                <button style={s.btn('primary')}>⬇ Download</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Document Library ─── */
function DocumentLibrary() {
  const [filter, setFilter] = useState<DocType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const filtered = SAMPLE_LIBRARY.filter(doc => {
    if (filter !== 'all' && doc.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        doc.name.toLowerCase().includes(q) ||
        (doc.customer?.toLowerCase().includes(q)) ||
        (doc.jobId?.toLowerCase().includes(q)) ||
        doc.date.includes(q)
      );
    }
    return true;
  });

  const filterOptions: { value: DocType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Documents' },
    { value: 'invoice', label: 'Invoices' },
    { value: 'receipt', label: 'Receipts' },
    { value: 'contract', label: 'Contracts' },
    { value: 'police_report', label: 'Police Reports' },
    { value: 'bill_of_lading', label: 'Bills of Lading' },
    { value: 'insurance_claim', label: 'Insurance Claims' },
  ];

  return (
    <div style={s.card}>
      <div style={{ ...s.flexBetween, marginBottom: '16px' }}>
        <div>
          <h3 style={s.sectionTitle}>Document Library</h3>
          <p style={s.sectionDesc}>All uploaded and generated documents in one place.</p>
        </div>
        <div style={s.flex()}>
          <select style={s.select} value={filter} onChange={e => setFilter(e.target.value as DocType | 'all')}>
            {filterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input style={{ ...s.input, width: '240px' }} placeholder="Search by name, job, customer, date…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
        {filtered.map(doc => (
          <div
            key={doc.id}
            style={{ padding: '16px', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.white, position: 'relative' }}
          >
            <div style={{ ...s.flex(), marginBottom: '10px' }}>
              <span style={{ fontSize: '22px' }}>{DOC_TYPE_ICONS[doc.type]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                <div style={{ fontSize: '11px', color: t.muted }}>{doc.date}</div>
              </div>
              <span style={s.badge(DOC_TYPE_COLORS[doc.type])}>{DOC_TYPE_LABELS[doc.type]}</span>
            </div>
            {doc.customer && <div style={{ fontSize: '12px', color: t.muted, marginBottom: '4px' }}>👤 {doc.customer}</div>}
            {doc.jobId && <div style={{ fontSize: '12px', color: t.muted, marginBottom: '8px' }}>🔧 {doc.jobId}</div>}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button style={{ ...s.btn('ghost'), padding: '4px 10px', fontSize: '12px' }}>👁 View</button>
              <button style={{ ...s.btn('ghost'), padding: '4px 10px', fontSize: '12px' }}>⬇ Download</button>
              <button style={{ ...s.btn('ghost'), padding: '4px 10px', fontSize: '12px' }}>🔗 Share</button>
            </div>
            <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
              <span style={{ fontSize: '10px', color: t.muted, background: doc.source === 'generated' ? '#ede8ff' : '#f0fdf4', padding: '2px 8px', borderRadius: '4px' }}>
                {doc.source === 'generated' ? 'Generated' : 'Uploaded'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: t.muted }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
          <div style={{ fontSize: '14px' }}>No documents found matching your criteria.</div>
        </div>
      )}
    </div>
  );
}

/* ─── AI Assistant ─── */
function AIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'ai', content: 'Hello! I\'m your AI document assistant. I can help you generate invoices, contracts, extract data from documents, and more. What do you need?', timestamp: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    const userMsg: ChatMessage = { id: 'u-' + Date.now(), role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      let response = '';
      const lower = msg.toLowerCase();
      if (lower.includes('invoice')) {
        response = 'I can help generate that invoice. I\'ve drafted an invoice for Job #1042 (John Martinez) — 2021 Toyota Camry tow on 07/18/2026. Base tow: $250, storage (2 days): $80, admin fee: $25. Total: $355. Would you like me to finalize and download the PDF?';
      } else if (lower.includes('contract')) {
        response = 'I\'ll set up a contract for you. For ABC Towing Corp, I recommend a B2B service agreement covering: hourly dispatch rates ($85/hr), monthly volume discounts (10% for 50+ tows), net-30 payment terms, and 90-day termination clause. Shall I generate it?';
      } else if (lower.includes('police') || lower.includes('report')) {
        response = 'I can summarize that police report for you. Key details: Incident #PD-2026-7741, Date: July 15, 2026 at 2:34 PM. Location: I-55 NB, Mile Marker 82. Vehicle: 2019 Ford F-150 (VIN: 1FTEW1EP5KFA34521). Single vehicle, no injuries. Tow dispatched from Highway Patrol request. Vehicle currently in storage at Lot B.';
      } else if (lower.includes('missing') || lower.includes('what doc')) {
        response = 'For Job #1044 (Mike\'s Auto Shop, 2020 Honda Civic), the following documents are still missing:\n\n• ❌ Signed authorization form\n• ❌ Insurance verification\n• ❌ Photo documentation (pre-tow)\n• ✅ Tow ticket (uploaded)\n\nWould you like me to generate the authorization form?';
      } else {
        response = `I understand you need help with: "${msg}". Let me process that request. I can generate documents, extract data from uploads, summarize reports, or check document status for any job. Could you provide a bit more detail — a job number or document type?`;
      }
      setMessages(prev => [...prev, { id: 'a-' + Date.now(), role: 'ai', content: response, timestamp: new Date().toISOString() }]);
      setTyping(false);
    }, 1200 + Math.random() * 800);
  };

  return (
    <div style={s.card}>
      <h3 style={s.sectionTitle}>AI Document Assistant</h3>
      <p style={s.sectionDesc}>Ask AI to help with documents — generate, summarize, extract, or check status.</p>

      {/* Quick prompts */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {QUICK_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSend(p)}
            style={{ ...s.btn('ghost'), fontSize: '12px', padding: '5px 12px', borderRadius: '999px', cursor: 'pointer' }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div style={{ background: t.surface, borderRadius: '10px', border: `1px solid ${t.border}`, padding: '16px', maxHeight: '400px', overflowY: 'auto', marginBottom: '12px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '12px' }}>
            <div style={{
              maxWidth: '75%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              background: msg.role === 'user' ? t.primary : t.white,
              color: msg.role === 'user' ? t.white : t.text,
              fontSize: '13px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              {msg.role === 'ai' && <div style={{ fontSize: '11px', color: t.primary, fontWeight: 600, marginBottom: '4px' }}>🤖 AI Assistant</div>}
              {msg.content}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '12px' }}>
            <div style={{ padding: '10px 14px', borderRadius: '12px 12px 12px 2px', background: t.white, fontSize: '13px', color: t.muted, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <span style={{ display: 'inline-flex', gap: '4px' }}>
                <span style={{ animation: 'blink 1.2s infinite 0s' }}>●</span>
                <span style={{ animation: 'blink 1.2s infinite 0.2s' }}>●</span>
                <span style={{ animation: 'blink 1.2s infinite 0.4s' }}>●</span>
              </span>
              <style>{`@keyframes blink { 0%,80%,100% { opacity: 0.2; } 40% { opacity: 1; } }`}</style>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          style={{ ...s.input, flex: 1 }}
          placeholder="Ask AI to help with documents…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
        />
        <button style={s.btn('primary')} onClick={() => handleSend()}>Send</button>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function AIDocsPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'generate' | 'library' | 'assistant'>('upload');

  const tabs = [
    { key: 'upload' as const, label: '📤 Upload & Extract' },
    { key: 'generate' as const, label: '📄 Generate' },
    { key: 'library' as const, label: '📚 Document Library' },
    { key: 'assistant' as const, label: '🤖 AI Assistant' },
  ];

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.h1}>AI Document Hub</h1>
        <p style={s.subtitle}>Upload, extract, generate, and manage all your towing documents with AI assistance.</p>
      </div>

      {/* Stats bar */}
      <div style={{ ...s.grid4, marginBottom: '24px' }}>
        {[
          { label: 'Documents Processed', value: '1,247', icon: '📄', color: t.primary },
          { label: 'AI Extractions', value: '892', icon: '⚡', color: t.success },
          { label: 'Generated Docs', value: '355', icon: '🖨️', color: t.info },
          { label: 'Pending Review', value: '12', icon: '⏳', color: t.warning },
        ].map((stat, i) => (
          <div key={i} style={{ ...s.card, padding: '16px 18px', margin: 0, display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: stat.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: t.text }}>{stat.value}</div>
              <div style={{ fontSize: '12px', color: t.muted }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {tabs.map(tab => (
          <button key={tab.key} style={s.tab(activeTab === tab.key)} onClick={() => setActiveTab(tab.key)}>{tab.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'upload' && <UploadExtract />}
      {activeTab === 'generate' && <GenerateDocs />}
      {activeTab === 'library' && <DocumentLibrary />}
      {activeTab === 'assistant' && <AIAssistant />}
    </div>
  );
}
