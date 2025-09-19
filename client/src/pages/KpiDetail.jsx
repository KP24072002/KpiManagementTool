// client/src/pages/KpiDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";

/**
 * KpiDetail page
 * Route: /kpi/:kpiId
 *
 * Features:
 * - GET /kpis/:kpiId to load KPI
 * - Edit metadata (PUT /kpis/:kpiId)
 * - Upload file (POST /uploads/:kpiId/upload) and show preview (GET /uploads/:kpiId/preview)
 * - Manage attributes (POST/PUT/DELETE /kpis/:kpiId/attributes ...)
 * - Manage action plans (GET/POST/PUT/DELETE /kpis/:kpiId/actions ...)
 */

function Loading({ text = "Loading..." }) {
  return <div className="p-4 bg-white rounded shadow-sm text-sm text-slate-500">{text}</div>;
}

function parseDateDisplay(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString();
}

export default function KpiDetail() {
  const { kpiId } = useParams();
  const navigate = useNavigate();

  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState({ headers: [], rows: [] });
  const [error, setError] = useState(null);

  // edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [meta, setMeta] = useState({
    name: "",
    description: "",
    owner: "",
    action: "maintain",
    presentValue: "",
    targetValue: "",
    targetLowerValue: "",
    targetUpperValue: "",
    unit: "",
    deadline: "",
    targetRevisionDate: ""
  });
  const [savingMeta, setSavingMeta] = useState(false);

  // attributes
  const [attributes, setAttributes] = useState([]);
  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrCount, setNewAttrCount] = useState(0);
  const [attrSaving, setAttrSaving] = useState(false);

  // actions
  const [actions, setActions] = useState([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [newAction, setNewAction] = useState({ description: "", deadline: "", responsibility: "", status: "Planned" });
  const [actionSaving, setActionSaving] = useState(false);

  // file upload
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadKpi();
    // eslint-disable-next-line
  }, [kpiId]);

  async function loadKpi() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/kpis/${encodeURIComponent(kpiId)}`);
      setKpi(res.data);
      // set meta fields
      setMeta({
        name: res.data.name || "",
        description: res.data.description || "",
        owner: res.data.owner || "",
        action: res.data.action || "maintain",
        presentValue: res.data.presentValue !== undefined && res.data.presentValue !== null ? String(res.data.presentValue) : "",
        targetValue: res.data.targetValue !== undefined && res.data.targetValue !== null ? String(res.data.targetValue) : "",
        targetLowerValue: res.data.targetLowerValue !== undefined && res.data.targetLowerValue !== null ? String(res.data.targetLowerValue) : "",
        targetUpperValue: res.data.targetUpperValue !== undefined && res.data.targetUpperValue !== null ? String(res.data.targetUpperValue) : "",
        unit: res.data.unit || "",
        deadline: res.data.deadline || "",
        targetRevisionDate: res.data.targetRevisionDate || ""
      });
      setAttributes(Array.isArray(res.data.attributes) ? res.data.attributes : []);
    } catch (err) {
      console.error("Failed to load KPI", err);
      setError(err?.response?.data?.error || err?.message || "Failed to load KPI");
    } finally {
      setLoading(false);
      fetchPreview();
      fetchActions();
    }
  }

  async function fetchPreview(limit = 10) {
    setLoadingPreview(true);
    try {
      const res = await api.get(`/uploads/${encodeURIComponent(kpiId)}/preview?limit=${encodeURIComponent(limit)}`);
      const data = res.data || { headers: [], rows: [] };
      setPreview({ headers: Array.isArray(data.headers) ? data.headers : [], rows: Array.isArray(data.rows) ? data.rows : [] });
    } catch (err) {
      console.error("Failed to fetch preview", err);
      setPreview({ headers: [], rows: [] });
    } finally {
      setLoadingPreview(false);
    }
  }

  async function fetchActions() {
    setLoadingActions(true);
    try {
      const res = await api.get(`/kpis/${encodeURIComponent(kpiId)}/actions`);
      setActions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch actions", err);
      setActions([]);
    } finally {
      setLoadingActions(false);
    }
  }

  /* ----------------- Metadata Save ----------------- */
  function validateMeta(m) {
    if (!m.name || !m.name.trim()) return "Name is required";
    if (m.presentValue !== "" && isNaN(Number(m.presentValue))) return "Present value must be numeric";
    if (m.targetValue !== "" && isNaN(Number(m.targetValue))) return "Target value must be numeric";
    if (m.targetLowerValue !== "" && isNaN(Number(m.targetLowerValue))) return "Target lower value must be numeric";
    if (m.targetUpperValue !== "" && isNaN(Number(m.targetUpperValue))) return "Target upper value must be numeric";
    return null;
  }

  async function handleSaveMeta() {
    const v = validateMeta(meta);
    if (v) return alert(v);
    setSavingMeta(true);
    try {
      const payload = {
        name: String(meta.name).trim(),
        description: meta.description ? String(meta.description).trim() : "",
        owner: meta.owner ? String(meta.owner).trim() : "",
        action: meta.action || "maintain",
        presentValue: meta.presentValue === "" ? null : Number(meta.presentValue),
        targetValue: meta.targetValue === "" ? null : Number(meta.targetValue),
        targetLowerValue: meta.targetLowerValue === "" ? null : Number(meta.targetLowerValue),
        targetUpperValue: meta.targetUpperValue === "" ? null : Number(meta.targetUpperValue),
        unit: meta.unit ? String(meta.unit).trim() : "",
        deadline: meta.deadline ? String(meta.deadline) : null,
        targetRevisionDate: meta.targetRevisionDate ? String(meta.targetRevisionDate) : null
      };
      const res = await api.put(`/kpis/${encodeURIComponent(kpiId)}`, payload);
      setKpi(res.data || { ...kpi, ...payload });
      setIsEditing(false);
      alert("Saved");
    } catch (err) {
      console.error("Save meta failed", err);
      alert(err?.response?.data?.error || err?.message || "Save failed");
    } finally {
      setSavingMeta(false);
    }
  }

  /* ----------------- File upload ----------------- */
  async function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const f = new FormData();
      f.append("file", file);
      await api.post(`/uploads/${encodeURIComponent(kpiId)}/upload`, f, { headers: { "Content-Type": "multipart/form-data" } });
      await fetchPreview(10);
      alert("Upload successful");
    } catch (err) {
      console.error("Upload failed", err);
      alert(err?.response?.data?.error || err?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  }

  /* ----------------- Attributes ----------------- */
  async function handleAddAttribute() {
    const name = (newAttrName || "").trim();
    if (!name) return alert("Attribute name required");
    const cnt = Number(newAttrCount);
    if (!Number.isInteger(cnt) || cnt < 0) return alert("count must be a non-negative integer");
    setAttrSaving(true);
    try {
      const res = await api.post(`/kpis/${encodeURIComponent(kpiId)}/attributes`, { name, count: cnt });
      setAttributes(prev => [...prev, res.data]);
      setNewAttrName("");
      setNewAttrCount(0);
      alert("Attribute added");
      await fetchPreview();
    } catch (err) {
      console.error("Add attribute failed", err);
      alert(err?.response?.data?.error || err?.message || "Add attribute failed");
    } finally {
      setAttrSaving(false);
    }
  }

  async function handleEditAttribute(attrId, name, count) {
    if (!name || !name.trim()) return alert("Name required");
    const cnt = Number(count);
    if (!Number.isInteger(cnt) || cnt < 0) return alert("count must be a non-negative integer");
    try {
      const res = await api.put(`/kpis/${encodeURIComponent(kpiId)}/attributes/${encodeURIComponent(attrId)}`, { name: String(name).trim(), count: cnt });
      setAttributes(prev => prev.map(a => a.id === attrId ? res.data : a));
      alert("Saved");
      await fetchPreview();
    } catch (err) {
      console.error("Edit attribute failed", err);
      alert(err?.response?.data?.error || err?.message || "Edit failed");
    }
  }

  async function handleDeleteAttribute(attrId) {
    if (!window.confirm("Delete attribute?")) return;
    try {
      await api.delete(`/kpis/${encodeURIComponent(kpiId)}/attributes/${encodeURIComponent(attrId)}`);
      setAttributes(prev => prev.filter(a => a.id !== attrId));
      alert("Deleted");
      await fetchPreview();
    } catch (err) {
      console.error("Delete attribute failed", err);
      alert(err?.response?.data?.error || err?.message || "Delete failed");
    }
  }

  /* ----------------- Actions (Action Plans) ----------------- */
  async function handleAddAction() {
    const desc = (newAction.description || "").trim();
    if (!desc) return alert("Description required");
    setActionSaving(true);
    try {
      const res = await api.post(`/kpis/${encodeURIComponent(kpiId)}/actions`, {
        description: desc,
        deadline: newAction.deadline || null,
        responsibility: newAction.responsibility || "",
        status: newAction.status || "Planned"
      });
      setActions(prev => [...prev, res.data]);
      setNewAction({ description: "", deadline: "", responsibility: "", status: "Planned" });
      alert("Action added");
    } catch (err) {
      console.error("Add action failed", err);
      alert(err?.response?.data?.error || err?.message || "Add action failed");
    } finally {
      setActionSaving(false);
    }
  }

  async function handleUpdateAction(actionId, patch) {
    try {
      const res = await api.put(`/kpis/${encodeURIComponent(kpiId)}/actions/${encodeURIComponent(actionId)}`, patch);
      setActions(prev => prev.map(a => a.id === actionId ? res.data : a));
    } catch (err) {
      console.error("Update action failed", err);
      alert(err?.response?.data?.error || err?.message || "Update failed");
    }
  }

  async function handleDeleteAction(actionId) {
    if (!window.confirm("Delete action?")) return;
    try {
      await api.delete(`/kpis/${encodeURIComponent(kpiId)}/actions/${encodeURIComponent(actionId)}`);
      setActions(prev => prev.filter(a => a.id !== actionId));
    } catch (err) {
      console.error("Delete action failed", err);
      alert(err?.response?.data?.error || err?.message || "Delete failed");
    }
  }

  /* ----------------- Render ----------------- */
  if (loading) return <Loading text="Loading KPI..." />;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;
  if (!kpi) return <div className="p-4">KPI not found</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600 mr-3">← Back</button>
          <h1 className="text-2xl font-bold">{kpi.name}</h1>
          <div className="text-sm text-slate-600 mt-1">ID: <code className="text-xs">{kpi.id}</code></div>
        </div>

        <div className="flex gap-2 items-center">
          <label className="px-3 py-1 bg-slate-100 rounded text-sm cursor-pointer">
            {uploading ? "Uploading..." : "Upload File"}
            <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFileChange} className="hidden" />
          </label>

          <button onClick={() => window.dispatchEvent(new CustomEvent("openChart", { detail: { kpiId: kpi.id } }))} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Create Chart</button>
        </div>
      </div>

      {/* Metadata / Edit */}
      <div className="bg-white rounded shadow-sm p-4">
        {!isEditing ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-slate-500">Owner</div>
                <div className="mt-1">{kpi.owner || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Action</div>
                <div className="mt-1">{kpi.action || "maintain"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Unit / Location</div>
                <div className="mt-1">{kpi.unit || "—"}</div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Present value</div>
                <div className="mt-1">{kpi.presentValue !== null && kpi.presentValue !== undefined ? String(kpi.presentValue) : "—"}</div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Target value</div>
                <div className="mt-1">
                  {kpi.targetValue !== null && kpi.targetValue !== undefined ? String(kpi.targetValue) : (kpi.targetLowerValue !== null || kpi.targetUpperValue !== null) ? `${kpi.targetLowerValue ?? "—"} — ${kpi.targetUpperValue ?? "—"}` : "—"}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Deadline</div>
                <div className="mt-1">{kpi.deadline ? parseDateDisplay(kpi.deadline) : "—"}</div>
              </div>

              <div className="md:col-span-3 mt-3">
                <div className="text-xs text-slate-500">Description</div>
                <div className="mt-1 text-sm text-slate-700">{kpi.description || "—"}</div>
              </div>
            </div>

            <div className="mt-4">
              <button onClick={() => setIsEditing(true)} className="px-3 py-1 bg-slate-100 rounded text-sm">Edit metadata</button>
              <button onClick={() => { navigator.clipboard?.writeText(kpi.id); alert("Copied id"); }} className="ml-2 px-3 py-1 bg-slate-100 rounded text-sm">Copy id</button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-500">Name</label>
                <input value={meta.name} onChange={(e) => setMeta(m => ({ ...m, name: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Action</label>
                <select value={meta.action} onChange={(e) => setMeta(m => ({ ...m, action: e.target.value }))} className="mt-1 p-2 border rounded w-full">
                  <option value="increase">Increase</option>
                  <option value="decrease">Decrease</option>
                  <option value="maintain">Maintain</option>
                  <option value="maximize">Maximize</option>
                  <option value="minimize">Minimize</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Owner</label>
                <input value={meta.owner} onChange={(e) => setMeta(m => ({ ...m, owner: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
              </div>

              <div>
                <label className="text-xs text-slate-500">Present value</label>
                <input value={meta.presentValue} onChange={(e) => setMeta(m => ({ ...m, presentValue: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
              </div>

              <div>
                <label className="text-xs text-slate-500">Target value (single)</label>
                <input value={meta.targetValue} onChange={(e) => setMeta(m => ({ ...m, targetValue: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
              </div>

              <div>
                <label className="text-xs text-slate-500">Unit</label>
                <input value={meta.unit} onChange={(e) => setMeta(m => ({ ...m, unit: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
              </div>

              <div>
                <label className="text-xs text-slate-500">Target lower</label>
                <input value={meta.targetLowerValue} onChange={(e) => setMeta(m => ({ ...m, targetLowerValue: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
              </div>

              <div>
                <label className="text-xs text-slate-500">Target upper</label>
                <input value={meta.targetUpperValue} onChange={(e) => setMeta(m => ({ ...m, targetUpperValue: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
              </div>

              <div>
                <label className="text-xs text-slate-500">Deadline</label>
                <input type="date" value={meta.deadline || ""} onChange={(e) => setMeta(m => ({ ...m, deadline: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
              </div>

              <div>
                <label className="text-xs text-slate-500">Target revision date</label>
                <input type="date" value={meta.targetRevisionDate || ""} onChange={(e) => setMeta(m => ({ ...m, targetRevisionDate: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
              </div>

              <div className="md:col-span-3">
                <label className="text-xs text-slate-500">Description</label>
                <textarea value={meta.description} onChange={(e) => setMeta(m => ({ ...m, description: e.target.value }))} className="mt-1 p-2 border rounded w-full h-28" />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={handleSaveMeta} disabled={savingMeta} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">{savingMeta ? "Saving..." : "Save"}</button>
              <button onClick={() => { setIsEditing(false); loadKpi(); }} className="px-3 py-1 bg-slate-100 rounded text-sm">Cancel</button>
            </div>
          </>
        )}
      </div>

      {/* Preview */}
      <div className="bg-white rounded shadow-sm p-4">
        <div className="flex items-center justify-between">
          <strong>Preview (last 10 rows)</strong>
          <div>
            <button onClick={() => fetchPreview(10)} className="px-2 py-1 bg-slate-100 rounded text-sm">Refresh</button>
          </div>
        </div>

        {loadingPreview ? (
          <Loading text="Loading preview..." />
        ) : preview.rows.length === 0 ? (
          <div className="mt-3 text-sm text-slate-500">No data uploaded yet.</div>
        ) : (
          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {preview.headers.map((h, i) => <th key={i} className="px-2 py-1 text-left">{h || `(col ${i})`}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(-10).reverse().map((r, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    {preview.headers.map((_, ci) => <td key={ci} className="px-2 py-1 align-top">{String((r && r[ci]) ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attributes */}
      <div className="bg-white rounded shadow-sm p-4">
        <div className="flex items-center justify-between">
          <strong>Attributes</strong>
          <div className="text-xs text-slate-500">Used for root-cause dropdowns</div>
        </div>

        <div className="mt-3">
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Count</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attributes.map((a, idx) => (
                  <AttrRow key={a.id} attr={a} idx={idx} onSave={(name, count) => handleEditAttribute(a.id, name, count)} onDelete={() => handleDeleteAttribute(a.id)} />
                ))}
                {attributes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-sm text-slate-500">No attributes yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex gap-2">
            <input placeholder="Attribute name" value={newAttrName} onChange={(e) => setNewAttrName(e.target.value)} className="p-2 border rounded w-full" />
            <input type="number" min={0} value={newAttrCount} onChange={(e) => setNewAttrCount(e.target.value)} className="p-2 border rounded w-36" />
            <button onClick={handleAddAttribute} disabled={attrSaving} className="px-3 py-1 bg-blue-600 text-white rounded">{attrSaving ? "Adding..." : "Add"}</button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded shadow-sm p-4">
        <div className="flex items-center justify-between">
          <strong>Action Plans</strong>
          <div className="text-xs text-slate-500">Create and track actions for this KPI</div>
        </div>

        <div className="mt-3 space-y-2">
          {loadingActions ? <Loading text="Loading actions..." /> : actions.length === 0 ? <div className="text-sm text-slate-500">No actions yet.</div> : (
            actions.map(a => (
              <ActionRow key={a.id} action={a} onUpdate={(patch) => handleUpdateAction(a.id, patch)} onDelete={() => handleDeleteAction(a.id)} />
            ))
          )}
        </div>

        <div className="mt-4 border-t pt-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <textarea value={newAction.description} onChange={(e) => setNewAction(prev => ({ ...prev, description: e.target.value }))} placeholder="Description" className="p-2 border rounded md:col-span-2" />
            <input type="date" value={newAction.deadline} onChange={(e) => setNewAction(prev => ({ ...prev, deadline: e.target.value }))} className="p-2 border rounded" />
            <input placeholder="Responsibility" value={newAction.responsibility} onChange={(e) => setNewAction(prev => ({ ...prev, responsibility: e.target.value }))} className="p-2 border rounded" />
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button onClick={() => setNewAction({ description: "", deadline: "", responsibility: "", status: "Planned" })} className="px-3 py-1 bg-slate-100 rounded">Reset</button>
            <button onClick={handleAddAction} disabled={actionSaving} className="px-3 py-1 bg-emerald-600 text-white rounded">{actionSaving ? "Adding..." : "Add action"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Helper subcomponents ----------------- */

function AttrRow({ attr, idx, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(attr.name || "");
  const [count, setCount] = useState(attr.count || 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(attr.name || "");
    setCount(attr.count || 0);
  }, [attr]);

  async function save() {
    setSaving(true);
    try {
      await onSave(name, count);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
      <td className="px-3 py-2 align-top">{idx + 1}</td>
      <td className="px-3 py-2 align-top">
        {editing ? <input className="p-1 border rounded w-full" value={name} onChange={(e) => setName(e.target.value)} /> : <div>{attr.name}</div>}
      </td>
      <td className="px-3 py-2 align-top w-36">
        {editing ? <input type="number" className="p-1 border rounded w-full" value={count} onChange={(e) => setCount(e.target.value)} /> : <div>{attr.count ?? 0}</div>}
      </td>
      <td className="px-3 py-2 align-top">
        {editing ? (
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => { setEditing(false); setName(attr.name || ""); setCount(attr.count || 0); }} className="px-2 py-1 bg-slate-100 rounded text-sm">Cancel</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="px-2 py-1 bg-slate-100 rounded text-sm">Edit</button>
            <button onClick={onDelete} className="px-2 py-1 bg-red-100 text-red-600 rounded text-sm">Delete</button>
          </div>
        )}
      </td>
    </tr>
  );
}

function ActionRow({ action, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    description: action.description || "",
    deadline: action.deadline || "",
    responsibility: action.responsibility || "",
    status: action.status || "Planned"
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      description: action.description || "",
      deadline: action.deadline || "",
      responsibility: action.responsibility || "",
      status: action.status || "Planned"
    });
  }, [action]);

  async function save() {
    setSaving(true);
    try {
      await onUpdate({ description: form.description, deadline: form.deadline || null, responsibility: form.responsibility, status: form.status });
      setEditing(false);
    } catch (err) {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-b py-2">
      {!editing ? (
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-medium">{action.description}</div>
            <div className="text-xs text-slate-500 mt-1">Status: {action.status} • Responsibility: {action.responsibility || "—"} • {action.deadline ? `Due ${parseDateDisplay(action.deadline)}` : ""}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="px-3 py-1 bg-slate-100 rounded text-sm">Edit</button>
            <button onClick={onDelete} className="px-3 py-1 bg-red-100 text-red-600 rounded text-sm">Delete</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 w-full">
          <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="p-2 border rounded md:col-span-2" />
          <input type="date" value={form.deadline || ""} onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))} className="p-2 border rounded" />
          <input placeholder="Responsibility" value={form.responsibility} onChange={(e) => setForm(f => ({ ...f, responsibility: e.target.value }))} className="p-2 border rounded" />
          <div className="md:col-span-4 flex gap-2 justify-end mt-2">
            <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))} className="p-2 border rounded">
              <option>Planned</option>
              <option>In Progress</option>
              <option>Done</option>
              <option>Blocked</option>
            </select>
            <button onClick={save} disabled={saving} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">{saving ? "Saving..." : "Save"}</button>
            <button onClick={() => setEditing(false)} className="px-3 py-1 bg-slate-100 rounded text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
