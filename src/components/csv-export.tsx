"use client";

import { useState } from "react";

interface Props {
  data: Record<string, unknown>[];
  filename: string;
  label?: string;
}

export function CSVExportButton({ data, filename, label = "Export CSV" }: Props) {
  const [exporting, setExporting] = useState(false);

  const exportCSV = () => {
    setExporting(true);
    try {
      if (!data.length) return;
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(","),
        ...data.map(row => headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const str = String(val);
          return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(","))
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button onClick={exportCSV} disabled={exporting || !data.length}
      className="px-3 py-1.5 border border-[#e5edf5] rounded text-[12px] font-medium text-[#64748d] hover:bg-[#f6f9fc] hover:text-[#061b31] transition-colors disabled:opacity-50">
      📥 {exporting ? "Exporting..." : label}
    </button>
  );
}
