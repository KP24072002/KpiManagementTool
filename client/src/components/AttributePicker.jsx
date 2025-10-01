// client/src/components/AttributePicker.jsx
import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function AttributePicker({ kpiId, allAttributes = null, onSelect, onAdded }) {
  const [options, setOptions] = useState([]); // array of { id, name, count? }
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [count, setCount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Prefer props.allAttributes if provided by parent (KpiEdit).
    if (Array.isArray(allAttributes) && allAttributes.length > 0) {
      setOptions(allAttributes.map(a => ({ id: a.id, name: a.name, count: a.count })));
      return;
    }

    // Otherwise fetch global attributes from server.
    async function loadOptions() {
      setLoading(true);
      setError("");
      try {
        // Prefer /attributes (global). If your backend uses another path, change here.
        const res = await api.get("/attributes");
        const data = Array.isArray(res.data) ? res.data : [];
        // Ensure objects with id & name
        setOptions(data.map(d => ({ id: d.id ?? d.name, name: d.name ?? String(d), count: d.count })));
      } catch (err) {
        console.error("Failed to fetch attributes", err);
        setError("Failed to load attributes");
        // try fallback endpoint used previously (returns names)
        try {
          const res2 = await api.get("/kpis/attributes");
          const data2 = Array.isArray(res2.data) ? res2.data : [];
          setOptions(data2.map((n, i) => ({ id: n, name: n })));
        } catch (err2) {
          console.error("Fallback fetch failed", err2);
          setOptions([]);
        }
      } finally {
        setLoading(false);
      }
    }
    loadOptions();
  }, [allAttributes]);

  function selectedAttr() {
    if (!selectedId) return null;
    return options.find(o => String(o.id) === String(selectedId)) || null;
  }

  async function handleAttachExisting(e) {
    e && e.preventDefault();
    const attr = selectedAttr();
    if (!attr) return alert("Choose an existing attribute to attach.");
    // Call parent's handler; parent will attach it to KPI (POST /kpis/:id/attributes { attributeId })
    if (typeof onSelect === "function") onSelect(attr);
  }

  async function handleAddAndAttach(e) {
    e && e.preventDefault();
    if (!kpiId) return alert("KPI id required");
    const trimmed = (name || "").trim();
    if (!trimmed) return alert("Please enter an attribute name to add.");
    setSaving(true);
    try {
      const body = { name: trimmed };
      if (String(count || "").trim() !== "") body.count = Number(count);
      // This endpoint should create the attribute and attach it to the KPI (existing behavior).
      // If your backend separates creation and attaching, you can instead call a global POST /attributes
      // then call parent's onAdded or onSelect to attach. Adjust here if needed.
      const res = await api.post(`/kpis/${encodeURIComponent(kpiId)}/attributes`, body);
      const created = res.data;
      setName("");
      setCount("");
      // notify parent so it can refresh UI (KpiEdit expects onAdded to be called)
      if (typeof onAdded === "function") onAdded(created);
      // locally update options with the actual response from backend
      setOptions(prev => {
        const exists = prev.find(o => String(o.name).toLowerCase() === trimmed.toLowerCase());
        if (exists) return prev;
        const next = [...prev, { id: created.id, name: created.name, count: created.count }];
        next.sort((a,b)=>a.name.localeCompare(b.name));
        return next;
      });
      alert("Attribute added and attached to KPI.");
    } catch (err) {
      console.error("Add attribute failed", err);
      alert(err?.response?.data?.error || err?.message || "Add failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <label className="text-xs text-slate-500 dark:text-gray-400 block mb-1">Attach existing attribute</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={loading}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
          >
            <option value="" className="dark:bg-gray-700 dark:text-white">(choose existing)</option>
            {options.map(opt => (
              <option key={opt.id} value={opt.id} className="dark:bg-gray-700 dark:text-white">{opt.name}{opt.count !== undefined ? ` (${opt.count})` : ""}</option>
            ))}
          </select>
        </div>

        <div className="flex-shrink-0">
          <div className="text-xs block mb-1">&nbsp;</div>
          <button
            onClick={handleAttachExisting}
            disabled={!selectedId}
            className="px-3 py-2 bg-slate-100 dark:bg-gray-700 rounded text-sm text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-gray-600"
          >
            Attach
          </button>
        </div>
      </div>

      <div className="my-3 border-t pt-3">
        <div className="text-xs text-slate-500 dark:text-gray-400 mb-2">Or add a new attribute and attach it to this KPI</div>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={loading ? "Loading options..." : "New attribute name"}
            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
            aria-label="New attribute name"
          />
          <input
            value={count}
            onChange={(e) => setCount(e.target.value)}
            placeholder="Count (opt)"
            className="w-28 p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
            type="number"
            min="0"
          />
          <button
            onClick={handleAddAndAttach}
            disabled={saving || !kpiId}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {saving ? "Adding…" : "Add & Attach"}
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-500 dark:text-gray-400 mt-2">
        Tip: pick an existing attribute to reuse it across KPIs, or add a new one. {error ? `Error: ${error}` : ""}
      </div>
    </div>
  );
}
