// client/src/components/TargetRevisions.jsx
import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function TargetRevisions({ kpiId }) {
  const [revisions, setRevisions] = useState([]); // always array
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ targetValue: "", revisionDate: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (kpiId) fetchRevisions();
  }, [kpiId]);

  async function fetchRevisions() {
    setLoading(true);
    try {
      const res = await api.get(`/kpis/${encodeURIComponent(kpiId)}/revisions`);
      // ensure always an array
      const data = res.data;
      if (Array.isArray(data)) {
        setRevisions(data);
      } else if (data && Array.isArray(data.revisions)) {
        setRevisions(data.revisions);
      } else {
        setRevisions([]);
      }
    } catch (err) {
      console.error("Failed to fetch revisions", err);
      setRevisions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.targetValue.trim()) return alert("Target value required");
    setSaving(true);
    try {
      const res = await api.post(`/kpis/${encodeURIComponent(kpiId)}/revisions`, {
        targetValue: form.targetValue,
        revisionDate: form.revisionDate || null,
      });
      setRevisions(prev => [...prev, res.data]); // append new revision
      setForm({ targetValue: "", revisionDate: "" });
    } catch (err) {
      console.error("Add revision failed", err);
      alert(err?.response?.data?.error || err.message || "Add failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this revision?")) return;
    try {
      await api.delete(`/kpis/${encodeURIComponent(kpiId)}/revisions/${id}`);
      setRevisions(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Delete failed", err);
      alert("Delete failed");
    }
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold mb-2">Target Revisions</h4>

      {/* Add Form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-3">
        <input
          type="number"
          placeholder="Target Value"
          value={form.targetValue}
          onChange={e => setForm({ ...form, targetValue: e.target.value })}
          className="p-2 border rounded w-40"
          required
        />
        <input
          type="date"
          value={form.revisionDate}
          onChange={e => setForm({ ...form, revisionDate: e.target.value })}
          className="p-2 border rounded"
        />
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-2 bg-blue-600 text-white rounded"
        >
          {saving ? "Adding..." : "Add"}
        </button>
      </form>

      {/* Revisions Table */}
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Target Value</th>
              <th className="px-3 py-2 text-left">Revision Date</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-4 text-slate-500">Loading...</td>
              </tr>
            ) : revisions.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-slate-500 dark:text-gray-400">No revisions yet.</td>
              </tr>
            ) : (
              revisions.map((r, idx) => (
                <tr key={r.id} className={idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-slate-50 dark:bg-gray-700"}>
                  <td className="px-3 py-2 text-slate-800 dark:text-white">{idx + 1}</td>
                  <td className="px-3 py-2 text-slate-800 dark:text-white">{r.targetValue}</td>
                  <td className="px-3 py-2 text-slate-800 dark:text-white">{r.revisionDate || "—"}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded text-sm hover:bg-red-100 dark:hover:bg-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
