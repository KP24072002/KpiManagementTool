// client/src/components/ActionPlans.jsx
import React, { useEffect, useState } from "react";
import api from "../utils/api";

const STATUS_OPTIONS = ["Planned", "In Progress", "Completed", "Delay"];

/**
 * ActionPlans - Updated for new database schema
 */
export default function ActionPlans({ kpiId, onChange, readOnly = false }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Updated form state for new schema
  const initialForm = { 
    id: null, 
    planningDate: "", 
    description: "", 
    responsibility: "", 
    plannedCompletionDate: "", 
    actualCompletionDate: "", 
    currentStatus: "Planned" 
  };
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!kpiId) return;
    fetchActions();
  }, [kpiId]);

  async function fetchActions() {
    setLoading(true);
    try {
      const res = await api.get(`/kpis/${encodeURIComponent(kpiId)}/actions`);
      setActions(res.data || []);
    } catch (err) {
      console.error("Failed to fetch actions", err);
      setActions([]);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(action) {
    if (!action) return;
    setForm({
      id: action.id,
      planningDate: action.planningDate || "",
      description: action.description || "",
      responsibility: action.responsibility || "",
      plannedCompletionDate: action.plannedCompletionDate || "",
      actualCompletionDate: action.actualCompletionDate || "",
      currentStatus: action.currentStatus || "Planned"
    });
    const el = document.querySelector("#actionplans-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetForm() {
    setForm(initialForm);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.description || !form.description.trim()) return alert("Description required");
    setSaving(true);
    try {
      if (form.id) {
        const res = await api.put(`/kpis/${encodeURIComponent(kpiId)}/actions/${encodeURIComponent(form.id)}`, form);
        setActions(prev => prev.map(a => (a.id === res.data.id ? res.data : a)));
      } else {
        const res = await api.post(`/kpis/${encodeURIComponent(kpiId)}/actions`, form);
        setActions(prev => [...prev, res.data]);
      }
      resetForm();
      if (typeof onChange === "function") onChange();
    } catch (err) {
      console.error("Save action failed", err);
      alert(err?.response?.data?.error || err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(actionId) {
    if (!window.confirm("Delete this action?")) return;
    try {
      await api.delete(`/kpis/${encodeURIComponent(kpiId)}/actions/${encodeURIComponent(actionId)}`);
      setActions(prev => prev.filter(a => a.id !== actionId));
      if (typeof onChange === "function") onChange();
    } catch (err) {
      console.error("Delete failed", err);
      alert("Delete failed");
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-white">Action Plans</h4>
        <div className="text-xs text-slate-400 dark:text-gray-500">Total: {actions.length}</div>
      </div>

      <div className="overflow-auto border rounded border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-gray-700">
            <tr>
              <th className="px-3 py-2 text-left w-16 text-slate-700 dark:text-gray-300">Plan No.</th>
              <th className="px-3 py-2 text-left w-28 text-slate-700 dark:text-gray-300">Planning Date</th>
              <th className="px-3 py-2 text-left text-slate-700 dark:text-gray-300">Description</th>
              <th className="px-3 py-2 text-left w-32 text-slate-700 dark:text-gray-300">Responsibility</th>
              <th className="px-3 py-2 text-left w-32 text-slate-700 dark:text-gray-300">Planned Date</th>
              <th className="px-3 py-2 text-left w-32 text-slate-700 dark:text-gray-300">Actual Date</th>
              <th className="px-3 py-2 text-left w-28 text-slate-700 dark:text-gray-300">Status</th>
              {!readOnly && <th className="px-3 py-2 text-left w-32 text-slate-700 dark:text-gray-300">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={readOnly ? 7 : 8} className="p-4 text-sm text-slate-500 dark:text-gray-400">Loading...</td></tr>
            ) : actions.length === 0 ? (
              <tr><td colSpan={readOnly ? 7 : 8} className="p-4 text-sm text-slate-500 dark:text-gray-400">No action plans yet.</td></tr>
            ) : (
              actions.map((a, idx) => (
                <tr key={a.id} className={idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-slate-50 dark:bg-gray-700"}>
                  <td className="px-3 py-2 align-top text-slate-800 dark:text-white">{a.actionPlanNo || (idx + 1)}</td>
                  <td className="px-3 py-2 align-top text-slate-800 dark:text-white">{a.planningDate || "—"}</td>
                  <td className="px-3 py-2 align-top text-slate-800 dark:text-white">{a.description}</td>
                  <td className="px-3 py-2 align-top text-slate-800 dark:text-white">{a.responsibility || "—"}</td>
                  <td className="px-3 py-2 align-top text-slate-800 dark:text-white">{a.plannedCompletionDate || "—"}</td>
                  <td className="px-3 py-2 align-top text-slate-800 dark:text-white">{a.actualCompletionDate || "—"}</td>
                  <td className="px-3 py-2 align-top">
                    <span className={`px-2 py-1 rounded text-xs ${
                      a.currentStatus === "Completed" ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" :
                      a.currentStatus === "In Progress" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300" :
                      a.currentStatus === "Delay" ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300" :
                      "bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300"
                    }`}>
                      {a.currentStatus || "Planned"}
                    </span>
                  </td>
                  {!readOnly && (
                    <td className="px-3 py-2 align-top">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(a)} className="px-2 py-1 bg-slate-100 dark:bg-gray-600 rounded text-xs text-slate-800 dark:text-white">Edit</button>
                        <button onClick={() => handleDelete(a.id)} className="px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded text-xs">Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <form id="actionplans-form" onSubmit={handleSave} className="mt-3 bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            <div>
              <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Planning Date</label>
              <input
                type="date"
                value={form.planningDate || ""}
                onChange={(e) => setForm({ ...form, planningDate: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Description *</label>
              <input
                placeholder="Action plan description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Responsibility</label>
              <input
                placeholder="Responsibility"
                value={form.responsibility}
                onChange={(e) => setForm({ ...form, responsibility: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Planned Date</label>
              <input
                type="date"
                value={form.plannedCompletionDate || ""}
                onChange={(e) => setForm({ ...form, plannedCompletionDate: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Actual Date</label>
              <input
                type="date"
                value={form.actualCompletionDate || ""}
                onChange={(e) => setForm({ ...form, actualCompletionDate: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1">Status</label>
              <select 
                value={form.currentStatus} 
                onChange={(e) => setForm({ ...form, currentStatus: e.target.value })} 
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s} className="dark:bg-gray-700 dark:text-white">{s}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button type="button" onClick={resetForm} className="px-3 py-2 bg-slate-100 dark:bg-gray-700 rounded text-sm text-slate-800 dark:text-white">Clear</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              {saving ? "Saving..." : (form.id ? "Save Changes" : "Add Action")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}