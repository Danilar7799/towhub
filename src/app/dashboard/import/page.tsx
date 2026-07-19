"use client";

import { useState, useRef } from "react";

type ImportType = "customers" | "jobs" | "fleet" | "drivers";

const IMPORT_TYPES: { value: ImportType; label: string; icon: string; desc: string }[] = [
  { value: "customers", label: "Customers", icon: "👤", desc: "Name, email, phone, company, address" },
  { value: "jobs", label: "Jobs", icon: "📋", desc: "Customer, pickup, destination, vehicle, pricing" },
  { value: "fleet", label: "Fleet", icon: "🚛", desc: "Name, type, make, model, year, plate" },
  { value: "drivers", label: "Drivers", icon: "🧑‍✈️", desc: "First name, last name, email, phone, role" },
];

const SAMPLE_HEADERS: Record<ImportType, string> = {
  customers: "Name,Email,Phone,Company,Address,City,State,Zip,Notes",
  jobs: "Customer Name,Customer Phone,Pickup Address,Destination,Make,Model,Year,Color,Plate,Miles,Base Rate,Mileage Rate,Total,Status,Notes",
  fleet: "Name,Type,Make,Model,Year,License Plate,Color,VIN,Capacity,Mileage",
  drivers: "First Name,Last Name,Email,Phone,Role,Password",
};

export default function ImportExportPage() {
  const [type, setType] = useState<ImportType>("customers");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported?: number; skipped?: number; errors?: string[]; message?: string; success?: boolean } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      setResult(data);
      if (data.success) setFile(null);
    } catch (e) {
      setResult({ errors: ["Network error — please try again"] });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (exportType: string) => {
    setExporting(exportType);
    try {
      const res = await fetch(`/api/export?type=${exportType}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `towhub_${exportType}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed");
    } finally {
      setExporting(null);
    }
  };

  const downloadTemplate = () => {
    const content = SAMPLE_HEADERS[type];
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `towhub_${type}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" style={{ fontFeatureSettings: "'ss01'" }}>
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Import & Export</h2>
        <p className="text-[13px] text-[#64748d] mt-0.5">Bulk import data from CSV or export your data</p>
      </div>

      {/* Import Section */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[15px] font-semibold text-[#061b31] mb-1">📥 Import Data</div>
        <div className="text-[13px] text-[#64748d] mb-5">Upload a CSV file to bulk import customers, jobs, fleet, or drivers</div>

        {/* Type selector */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {IMPORT_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => { setType(t.value); setFile(null); setResult(null); }}
              className={`p-4 rounded-lg border text-left transition-all ${
                type === t.value
                  ? "border-[#533afd] bg-[#533afd]/[0.04] shadow-[0_2px_8px_rgba(83,58,253,0.1)]"
                  : "border-[#e5edf5] hover:border-[#b9b9f9]"
              }`}
            >
              <div className="text-[20px] mb-2">{t.icon}</div>
              <div className="text-[13px] font-medium text-[#061b31]">{t.label}</div>
              <div className="text-[11px] text-[#64748d] mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            const dropped = e.dataTransfer.files[0];
            if (dropped && dropped.name.endsWith(".csv")) setFile(dropped);
          }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver ? "border-[#533afd] bg-[#533afd]/[0.04]" : "border-[#e5edf5] hover:border-[#b9b9f9]"
          }`}
        >
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
          {file ? (
            <div>
              <div className="text-[32px] mb-2">📄</div>
              <div className="text-[14px] font-medium text-[#061b31]">{file.name}</div>
              <div className="text-[12px] text-[#64748d]">{(file.size / 1024).toFixed(1)} KB</div>
              <button onClick={e => { e.stopPropagation(); setFile(null); }} className="text-[12px] text-[#dc2626] mt-2 hover:underline">Remove</button>
            </div>
          ) : (
            <div>
              <div className="text-[32px] mb-2 opacity-30">📁</div>
              <div className="text-[14px] text-[#64748d]">Drop CSV file here or click to browse</div>
              <div className="text-[12px] text-[#94a3b8] mt-1">Supports .csv files up to 10MB</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="bg-[#533afd] text-white px-5 py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4] disabled:opacity-50 transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.2)]"
          >
            {importing ? "Importing..." : `Import ${type}`}
          </button>
          <button onClick={downloadTemplate} className="text-[13px] text-[#533afd] font-medium hover:underline">
            📥 Download template
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className={`mt-4 p-4 rounded-lg border ${result.success ? "bg-[#dcfce7] border-[#bbf7d0]" : "bg-[#fef2f2] border-[#fecaca]"}`}>
            <div className={`text-[13px] font-medium ${result.success ? "text-[#166534]" : "text-[#991b1b]"}`}>
              {result.message || (result.errors?.[0] || "Import failed")}
            </div>
            {result.success && (
              <div className="text-[12px] text-[#166534] mt-1">
                ✅ {result.imported} imported • ⚠️ {result.skipped} skipped
              </div>
            )}
            {result.errors && result.errors.length > 0 && (
              <details className="mt-2">
                <summary className="text-[12px] text-[#991b1b] cursor-pointer">View errors ({result.errors.length})</summary>
                <div className="mt-1 space-y-0.5">
                  {result.errors.map((e, i) => <div key={i} className="text-[11px] text-[#991b1b]">• {e}</div>)}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[15px] font-semibold text-[#061b31] mb-1">📤 Export Data</div>
        <div className="text-[13px] text-[#64748d] mb-5">Download your data as CSV files</div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { type: "jobs", label: "Jobs", icon: "📋" },
            { type: "customers", label: "Customers", icon: "👤" },
            { type: "expenses", label: "Expenses", icon: "💰" },
            { type: "invoices", label: "Invoices", icon: "📄" },
          ].map(e => (
            <button
              key={e.type}
              onClick={() => handleExport(e.type)}
              disabled={exporting === e.type}
              className="p-4 rounded-lg border border-[#e5edf5] hover:border-[#b9b9f9] hover:bg-[#533afd]/[0.02] transition-all text-left disabled:opacity-50"
            >
              <div className="text-[20px] mb-2">{e.icon}</div>
              <div className="text-[13px] font-medium text-[#061b31]">{exporting === e.type ? "Exporting..." : `Export ${e.label}`}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Migration from other systems */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[15px] font-semibold text-[#061b31] mb-1">🔄 Migrate from Another System</div>
        <div className="text-[13px] text-[#64748d] mb-5">Switching from another towing software? We can help migrate your data.</div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { name: "TowBook", icon: "📘" },
            { name: "Dispatch Anywhere", icon: "📡" },
            { name: "Custom / Other", icon: "📋" },
          ].map(sys => (
            <div key={sys.name} className="p-4 rounded-lg border border-[#e5edf5] hover:border-[#b9b9f9] transition-colors">
              <div className="text-[20px] mb-2">{sys.icon}</div>
              <div className="text-[13px] font-medium text-[#061b31]">{sys.name}</div>
              <div className="text-[12px] text-[#64748d] mt-1">
                {sys.name === "Custom / Other" ? "Upload CSV using templates above" : "Export CSV from their system → import here"}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-[#f6f9fc] rounded-lg">
          <div className="text-[13px] font-medium text-[#061b31] mb-2">💡 How migration works:</div>
          <ol className="text-[12px] text-[#64748d] space-y-1 list-decimal list-inside">
            <li>Export your data from the old system as CSV</li>
            <li>Download our CSV template to see expected format</li>
            <li>Map your columns to match our template</li>
            <li>Upload here — we auto-detect common column names</li>
            <li>Review import results and fix any errors</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
