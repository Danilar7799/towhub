"use client";

import { useState, useEffect } from "react";

interface Expense {
  id: string; category: string; amount: number; description?: string;
  vehicleId?: string; driverId?: string; date: string;
}

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Expenses</h1>
        <button onClick={() => setShowAdd(true)} className="bg-blue-900 text-white px-5 py-2.5 rounded-xl font-bold">+ Add Expense</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <div className="text-sm text-gray-500">Total Expenses</div>
          <div className="text-2xl font-black">${total.toFixed(2)}</div>
        </div>
        {["fuel", "maintenance", "tolls", "other"].map(cat => (
          <div key={cat} className="bg-white rounded-xl border p-5">
            <div className="text-sm text-gray-500 capitalize">{cat}</div>
            <div className="text-2xl font-black">${(byCategory[cat] || 0).toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Expenses list */}
      {expenses.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="text-5xl mb-4">💸</div>
          <h2 className="text-xl font-bold mb-2">No expenses yet</h2>
          <p className="text-gray-500">Track fuel, maintenance, tolls, and other expenses.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Category</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Description</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Date</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 capitalize font-medium">{e.category}</td>
                  <td className="px-6 py-4 text-gray-500">{e.description || "—"}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right font-bold">${e.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black mb-6">Add Expense</h2>
            <form onSubmit={addExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-4 py-3 border rounded-xl">
                  {["fuel", "maintenance", "insurance", "tolls", "supplies", "other"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Amount *</label><input required type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Description</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 border rounded-xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-bold">Add Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
