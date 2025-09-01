// client/src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, CartesianGrid } from "recharts";

/**
 * Dashboard.jsx
 * - Shows KPIs for a plant
 * - Upload files, preview top 5 rows
 * - Edit rows (save -> PUT /api/kpis/:kpiId/data)
 * - Create chart (modal) using local parsed data
 */

function LoadingBox({ text = "Loading..." }) {
  return <div className="p-4 bg-white rounded shadow-sm text-sm text-slate-500">{text}</div>;
}

/* ----------------- PreviewTable ----------------- */
function PreviewTable({ headers = [], rows = [] }) {
  if (!headers || headers.length === 0) return <div className="text-sm text-slate-500">No headers</div>;
  if (!rows || rows.length === 0) return <div className="text-sm text-slate-500">No rows</div>;

  return (
    <div className="overflow-auto border rounded">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((h, idx) => (
              <th key={idx} className="px-3 py-2 text-left font-medium text-slate-600">{h || `Col ${idx+1}`}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              {headers.map((_, ci) => (
                <td key={ci} className="px-3 py-2 align-top">
                  {r[ci] === null || r[ci] === undefined ? "" : String(r[ci])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ----------------- EditableTableModal ----------------- */
function EditableTableModal({ open, onClose, headers: initialHeaders = [], rows: initialRows = [], onSave }) {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    setHeaders(initialHeaders ? [...initialHeaders] : []);
    setRows(initialRows ? initialRows.map(r => [...r]) : []);
  }, [initialHeaders, initialRows, open]);

  if (!open) return null;

  function updateCell(rIdx, cIdx, value) {
    setRows(prev => {
      const copy = prev.map(row => [...row]);
      // ensure row exists
      if (!copy[rIdx]) copy[rIdx] = Array(headers.length).fill("");
      copy[rIdx][cIdx] = value;
      return copy;
    });
  }

  function addRow() {
    setRows(prev => [...prev, Array(headers.length).fill("")]);
  }

  function deleteRow(idx) {
    setRows(prev => prev.filter((_, i) => i !== idx));
  }

  function handleHeaderChange(idx, value) {
    setHeaders(prev => prev.map((h, i) => i === idx ? value : h));
  }

  function addColumn() {
    setHeaders(prev => [...prev, `Col ${prev.length + 1}`]);
    setRows(prev => prev.map(r => [...r, ""]));
  }

  function deleteColumn(colIdx) {
    setHeaders(prev => prev.filter((_, i) => i !== colIdx));
    setRows(prev => prev.map(r => r.filter((_, i) => i !== colIdx)));
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
      <div className="relative z-50 bg-white rounded shadow-lg w-[90%] max-w-5xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Edit Rows</h3>
          <div className="flex gap-2">
            <button onClick={addColumn} className="px-3 py-1 bg-slate-100 rounded text-sm">+ Column</button>
            <button onClick={addRow} className="px-3 py-1 bg-slate-100 rounded text-sm">+ Row</button>
          </div>
        </div>

        <div className="overflow-auto max-h-[60vh] border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {headers.map((h, ci) => (
                  <th key={ci} className="px-2 py-2 text-left">
                    <div className="flex items-center gap-2">
                      <input value={h || ""} onChange={(e) => handleHeaderChange(ci, e.target.value)} className="p-1 border rounded text-sm w-full" />
                      <button onClick={() => deleteColumn(ci)} className="text-sm text-red-500 px-1">✕</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  {headers.map((_, ci) => (
                    <td key={ci} className="px-2 py-1 align-top">
                      <input
                        value={rows[ri][ci] ?? ""}
                        onChange={(e) => updateCell(ri, ci, e.target.value)}
                        className="w-full p-1 border rounded text-sm"
                      />
                    </td>
                  ))}
                  <td className="px-2">
                    <button onClick={() => deleteRow(ri)} className="text-sm text-red-600">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 bg-slate-100 rounded">Cancel</button>
          <button onClick={() => onSave(headers, rows)} className="px-3 py-2 bg-blue-600 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  );
}

/* ----------------- ChartBuilderModal ----------------- */
function ChartBuilderModal({ open, onClose, headers = [], rows = [] }) {
  const [chartType, setChartType] = useState("line");
  const [xHeader, setXHeader] = useState(headers[0] || null);
  const [yHeaders, setYHeaders] = useState(headers.length > 1 ? [headers[1]] : []);

  useEffect(() => {
    setXHeader(headers[0] || null);
    setYHeaders(headers.length > 1 ? [headers[1]] : []);
  }, [headers, open]);

  if (!open) return null;

  // Build data array of objects [{ x:..., "Y1": val, "Y2": val2 }, ...]
  function buildChartData() {
    // map header -> index
    const idxMap = {};
    headers.forEach((h, i) => { idxMap[h] = i; });

    const data = rows.map(r => {
      const obj = {};
      const xIdx = idxMap[xHeader];
      obj.x = r[xIdx] ?? "";
      for (const yh of yHeaders) {
        const yIdx = idxMap[yh];
        // attempt numeric conversion
        const raw = r[yIdx];
        const num = raw === null || raw === undefined || raw === "" ? null : Number(String(raw).replace(/,/g, ""));
        obj[yh] = Number.isFinite(num) ? num : (raw ?? null);
      }
      return obj;
    });

    return data;
  }

  const chartData = buildChartData();

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
      <div className="relative z-50 bg-white rounded shadow-lg w-[90%] max-w-4xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Chart Builder</h3>
          <button onClick={onClose} className="text-sm text-slate-500">Close</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-sm text-slate-600">Chart Type</label>
            <select value={chartType} onChange={e => setChartType(e.target.value)} className="mt-1 block w-full p-2 border rounded">
              <option value="line">Line</option>
              <option value="bar">Bar</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-600">X Axis (categorical / date)</label>
            <select value={xHeader || ""} onChange={e => setXHeader(e.target.value)} className="mt-1 block w-full p-2 border rounded">
              {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-600">Y Axis (multi)</label>
            <select multiple value={yHeaders} onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions).map(o => o.value);
              setYHeaders(opts);
            }} className="mt-1 block w-full p-2 border rounded h-24">
              {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "line" ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {yHeaders.map((yh, idx) => <Line key={yh} type="monotone" dataKey={yh} stroke={["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"][idx % 4]} />)}
                </LineChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {yHeaders.map((yh, idx) => <Bar key={yh} dataKey={yh} barSize={30 / Math.max(1, yHeaders.length)} />)}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 bg-slate-100 rounded">Close</button>
        </div>
      </div>
    </div>
  );
}

/* ----------------- KpiCard ----------------- */
function KpiCard({ kpi, onUploadSuccess, onSaved }) {
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPreview(5);
  }, [kpi.id]);

  async function fetchPreview(limit = 5) {
    setLoadingPreview(true);
    try {
      const res = await api.get(`/uploads/${encodeURIComponent(kpi.id)}/preview?limit=${limit}`);
      setPreview(res.data);
    } catch (err) {
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post(`/uploads/${encodeURIComponent(kpi.id)}/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      await fetchPreview(5);
      if (onUploadSuccess) onUploadSuccess(kpi.id);
      alert(`Uploaded. Rows: ${res.data.parsed.rowCount}`);
    } catch (err) {
      console.error("Upload failed", err);
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
      // reset input value so same file can be uploaded again if needed
      e.target.value = "";
    }
  }

  // download raw: we don't know filename here; list of raw files is not exposed by API.
  // But server serves entire uploads_raw directory statically; you may add a link if you store raw filename in kpi metadata.
  return (
    <div className="p-4 bg-white rounded shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">{kpi.name}</div>
          {kpi.description && <div className="text-sm text-slate-600 mt-1">{kpi.description}</div>}
          <div className="text-xs text-slate-400 mt-2">Owner: {kpi.owner || "—"}</div>
          <div className="text-xs text-slate-400 mt-1">Created: {new Date(kpi.createdAt).toLocaleString()}</div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <label className="px-3 py-1 bg-slate-100 rounded text-sm cursor-pointer">
            {uploading ? "Uploading..." : "Upload File"}
            <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFile} className="hidden" />
          </label>

          <button onClick={() => navigator.clipboard?.writeText(kpi.id)} className="text-xs text-slate-500">Copy ID</button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <strong className="text-sm">Preview (first 5 rows)</strong>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchPreview(5)} className="text-sm text-blue-600">Refresh</button>
          </div>
        </div>

        {loadingPreview ? <LoadingBox text="Loading preview..." /> : (
          preview ? <PreviewTable headers={preview.headers} rows={preview.rows} /> : <div className="text-sm text-slate-500">No data uploaded yet.</div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button className="px-3 py-1 bg-slate-100 rounded text-sm" onClick={() => window.dispatchEvent(new CustomEvent("openEdit", { detail: { kpiId: kpi.id } }))}>Edit Rows</button>
        <button className="px-3 py-1 bg-slate-100 rounded text-sm" onClick={() => window.dispatchEvent(new CustomEvent("openChart", { detail: { kpiId: kpi.id } }))}>Create Chart</button>
      </div>
    </div>
  );
}

/* ----------------- Dashboard Page (main) ----------------- */
export default function Dashboard() {
  const { plantId } = useParams();
  const navigate = useNavigate();

  const [plantName, setPlantName] = useState("");
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);

  // modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [chartModalOpen, setChartModalOpen] = useState(false);

  // modal data
  const [activeKpiId, setActiveKpiId] = useState(null);
  const [activeHeaders, setActiveHeaders] = useState([]);
  const [activeRows, setActiveRows] = useState([]);

  useEffect(() => {
    fetchKpis();
    // listen for card-level events to open modals
    function openEditHandler(e) {
      openEditForKpi(e.detail.kpiId);
    }
    function openChartHandler(e) {
      openChartForKpi(e.detail.kpiId);
    }
    window.addEventListener("openEdit", openEditHandler);
    window.addEventListener("openChart", openChartHandler);
    return () => {
      window.removeEventListener("openEdit", openEditHandler);
      window.removeEventListener("openChart", openChartHandler);
    };
    // eslint-disable-next-line
  }, [plantId]);

  async function fetchKpis() {
    setLoading(true);
    try {
      const res = await api.get(`/kpis/plant/${encodeURIComponent(plantId)}`);
      setKpis(res.data || []);
      // get plant name from plants list (quick fetch)
      const pRes = await api.get("/plants");
      const found = (pRes.data || []).find(p => p.id === plantId);
      setPlantName(found ? found.name : "");
    } catch (err) {
      console.error("Failed to load KPIs", err);
      setKpis([]);
    } finally {
      setLoading(false);
    }
  }

  // load full parsed data using preview with large limit
  async function loadFullData(kpiId) {
    try {
      const res = await api.get(`/uploads/${encodeURIComponent(kpiId)}/preview?limit=999999`);
      return res.data; // { headers, rows, totalRows }
    } catch (err) {
      console.error("Failed to load full data", err);
      return null;
    }
  }

  async function openEditForKpi(kpiId) {
    const parsed = await loadFullData(kpiId);
    if (!parsed) return alert("No uploaded data found for editing");
    setActiveKpiId(kpiId);
    setActiveHeaders(parsed.headers || []);
    setActiveRows(parsed.rows || []);
    setEditModalOpen(true);
  }

  async function openChartForKpi(kpiId) {
    const parsed = await loadFullData(kpiId);
    if (!parsed) return alert("No uploaded data found for charting");
    setActiveKpiId(kpiId);
    setActiveHeaders(parsed.headers || []);
    setActiveRows(parsed.rows || []);
    setChartModalOpen(true);
  }

  async function handleSaveEditedData(kpiId, headers, rows) {
    try {
      await api.put(`/kpis/${encodeURIComponent(kpiId)}/data`, { headers, rows });
      alert("Saved successfully");
      setEditModalOpen(false);
      // refresh cards
      fetchKpis();
      // if you want, also re-open preview for that kpi card (cards query preview themselves)
    } catch (err) {
      console.error("Save failed", err);
      alert(err.message || "Save failed");
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600 mr-3">← Back</button>
          <h1 className="text-2xl font-bold">Dashboard {plantName ? `— ${plantName}` : ""}</h1>
          <p className="text-sm text-slate-600">Manage KPIs for this plant. Upload files, preview and create charts.</p>
        </div>

        <div>
          <button onClick={() => navigate(`/plant/${encodeURIComponent(plantId)}/kpi-create`)} className="px-3 py-2 bg-green-600 text-white rounded">Create KPI</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? <LoadingBox /> : (
          kpis.length === 0 ? (
            <div className="p-4 bg-white rounded shadow-sm">No KPIs yet. Create one to begin.</div>
          ) : (
            kpis.map(kpi => <KpiCard key={kpi.id} kpi={kpi} onUploadSuccess={() => { /* optional callback */ }} onSaved={() => fetchKpis()} />)
          )
        )}
      </div>

      {/* Edit modal */}
      <EditableTableModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        headers={activeHeaders}
        rows={activeRows}
        onSave={(h, r) => handleSaveEditedData(activeKpiId, h, r)}
      />

      {/* Chart modal */}
      <ChartBuilderModal
        open={chartModalOpen}
        onClose={() => setChartModalOpen(false)}
        headers={activeHeaders}
        rows={activeRows}
      />
    </div>
  );
}
