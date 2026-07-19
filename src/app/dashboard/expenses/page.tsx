"use client";

import { useState, useEffect } from "react";

interface Expense {
  id: string; category: string; amount: number; description?: string;
  vehicleId?: string; driverId?: string; date: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  fuel: "⛽", maintenance: "🔧", insurance: "🛡️", tolls: "🛣️", supplies: "📦", other: "📋",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: "fuel", amount: "", description: "", date: "" });

  const load = () => fetch("/api/expenses").then(r => r.json()).then(d => setExpenses(d.expenses || []));
  useEffect(() => { load(); }, []);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {} as Record<string, number>);

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowAdd(false); setForm({ category: "fuel", amount: "", description: "", date: "" }); load(); }
  };

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Expenses</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Track fuel, maintenance, tolls, and more</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.2)]">
          + Add Expense
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
          <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">Total Expenses</div>
          <div className="text-[28px] font-light tracking-[-0.5px]">${total.toFixed(0)}</div>
        </div>
        {["fuel", "maintenance", "tolls"].map(cat => (
          <div key={cat} className="bg-white border border-[#e5edf5] rounded-lg p-5">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1 capitalize">{cat}</div>
            <div className="text-[28px] font-light tracking-[-0.5px]">${(byCategory[cat] || 0).toFixed(0)}</div>
          </div>
        ))}
      </div>

      {/* Expenses table */}
      {expenses.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">💸</div>
          <div className="text-[14px] text-[#64748d]">No expenses tracked yet.</div>
          <div className="text-[12px] text-[#94a3b8] mt-1">Add fuel, maintenance, and other expenses</div>
        </div>
      ) : (
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
              <tr>
                {["Category", "Description", "Date", "Amount"].map(h => (
                  <th key={h} className={`text-left px-5 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wider ${h === "Amount" ? "!text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5edf5]">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-[#f6f9fc]">
                  <td className="px-5 py-3">
                    <span className="text-[13px] font-medium text-[#061b31] capitalize">{CATEGORY_ICONS[e.category] || "📋"} {e.category}</span>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-[#64748d]">{e.description || "—"}</td>
                  <td className="px-5 py-3 text-[13px] text-[#64748d]">{new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  <td className="px-5 py-3 text-[14px] font-semibold text-right">${e.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold tracking-[-0.3px] mb-6">Add Expense</h2>
            <form onSubmit={addExpense} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Category *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none">
                  {["fuel", "maintenance", "insurance", "tolls", "supplies", "other"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Amount *</label>
                <input required type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
                <button type="submit" className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4]">Add Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
