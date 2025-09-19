
// // client/src/pages/KpiEdit.jsx
// import React, { useEffect, useMemo, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import api from "../utils/api";
// import EditableTableModal from "../components/EditableTableModal";
// import ChartBuilderModal from "../components/ChartBuilderModal";
// import TargetRevisions from "../components/TargetRevisions";
// import AttributePicker from "../components/AttributePicker";


// const CATEGORIES = [
//   "Throughput",
//   "COST",
//   "DELIVERY",
//   "QUALITY",
//   "Safety",
//   "Productivity",
// ];

// function LoadingBox({ text = "Loading..." }) {
//   return (
//     <div className="p-2 bg-white rounded shadow-sm text-sm text-slate-500">
//       {text}
//     </div>
//   );
// }
// function nowTimeString() {
//   const d = new Date();
//   return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
// }
// function todayIso() {
//   const d = new Date();
//   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// }
// function normalizeAction(a) {
//   if (!a) return "maintain";
//   if (String(a) === "sustain") return "maintain";
//   return String(a);
// }
// function isNumberStringEmptyOrValid(v) {
//   if (v === null || v === undefined || String(v).trim() === "") return true;
//   return !Number.isNaN(Number(String(v).trim()));
// }

// /* produce expected headers for an action */
// function headersForAction(action) {
//   action = normalizeAction(action);
//   const pairs = [];
//   for (let i = 1; i <= 5; i++) {
//     pairs.push(`Root Cause ${i}`);
//     pairs.push(`Time ${i}`);
//   }
//   if (action === "maintain") {
//     return ["Timestamp", "Date", "KPI Value", "Target Lower", "Target Upper", ...pairs];
//   } else {
//     return ["Timestamp", "Date", "KPI Value", "Target Value", ...pairs];
//   }
// }

// /* find header index by candidate names (simple) */
// function findHeaderIndex(headers, candidates = []) {
//   if (!Array.isArray(headers)) return -1;
//   const normalized = headers.map((h) => (h || "").toString().trim().toLowerCase());
//   for (const c of candidates) {
//     const lower = c.toLowerCase();
//     const exact = normalized.findIndex((s) => s === lower);
//     if (exact !== -1) return exact;
//     const contains = normalized.findIndex((s) => s.includes(lower));
//     if (contains !== -1) return contains;
//   }
//   return -1;
// }

// /* Create empty quick inputs structure */
// function makeEmptyQuickInputs(action = "maintain", kpi = null) {
//   action = normalizeAction(action);
//   const base = {
//     timestamp: nowTimeString(),
//     date: todayIso(),
//     kpiValue: "",
//     targetValue: "",
//     targetValueEdited: false,
//     targetLower: "",
//     targetLowerEdited: false,
//     targetUpper: "",
//     targetUpperEdited: false,
//   };
//   for (let i = 1; i <= 5; i++) {
//     base[`rootCause${i}`] = "";
//     base[`rootCause${i}Custom`] = "";
//     base[`time${i}`] = "";
//   }
//   if (kpi) {
//     const act = normalizeAction(kpi.action);
//     if (act === "maintain") {
//       if (kpi.targetLowerValue != null) base.targetLower = String(kpi.targetLowerValue);
//       if (kpi.targetUpperValue != null) base.targetUpper = String(kpi.targetUpperValue);
//     } else {
//       if (kpi.targetValue != null) base.targetValue = String(kpi.targetValue);
//       else if (act === "maximize" && kpi.targetUpperValue != null) base.targetValue = String(kpi.targetUpperValue);
//       else if (act === "minimize" && kpi.targetLowerValue != null) base.targetValue = String(kpi.targetLowerValue);
//     }
//   }
//   return base;
// }

// /* Build a row array aligned to headers using quickInputs */
// function buildRowFromQuickInputs(headersArr, inputs) {
//   const headers = Array.isArray(headersArr) && headersArr.length ? headersArr : headersForAction(inputs._action || "maintain");
//   const row = new Array(headers.length).fill("");
//   const idxTimestamp = findHeaderIndex(headers, ["timestamp", "time stamp", "time"]);
//   const idxDate = findHeaderIndex(headers, ["date"]);
//   const idxValue = findHeaderIndex(headers, ["kpi value", "value", "actual", "produced", "qty", "quantity"]);
//   const idxTargetSingle = findHeaderIndex(headers, ["target value", "target"]);
//   const idxTargetLower = findHeaderIndex(headers, ["target lower", "lower target"]);
//   const idxTargetUpper = findHeaderIndex(headers, ["target upper", "upper target"]);

//   if (idxTimestamp !== -1) row[idxTimestamp] = inputs.timestamp || "";
//   if (idxDate !== -1) row[idxDate] = inputs.date || "";
//   if (idxValue !== -1) row[idxValue] = inputs.kpiValue || "";

//   if (idxTargetSingle !== -1) row[idxTargetSingle] = inputs.targetValue || "";
//   else {
//     if (idxTargetLower !== -1) row[idxTargetLower] = inputs.targetLower || "";
//     if (idxTargetUpper !== -1) row[idxTargetUpper] = inputs.targetUpper || "";
//   }

//   // fill root cause/time pairs left-to-right: find first root-like headers and populate
//   const normalized = headers.map((h) => (h || "").toString().trim().toLowerCase());
//   let nextSearchStart = 0;
//   for (let i = 1; i <= 5; i++) {
//     let foundRoot = normalized.findIndex((s, idx) => idx >= nextSearchStart && (s.includes("root") || s.includes("cause")));
//     if (foundRoot === -1) {
//       foundRoot = normalized.findIndex((s) => s.includes("root"));
//     }
//     if (foundRoot !== -1) {
//       row[foundRoot] = inputs[`rootCause${i}`] === "__custom__" ? inputs[`rootCause${i}Custom`] || "" : (inputs[`rootCause${i}`] || "");
//       nextSearchStart = foundRoot + 1;
//       const foundTime = normalized.findIndex((s, idx) => idx > foundRoot && (s.includes("time") || s.includes("hour")));
//       if (foundTime !== -1) row[foundTime] = inputs[`time${i}`] || "";
//     }
//   }

//   if (row.length < headers.length) while (row.length < headers.length) row.push("");
//   else if (row.length > headers.length) row.length = headers.length;
//   return row;
// }

// /* ----- Main component ----- */
// export default function KpiEdit() {
//   const { plantId } = useParams();
//   const navigate = useNavigate();

//   const [kpis, setKpis] = useState([]);
//   const [loadingKpis, setLoadingKpis] = useState(true);
//   const [selectedKpiId, setSelectedKpiId] = useState(null);
//   const [selectedKpi, setSelectedKpi] = useState(null);

//   const [preview, setPreview] = useState({ headers: [], rows: [] });
//   const [tableHeaders, setTableHeaders] = useState([]);
//   const [tableRows, setTableRows] = useState([]);
//   const [charts, setCharts] = useState([]);
//   const [loadingPreview, setLoadingPreview] = useState(false);
//   const [loadingCharts, setLoadingCharts] = useState(false);

//   const [form, setForm] = useState({
//     name: "",
//     description: "",
//     owner: "",
//     action: "maintain",
//     presentValue: "",
//     targetValue: "",
//     targetLowerValue: "",
//     targetUpperValue: "",
//     unit: "",
//     deadline: "",
//     targetRevisionDate: "",
//     category: "",
//   });

//   const [attrs, setAttrs] = useState([]);
//   const [actions, setActions] = useState([]);

//   const [saving, setSaving] = useState(false);
//   const [deleting, setDeleting] = useState(false);

//   const [editRowsOpen, setEditRowsOpen] = useState(false);
//   const [chartModalOpen, setChartModalOpen] = useState(false);

//   // compact edit toggle
//   const [editingMeta, setEditingMeta] = useState(false);

//   // quick add
//   const [quickAddOpen, setQuickAddOpen] = useState(false);
//   const [quickInputs, setQuickInputs] = useState(() => makeEmptyQuickInputs("maintain"));
//   const [quickAdding, setQuickAdding] = useState(false);

//   // upload state
//   const [uploading, setUploading] = useState(false);

//   useEffect(() => {
//     fetchKpis();
//     // eslint-disable-next-line
//   }, [plantId]);

//   async function fetchKpis() {
//     setLoadingKpis(true);
//     try {
//       const res = await api.get(`/kpis/plant/${encodeURIComponent(plantId)}`);
//       const list = Array.isArray(res.data) ? res.data : [];
//       setKpis(list);
//       if (list.length > 0 && !selectedKpiId) setSelectedKpiId(list[0].id);
//       if (list.length === 0) setSelectedKpiId(null);
//     } catch (err) {
//       console.error("Failed to load KPIs", err);
//       setKpis([]);
//     } finally {
//       setLoadingKpis(false);
//     }
//   }

//   useEffect(() => {
//     if (!selectedKpiId) {
//       setSelectedKpi(null);
//       resetFormStates();
//       return;
//     }
//     let mounted = true;
//     async function loadKpi() {
//       try {
//         const res = await api.get(`/kpis/${encodeURIComponent(selectedKpiId)}`);
//         if (!mounted) return;
//         const k = res.data;
//         setSelectedKpi(k || null);
//         setForm({
//           name: k?.name || "",
//           description: k?.description || "",
//           owner: k?.owner || "",
//           action: k?.action || "maintain",
//           presentValue: (k?.presentValue != null) ? String(k.presentValue) : "",
//           targetValue: (k?.targetValue != null) ? String(k.targetValue) : "",
//           targetLowerValue: (k?.targetLowerValue != null) ? String(k.targetLowerValue) : "",
//           targetUpperValue: (k?.targetUpperValue != null) ? String(k.targetUpperValue) : "",
//           unit: k?.unit || "",
//           deadline: k?.deadline || "",
//           targetRevisionDate: k?.targetRevisionDate || "",
//           category: k?.category || "",
//         });
//         setAttrs(Array.isArray(k?.attributes) ? k.attributes : []);
//         setActions(Array.isArray(k?.actions) ? k.actions : []);
//       } catch (err) {
//         console.error("Failed to load KPI", err);
//         setSelectedKpi(null);
//       }
//       fetchPreview(selectedKpiId);
//       fetchCharts(selectedKpiId);
//     }
//     loadKpi();
//     return () => { mounted = false; };
//     // eslint-disable-next-line
//   }, [selectedKpiId]);

//   async function fetchPreview(kpiId) {
//     setLoadingPreview(true);
//     try {
//       const res = await api.get(`/uploads/${encodeURIComponent(kpiId)}/preview?limit=99999`);
//       const data = res.data || { headers: [], rows: [] };
//       const headers = Array.isArray(data.headers) && data.headers.length ? data.headers : headersForAction((kpis.find(k => k.id === kpiId) || {}).action);
//       const rows = Array.isArray(data.rows) ? data.rows : [];
//       setPreview({ headers, rows });
//       setTableHeaders(headers);
//       setTableRows(rows);
//       const k = kpis.find((x) => x.id === kpiId) || selectedKpi;
//       setQuickInputs(makeEmptyQuickInputs(k?.action || "maintain", k));
//     } catch (err) {
//       console.error("Failed to fetch preview", err);
//       setPreview({ headers: [], rows: [] });
//       setTableHeaders([]);
//       setTableRows([]);
//       setQuickInputs(makeEmptyQuickInputs(selectedKpi?.action || "maintain", selectedKpi));
//     } finally {
//       setLoadingPreview(false);
//     }
//   }

//   async function fetchCharts(kpiId) {
//     setLoadingCharts(true);
//     try {
//       const res = await api.get(`/kpis/${encodeURIComponent(kpiId)}/charts`);
//       setCharts(Array.isArray(res.data) ? res.data : []);
//     } catch (err) {
//       console.error("Failed to fetch charts", err);
//       setCharts([]);
//     } finally {
//       setLoadingCharts(false);
//     }
//   }

//   function resetFormStates() {
//     setForm({
//       name: "",
//       description: "",
//       owner: "",
//       action: "maintain",
//       presentValue: "",
//       targetValue: "",
//       targetLowerValue: "",
//       targetUpperValue: "",
//       unit: "",
//       deadline: "",
//       targetRevisionDate: "",
//       category: "",
//     });
//     setAttrs([]);
//     setActions([]);
//     setPreview({ headers: [], rows: [] });
//     setTableHeaders([]);
//     setTableRows([]);
//     setCharts([]);
//     setQuickAddOpen(false);
//     setQuickInputs(makeEmptyQuickInputs("maintain"));
//     setEditingMeta(false);
//   }

//   /* save metadata */
//   async function handleSaveMetadata() {
//     if (!selectedKpiId) return;
//     if (!form.name || !form.name.trim()) return alert("KPI name is required");
//     if (!isNumberStringEmptyOrValid(form.presentValue)) return alert("Present value must be numeric or empty");
//     if (!isNumberStringEmptyOrValid(form.targetValue)) return alert("Target value must be numeric or empty");
//     if (!isNumberStringEmptyOrValid(form.targetLowerValue)) return alert("Lower target must be numeric or empty");
//     if (!isNumberStringEmptyOrValid(form.targetUpperValue)) return alert("Upper target must be numeric or empty");

//     if ((form.action === "increase" || form.action === "decrease") && (form.targetValue === "")) {
//       return alert("Please provide targetValue for increase/decrease.");
//     }
//     if (form.action === "maintain" && (form.targetLowerValue === "" || form.targetUpperValue === "")) {
//       return alert("Please provide both lower and upper targets for maintain.");
//     }
//     if (form.action === "maximize" && (form.targetUpperValue === "")) {
//       return alert("Please provide upper target for maximize.");
//     }
//     if (form.action === "minimize" && (form.targetLowerValue === "")) {
//       return alert("Please provide lower target for minimize.");
//     }

//     setSaving(true);
//     try {
//       const payload = {
//         name: String(form.name).trim(),
//         description: form.description ? String(form.description).trim() : "",
//         owner: form.owner ? String(form.owner).trim() : "",
//         action: form.action || "maintain",
//         presentValue: form.presentValue === "" ? null : Number(String(form.presentValue).trim()),
//         targetValue: form.targetValue === "" ? null : Number(String(form.targetValue).trim()),
//         targetLowerValue: form.targetLowerValue === "" ? null : Number(String(form.targetLowerValue).trim()),
//         targetUpperValue: form.targetUpperValue === "" ? null : Number(String(form.targetUpperValue).trim()),
//         unit: form.unit ? String(form.unit).trim() : "",
//         deadline: form.deadline ? String(form.deadline) : null,
//         targetRevisionDate: form.targetRevisionDate ? String(form.targetRevisionDate) : null,
//         category: form.category || null,
//       };
//       const res = await api.put(`/kpis/${encodeURIComponent(selectedKpiId)}`, payload);
//       setSelectedKpi(res.data);
//       fetchKpis();
//       fetchPreview(selectedKpiId);
//       fetchCharts(selectedKpiId);
//       setEditingMeta(false);
//       alert("Saved successfully");
//     } catch (err) {
//       console.error("Save failed", err);
//       alert(err?.response?.data?.error || err?.message || "Save failed");
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function handleDeleteKpi() {
//     if (!selectedKpiId) return;
//     if (!confirm("Delete this KPI? This will remove it and associated uploaded data.")) return;
//     setDeleting(true);
//     try {
//       await api.delete(`/kpis/${encodeURIComponent(selectedKpiId)}`);
//       alert("Deleted");
//       await fetchKpis();
//       setSelectedKpiId(null);
//     } catch (err) {
//       console.error("Delete failed", err);
//       alert(err?.response?.data?.error || err?.message || "Delete failed");
//     } finally {
//       setDeleting(false);
//     }
//   }

//   /* Attributes CRUD */
//   async function handleAddAttribute(name) {
//     if (!selectedKpiId) return alert("Select a KPI first");
//     if (!name || !String(name).trim()) return alert("Attribute name required");
//     try {
//       const res = await api.post(`/kpis/${encodeURIComponent(selectedKpiId)}/attributes`, { name: String(name).trim(), count: 0 });
//       setAttrs((s) => [...s, res.data]);
//       fetchPreview(selectedKpiId);
//     } catch (err) {
//       console.error("Add attribute failed", err);
//       alert(err?.response?.data?.error || err?.message || "Add attribute failed");
//     }
//   }
//   async function handleUpdateAttribute(attrId, updates) {
//     if (!selectedKpiId) return;
//     try {
//       const res = await api.put(`/kpis/${encodeURIComponent(selectedKpiId)}/attributes/${encodeURIComponent(attrId)}`, updates);
//       setAttrs((s) => s.map(a => (a.id === attrId ? res.data : a)));
//       fetchPreview(selectedKpiId);
//     } catch (err) {
//       console.error("Update attribute failed", err);
//       alert(err?.response?.data?.error || err?.message || "Update attribute failed");
//     }
//   }
//   async function handleDeleteAttribute(attrId) {
//     if (!selectedKpiId) return;
//     if (!confirm("Delete this attribute?")) return;
//     try {
//       await api.delete(`/kpis/${encodeURIComponent(selectedKpiId)}/attributes/${encodeURIComponent(attrId)}`);
//       setAttrs((s) => s.filter(a => a.id !== attrId));
//       fetchPreview(selectedKpiId);
//     } catch (err) {
//       console.error("Delete attribute failed", err);
//       alert(err?.response?.data?.error || err?.message || "Delete attribute failed");
//     }
//   }

//   /* Actions CRUD */
//   async function handleAddAction(payload) {
//     if (!selectedKpiId) return alert("Select a KPI first");
//     if (!payload || !payload.description || !String(payload.description).trim()) return alert("Description required");
//     try {
//       const res = await api.post(`/kpis/${encodeURIComponent(selectedKpiId)}/actions`, {
//         description: String(payload.description).trim(),
//         deadline: payload.deadline || null,
//         responsibility: payload.responsibility || "",
//         status: payload.status || "Planned",
//       });
//       setActions((s) => [...s, res.data]);
//     } catch (err) {
//       console.error("Add action failed", err);
//       alert(err?.response?.data?.error || err?.message || "Add action failed");
//     }
//   }
//   async function handleUpdateAction(actionId, updates) {
//     if (!selectedKpiId) return;
//     try {
//       const res = await api.put(`/kpis/${encodeURIComponent(selectedKpiId)}/actions/${encodeURIComponent(actionId)}`, updates);
//       setActions((s) => s.map(a => (a.id === actionId ? res.data : a)));
//     } catch (err) {
//       console.error("Update action failed", err);
//       alert(err?.response?.data?.error || err?.message || "Update action failed");
//     }
//   }
//   async function handleDeleteAction(actionId) {
//     if (!selectedKpiId) return;
//     if (!confirm("Delete this action plan?")) return;
//     try {
//       await api.delete(`/kpis/${encodeURIComponent(selectedKpiId)}/actions/${encodeURIComponent(actionId)}`);
//       setActions((s) => s.filter(a => a.id !== actionId));
//     } catch (err) {
//       console.error("Delete action failed", err);
//       alert(err?.response?.data?.error || err?.message || "Delete action failed");
//     }
//   }

//   /* Editable table save */
//   async function handleSaveTable(headers, rows) {
//     if (!selectedKpiId) return alert("Select a KPI first");
//     try {
//       await api.put(`/kpis/${encodeURIComponent(selectedKpiId)}/data`, { headers, rows });
//       await fetchPreview(selectedKpiId);
//       setEditRowsOpen(false);
//       alert("Saved table data");
//     } catch (err) {
//       console.error("Save table failed", err);
//       alert(err?.response?.data?.error || err?.message || "Save table failed");
//     }
//   }

//   /* Quick add handlers */
//   function setQuickField(field, value) {
//     setQuickInputs((s) => ({ ...s, [field]: value }));
//   }
//   async function handleQuickAddSubmit(e) {
//     e && e.preventDefault();
//     if (!selectedKpiId) return alert("Select a KPI first");
//     const headers = Array.isArray(tableHeaders) && tableHeaders.length ? tableHeaders : headersForAction(form.action);
//     const inputs = { ...quickInputs, _action: form.action };
//     const hasValue = inputs.kpiValue !== "" && inputs.kpiValue != null;
//     const hasTargetSingle = inputs.targetValue !== "" && inputs.targetValue != null;
//     const hasTargetMaintain = (inputs.targetLower !== "" && inputs.targetLower != null) || (inputs.targetUpper !== "" && inputs.targetUpper != null);
//     const anyRoot = [1, 2, 3, 4, 5].some(i => inputs[`rootCause${i}`] || inputs[`rootCause${i}Custom`]);
//     if (!hasValue && !hasTargetSingle && !hasTargetMaintain && !anyRoot) {
//       return alert("Enter KPI value, or target, or at least one root cause.");
//     }
//     if (hasValue && isNaN(Number(inputs.kpiValue))) return alert("KPI value must be numeric.");
//     if (hasTargetSingle && isNaN(Number(inputs.targetValue))) return alert("Target value must be numeric.");
//     if (inputs.targetLower !== "" && inputs.targetLower != null && isNaN(Number(inputs.targetLower))) return alert("Target Lower must be numeric.");
//     if (inputs.targetUpper !== "" && inputs.targetUpper != null && isNaN(Number(inputs.targetUpper))) return alert("Target Upper must be numeric.");

//     setQuickAdding(true);
//     try {
//       const previewRes = await api.get(`/uploads/${encodeURIComponent(selectedKpiId)}/preview?limit=99999`);
//       let headersNow = Array.isArray(previewRes.data?.headers) && previewRes.data.headers.length ? previewRes.data.headers : headers;
//       let rowsNow = Array.isArray(previewRes.data?.rows) ? previewRes.data.rows.map(r => (Array.isArray(r) ? [...r] : [...r])) : [];

//       if (!headersNow || headersNow.length === 0) headersNow = headersForAction(form.action);
//       const newRow = buildRowFromQuickInputs(headersNow, inputs);
//       if (newRow.length < headersNow.length) while (newRow.length < headersNow.length) newRow.push("");
//       else if (newRow.length > headersNow.length) newRow.length = headersNow.length;
//       rowsNow.push(newRow);
//       await api.put(`/kpis/${encodeURIComponent(selectedKpiId)}/data`, { headers: headersNow, rows: rowsNow });

//       await fetchPreview(selectedKpiId);
//       const preserved = {
//         timestamp: nowTimeString(),
//         date: todayIso(),
//         kpiValue: "",
//         targetValue: quickInputs.targetValue,
//         targetValueEdited: quickInputs.targetValueEdited,
//         targetLower: quickInputs.targetLower,
//         targetLowerEdited: quickInputs.targetLowerEdited,
//         targetUpper: quickInputs.targetUpper,
//         targetUpperEdited: quickInputs.targetUpperEdited,
//       };
//       for (let i = 1; i <= 5; i++) {
//         preserved[`rootCause${i}`] = "";
//         preserved[`rootCause${i}Custom`] = "";
//         preserved[`time${i}`] = "";
//       }
//       setQuickInputs((s) => ({ ...s, ...preserved }));
//       setQuickAddOpen(false);
//       alert("Row added");
//     } catch (err) {
//       console.error("Quick add failed", err);
//       alert(err?.response?.data?.error || err?.message || "Quick add failed");
//     } finally {
//       setQuickAdding(false);
//     }
//   }

//   /* Chart builder open */
//   function openChartBuilder() {
//     if (!selectedKpiId) return alert("Select a KPI first");
//     setChartModalOpen(true);
//   }

//   const daysCount = useMemo(() => (preview.rows ? preview.rows.length : 0), [preview]);

//   /* Sync quick input targets from metadata unless edited */
//   useEffect(() => {
//     if (!selectedKpi) return;
//     setQuickInputs((prev) => {
//       const next = { ...prev };
//       const act = normalizeAction(form.action);
//       if (!next.targetValueEdited && act !== "maintain") {
//         next.targetValue = selectedKpi?.targetValue != null ? String(selectedKpi.targetValue) : (act === "maximize" ? (selectedKpi?.targetUpperValue != null ? String(selectedKpi.targetUpperValue) : "") : (act === "minimize" ? (selectedKpi?.targetLowerValue != null ? String(selectedKpi.targetLowerValue) : "") : ""));
//       }
//       if (!next.targetLowerEdited && act === "maintain") {
//         next.targetLower = selectedKpi?.targetLowerValue != null ? String(selectedKpi.targetLowerValue) : "";
//       }
//       if (!next.targetUpperEdited && act === "maintain") {
//         next.targetUpper = selectedKpi?.targetUpperValue != null ? String(selectedKpi.targetUpperValue) : "";
//       }
//       return next;
//     });
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [selectedKpiId, selectedKpi, form.action]);

//   /* ---------- Upload handling (added) ---------- */
//   async function handleFileChange(e) {
//     const file = e?.target?.files?.[0];
//     if (!file) return;
//     if (!selectedKpiId) return alert("Select a KPI first");
//     setUploading(true);
//     try {
//       const formData = new FormData();
//       formData.append("file", file);
//       const res = await api.post(`/uploads/${encodeURIComponent(selectedKpiId)}/upload`, formData, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       await fetchPreview(selectedKpiId);
//       await fetchKpis();
//       alert(`Uploaded. Rows parsed: ${res.data?.parsed?.rowCount ?? "unknown"}`);
//     } catch (err) {
//       console.error("Upload failed", err);
//       alert(err?.response?.data?.error || err?.message || "Upload failed");
//     } finally {
//       setUploading(false);
//       if (e?.target) e.target.value = "";
//     }
//   }

//   return (
//     <div className="p-4 max-w-6xl mx-auto space-y-4">
//       <div className="flex items-start justify-between">
//         <div>
//           <button className="text-sm text-blue-600 mr-3" onClick={() => navigate(-1)}>← Back</button>
//           <h1 className="text-xl font-semibold inline">KPI Editor</h1>
//           <div className="text-xs text-slate-500 mt-1">Select KPI → edit metadata / preview / quick add / attributes / actions / charts</div>
//         </div>


//         <div className="flex gap-2 items-center">
//           {/* Upload button */}
//           <label className="px-2 py-1 bg-slate-100 rounded text-sm cursor-pointer">
//             {uploading ? "Uploading..." : "Upload File"}
//             <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFileChange} className="hidden" />
//           </label>

//           <button onClick={() => {
//             if (!selectedKpi) return;
//             setForm({
//               name: selectedKpi.name || "",
//               description: selectedKpi.description || "",
//               owner: selectedKpi.owner || "",
//               action: selectedKpi.action || "maintain",
//               presentValue: selectedKpi.presentValue != null ? String(selectedKpi.presentValue) : "",
//               targetValue: selectedKpi.targetValue != null ? String(selectedKpi.targetValue) : "",
//               targetLowerValue: selectedKpi.targetLowerValue != null ? String(selectedKpi.targetLowerValue) : "",
//               targetUpperValue: selectedKpi.targetUpperValue != null ? String(selectedKpi.targetUpperValue) : "",
//               unit: selectedKpi.unit || "",
//               deadline: selectedKpi.deadline || "",
//               targetRevisionDate: selectedKpi.targetRevisionDate || "",
//               category: selectedKpi.category || "",
//             });
//           }} className="px-2 py-1 bg-slate-100 rounded text-sm">Reset</button>

//           {/* CREATE KPI - placed before Save */}
//           <button
//             onClick={() => navigate(`/plant/${encodeURIComponent(plantId)}/kpi-create`)}
//             className="px-3 py-1 bg-green-600 text-white rounded text-sm"
//             title="Create a new KPI"
//             disabled={!plantId}
//           >
//             Create KPI
//           </button>

//           <button onClick={() => setEditingMeta((s) => !s)} className="px-2 py-1 bg-slate-50 rounded text-sm">{editingMeta ? "Close" : "Edit"}</button>

//           <button onClick={handleSaveMetadata} disabled={saving} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">{saving ? "Saving..." : "Save"}</button>

//           <button
//             onClick={handleDeleteKpi}
//             disabled={deleting || !selectedKpiId}
//             className="px-3 py-1 bg-red-600 text-white rounded text-sm"
//             title="Delete selected KPI"
//           >
//             {deleting ? "Deleting..." : "Delete"}
//           </button>

//         </div>


//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
//         {/* Compact KPI list (less vertical padding) */}
//         <aside className="lg:col-span-1">
//           <div className="bg-white rounded border shadow-sm p-2">
//             <div className="flex items-center justify-between mb-2 px-1">
//               <div className="text-sm font-medium">KPIs</div>
//               <div className="text-xs text-slate-400">{kpis.length}</div>
//             </div>

//             {loadingKpis ? (
//               <LoadingBox />
//             ) : kpis.length === 0 ? (
//               <div className="text-sm text-slate-500 p-2">No KPIs</div>
//             ) : (
//               <div className="space-y-1 max-h-[64vh] overflow-auto pr-1">
//                 {kpis.map((k) => (
//                   <button
//                     key={k.id}
//                     onClick={() => setSelectedKpiId(k.id)}
//                     className={`w-full text-left p-2 rounded-md flex items-center justify-between gap-2 ${selectedKpiId === k.id ? "bg-slate-50 border border-slate-100" : "hover:bg-slate-50"}`}
//                   >
//                     <div className="text-sm font-medium">{k.name}</div>
//                     <div className="text-xs text-slate-400">{k.unit || ""}</div>
//                   </button>
//                 ))}
//               </div>
//             )}
//           </div>
//         </aside>

//         {/* Main compact editor */}
//         <main className="lg:col-span-3">
//           <div className="bg-white rounded border shadow-sm p-3">
//             {!selectedKpi ? (
//               <div className="text-sm text-slate-500 p-2">Select a KPI from the left to edit.</div>
//             ) : (
//               <div className="space-y-3">
//                 {/* Top bar: KPI title, small edit toggle, Save + Reset */}
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <div className="text-lg font-semibold">{form.name || "—"}</div>
//                     <div className="text-xs text-slate-500">{form.owner || "—"} • {form.unit || ""}</div>
//                   </div>

//                   <div className="flex items-center gap-2">
//                     {/* Reset, Edit and Save already placed above; kept for layout parity */}
//                   </div>
//                 </div>

//                 {/* Compact editable metadata area (toggle) */}
//                 {editingMeta ? (
//                   <div className="border rounded p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
//                     <div>
//                       <label className="text-xs text-slate-600">Name</label>
//                       <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="w-full p-2 border rounded text-sm" />
//                     </div>
//                     <div>
//                       <label className="text-xs text-slate-600">Category</label>
//                       <select value={form.category || ""} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className="w-full p-2 border rounded text-sm">
//                         <option value="">(none)</option>
//                         {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
//                       </select>
//                     </div>
//                     <div>
//                       <label className="text-xs text-slate-600">Owner</label>
//                       <input value={form.owner} onChange={(e) => setForm(f => ({ ...f, owner: e.target.value }))} className="w-full p-2 border rounded text-sm" />
//                     </div>

//                     <div className="md:col-span-3">
//                       <label className="text-xs text-slate-600">Description</label>
//                       <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="w-full p-2 border rounded text-sm" rows={2} />
//                     </div>

//                     <div>
//                       <label className="text-xs text-slate-600">Action</label>
//                       <select value={form.action} onChange={(e) => setForm(f => ({ ...f, action: e.target.value }))} className="w-full p-2 border rounded text-sm">
//                         <option value="increase">Increase</option>
//                         <option value="decrease">Decrease</option>
//                         <option value="maintain">Maintain (range)</option>
//                         <option value="maximize">Maximize</option>
//                         <option value="minimize">Minimize</option>
//                       </select>
//                     </div>

//                     <div>
//                       <label className="text-xs text-slate-600">Present</label>
//                       <input type="number" value={form.presentValue} onChange={(e) => setForm(f => ({ ...f, presentValue: e.target.value }))} className="w-full p-2 border rounded text-sm" />
//                     </div>

//                     {/* target fields */}
//                     {(form.action === "increase" || form.action === "decrease") && (
//                       <div>
//                         <label className="text-xs text-slate-600">Target</label>
//                         <input type="number" value={form.targetValue} onChange={(e) => setForm(f => ({ ...f, targetValue: e.target.value }))} className="w-full p-2 border rounded text-sm" />
//                       </div>
//                     )}

//                     {form.action === "maintain" && (
//                       <>
//                         <div>
//                           <label className="text-xs text-slate-600">Lower</label>
//                           <input type="number" value={form.targetLowerValue} onChange={(e) => setForm(f => ({ ...f, targetLowerValue: e.target.value }))} className="w-full p-2 border rounded text-sm" />
//                         </div>
//                         <div>
//                           <label className="text-xs text-slate-600">Upper</label>
//                           <input type="number" value={form.targetUpperValue} onChange={(e) => setForm(f => ({ ...f, targetUpperValue: e.target.value }))} className="w-full p-2 border rounded text-sm" />
//                         </div>
//                       </>
//                     )}

//                     {form.action === "maximize" && (
//                       <div>
//                         <label className="text-xs text-slate-600">Upper</label>
//                         <input type="number" value={form.targetUpperValue} onChange={(e) => setForm(f => ({ ...f, targetUpperValue: e.target.value }))} className="w-full p-2 border rounded text-sm" />
//                       </div>
//                     )}

//                     {form.action === "minimize" && (
//                       <div>
//                         <label className="text-xs text-slate-600">Lower</label>
//                         <input type="number" value={form.targetLowerValue} onChange={(e) => setForm(f => ({ ...f, targetLowerValue: e.target.value }))} className="w-full p-2 border rounded text-sm" />
//                       </div>
//                     )}

//                     <div>
//                       <label className="text-xs text-slate-600">Unit / Location</label>
//                       <input value={form.unit} onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full p-2 border rounded text-sm" />
//                     </div>

//                     <div>
//                       <label className="text-xs text-slate-600">Deadline</label>
//                       <input type="date" value={form.deadline || ""} onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))} className="w-full p-2 border rounded text-sm" />
//                     </div>

//                     <div>
//                       <label className="text-xs text-slate-600">Target revision</label>
//                       <input type="date" value={form.targetRevisionDate || ""} onChange={(e) => setForm(f => ({ ...f, targetRevisionDate: e.target.value }))} className="w-full p-2 border rounded text-sm" />
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="text-sm text-slate-600 border rounded p-2">
//                     <div>{form.description ? form.description : <span className="text-slate-400">No description</span>}</div>
//                     <div className="mt-2 text-xs">
//                       Action: <strong>{(form.action || "maintain").toUpperCase()}</strong> • Targets: {form.action === "maintain" ? `${form.targetLowerValue || "—"} — ${form.targetUpperValue || "—"}` : (form.targetValue || "—")}
//                     </div>
//                   </div>
//                 )}

//                 {/* Preview */}
//                 <div>
//                   <div className="flex items-center justify-between mb-2">
//                     <div className="font-medium">Preview (last rows)</div>
//                     <div className="flex items-center gap-2 text-xs">
//                       <div className="text-slate-400">Rows: {daysCount}</div>
//                       <button onClick={() => fetchPreview(selectedKpiId)} className="px-2 py-1 bg-slate-100 rounded text-sm">Refresh</button>
//                       <button onClick={() => setEditRowsOpen(true)} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Edit Rows</button>
//                     </div>
//                   </div>

//                   {loadingPreview ? (
//                     <LoadingBox text="Loading preview..." />
//                   ) : !preview.headers || preview.headers.length === 0 ? (
//                     <div className="text-sm text-slate-500 p-2">No data uploaded yet.</div>
//                   ) : (
//                     <div className="overflow-auto max-h-48 border rounded text-sm">
//                       <table className="w-full table-auto">
//                         <thead className="bg-slate-50">
//                           <tr>
//                             {preview.headers.map((h, i) => <th key={i} className="text-left text-xs p-2 border-b">{h}</th>)}
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {preview.rows.slice(-8).map((row, ri) => (
//                             <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
//                               {preview.headers.map((_, ci) => <td key={ci} className="p-2 text-xs text-slate-700 border-b">{(row && row[ci]) ?? ""}</td>)}
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   )}
//                 </div>

//                 {/* Quick Add (structured) */}
//                 <div className="border rounded p-3">
//                   <div className="flex items-center justify-between mb-2">
//                     <div className="font-medium">Quick add row</div>
//                     <div className="text-xs text-slate-400">Add one row quickly (saves immediately)</div>
//                   </div>

//                   <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
//                     <div>
//                       <label className="text-xs text-slate-500">Timestamp</label>
//                       <input value={quickInputs.timestamp} onChange={(e) => setQuickField("timestamp", e.target.value)} className="mt-1 p-2 border rounded w-full text-sm" />
//                     </div>
//                     <div>
//                       <label className="text-xs text-slate-500">Date</label>
//                       <input type="date" value={quickInputs.date} onChange={(e) => setQuickField("date", e.target.value)} className="mt-1 p-2 border rounded w-full text-sm" />
//                     </div>
//                     <div>
//                       <label className="text-xs text-slate-500">KPI Value</label>
//                       <input type="number" value={quickInputs.kpiValue} onChange={(e) => setQuickField("kpiValue", e.target.value)} className="mt-1 p-2 border rounded w-full text-sm" />
//                     </div>
//                   </div>

//                   {normalizeAction(form.action) === "maintain" ? (
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
//                       <div>
//                         <label className="text-xs text-slate-500">Target Lower</label>
//                         <input type="number" value={quickInputs.targetLower} onChange={(e) => { setQuickField("targetLower", e.target.value); setQuickField("targetLowerEdited", true); }} className="mt-1 p-2 border rounded w-full text-sm" />
//                       </div>
//                       <div>
//                         <label className="text-xs text-slate-500">Target Upper</label>
//                         <input type="number" value={quickInputs.targetUpper} onChange={(e) => { setQuickField("targetUpper", e.target.value); setQuickField("targetUpperEdited", true); }} className="mt-1 p-2 border rounded w-full text-sm" />
//                       </div>
//                     </div>
//                   ) : (
//                     <div className="mt-2">
//                       <label className="text-xs text-slate-500">Target Value</label>
//                       <input type="number" value={quickInputs.targetValue} onChange={(e) => { setQuickField("targetValue", e.target.value); setQuickField("targetValueEdited", true); }} className="mt-1 p-2 border rounded w-full text-sm" />
//                     </div>
//                   )}

//                   {/* Root cause & time (compact tile for 1..5) */}
//                   <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-3">
//                     {[1, 2, 3, 4, 5].map(i => (
//                       <div key={i} className="border rounded p-2">
//                         <div className="text-xs text-slate-500">Root {i}</div>
//                         <select value={quickInputs[`rootCause${i}`] || ""} onChange={(e) => {
//                           setQuickField(`rootCause${i}`, e.target.value);
//                           if (e.target.value !== "__custom__") setQuickField(`rootCause${i}Custom`, "");
//                         }} className="mt-1 p-2 border rounded w-full text-sm">
//                           <option value="">(none)</option>
//                           <option value="__custom__">(custom)</option>
//                           {attrs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
//                         </select>
//                         {quickInputs[`rootCause${i}`] === "__custom__" && (
//                           <input placeholder="Custom" value={quickInputs[`rootCause${i}Custom`] || ""} onChange={(e) => setQuickField(`rootCause${i}Custom`, e.target.value)} className="mt-1 p-2 border rounded w-full text-sm" />
//                         )}
//                         <div className="mt-2">
//                           <div className="text-xs text-slate-500">Time</div>
//                           <input value={quickInputs[`time${i}`] || ""} onChange={(e) => setQuickField(`time${i}`, e.target.value)} placeholder={nowTimeString()} className="mt-1 p-2 border rounded w-full text-sm" />
//                         </div>
//                       </div>
//                     ))}
//                   </div>

//                   <div className="flex gap-2 justify-end mt-3">
//                     <button onClick={() => setQuickInputs(makeEmptyQuickInputs(form.action, selectedKpi))} className="px-2 py-1 bg-slate-100 rounded text-sm">Reset</button>
//                     <button onClick={handleQuickAddSubmit} disabled={quickAdding} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">{quickAdding ? "Adding..." : "Add & Save"}</button>
//                   </div>
//                 </div>

//                 {/* Attributes */}
//                 <div className="border rounded p-3">
//                   <div className="flex items-center justify-between mb-2">
//                     <div className="font-medium">Attributes (Cause)</div>
//                     <div className="text-xs text-slate-400">Total: {attrs.length}</div>
//                   </div>

//                   {attrs.length === 0 ? (
//                     <div className="text-sm text-slate-500">No attributes yet.</div>
//                   ) : (
//                     <div className="space-y-2">
//                       {attrs.map(a => (
//                         <div key={a.id} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-slate-50">
//                           <div>
//                             <div className="font-medium">{a.name}</div>
//                             <div className="text-xs text-slate-400">Count: {a.count}</div>
//                           </div>
//                           <div className="flex gap-2">
//                             <button className="text-xs px-2 py-1 bg-slate-100 rounded" onClick={() => {
//                               const newName = prompt("Edit attribute name", a.name);
//                               if (newName !== null && newName.trim() !== "") handleUpdateAttribute(a.id, { name: newName.trim() });
//                             }}>Edit</button>
//                             <button className="text-xs px-2 py-1 bg-red-100 rounded text-red-700" onClick={() => handleDeleteAttribute(a.id)}>Delete</button>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}

//                   <div className="mt-3 flex gap-2">
//                     <input placeholder="Cause description" id="attrNew" className="p-2 border rounded text-sm flex-1" />
//                     <button onClick={() => {
//                       const el = document.getElementById("attrNew");
//                       if (!el) return;
//                       const v = el.value;
//                       if (!v || !v.trim()) return alert("Enter attribute");
//                       handleAddAttribute(v.trim());
//                       el.value = "";
//                     }} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Add Attribute</button>
//                   </div>
//                 </div>

//                 {/* Action Plans */}
//                 <div className="border rounded p-3">
//                   <div className="flex items-center justify-between mb-2">
//                     <div className="font-medium">Action Plans</div>
//                     <div className="text-xs text-slate-400">Total: {actions.length}</div>
//                   </div>

//                   {actions.length === 0 ? (
//                     <div className="text-sm text-slate-500">No action plans yet.</div>
//                   ) : (
//                     <div className="space-y-2">
//                       {actions.map(a => (
//                         <div key={a.id} className="p-2 rounded hover:bg-slate-50 flex items-start justify-between gap-2">
//                           <div>
//                             <div className="font-medium">{a.description}</div>
//                             <div className="text-xs text-slate-400 mt-1">Deadline: {a.deadline || "—"} • Resp: {a.responsibility || "—"} • Status: {a.status || "Planned"}</div>
//                           </div>
//                           <div className="flex flex-col gap-2 items-end">
//                             <div className="flex gap-2">
//                               <button className="text-xs px-2 py-1 bg-slate-100 rounded" onClick={() => {
//                                 const newDesc = prompt("Edit description", a.description);
//                                 if (newDesc === null) return;
//                                 const newDeadline = prompt("Deadline (YYYY-MM-DD)", a.deadline || "") || null;
//                                 const newResp = prompt("Responsibility", a.responsibility || "") || "";
//                                 const newStatus = prompt("Status", a.status || "Planned") || a.status || "Planned";
//                                 handleUpdateAction(a.id, { description: newDesc, deadline: newDeadline, responsibility: newResp, status: newStatus });
//                               }}>Edit</button>
//                               <button className="text-xs px-2 py-1 bg-red-100 rounded text-red-700" onClick={() => handleDeleteAction(a.id)}>Delete</button>
//                             </div>
//                             <div className="text-xs text-slate-400">Created: {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—"}</div>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   )}

//                   <div className="mt-3 flex gap-2">
//                     <input placeholder="New action description" id="actionNew" className="p-2 border rounded text-sm flex-1" />
//                     <button onClick={() => {
//                       const el = document.getElementById("actionNew");
//                       if (!el) return;
//                       const v = el.value;
//                       if (!v || !v.trim()) return alert("Enter action description");
//                       const deadline = prompt("Deadline (YYYY-MM-DD) - optional") || null;
//                       const responsibility = prompt("Responsibility - optional") || "";
//                       handleAddAction({ description: v.trim(), deadline, responsibility, status: "Planned" });
//                       el.value = "";
//                     }} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Add Action</button>
//                   </div>
//                 </div>

//                 <TargetRevisions kpiId={selectedKpiId} />



//                 {/* Charts summary */}
//                 <div className="border rounded p-3">
//                   <div className="flex items-center justify-between mb-2">
//                     <div className="font-medium">Charts</div>
//                     <div className="text-xs text-slate-400">{charts.length}</div>                   </div>
//                   {loadingCharts ? <LoadingBox /> : (
//                     <div className="space-y-2">
//                       {charts.length === 0 ? <div className="text-sm text-slate-500">No charts.</div> : charts.map(c => (
//                         <div key={c.id} className="p-2 border rounded">
//                           <div className="font-medium">{c.name}</div>
//                           <div className="text-xs text-slate-400">Updated: {c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "—"}</div>
//                         </div>
//                       ))}
//                       <div className="mt-2 flex gap-2">
//                         <button onClick={openChartBuilder} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Edit Chart</button>
//                         <button onClick={() => fetchCharts(selectedKpiId)} className="px-3 py-1 bg-slate-100 rounded text-sm">Refresh</button>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             )}
//           </div>
//         </main>
//       </div>

//       {/* Modals */}
//       <EditableTableModal
//         open={editRowsOpen}
//         onClose={() => setEditRowsOpen(false)}
//         headers={tableHeaders}
//         rows={tableRows}
//         onSave={(h, r) => handleSaveTable(h, r)}
//       />
//       <ChartBuilderModal
//         open={chartModalOpen}
//         onClose={() => setChartModalOpen(false)}
//         kpiId={selectedKpiId}
//         headers={tableHeaders}
//         rows={tableRows}
//         onSaved={() => { fetchCharts(selectedKpiId); setChartModalOpen(false); }}
//       />
//     </div>
//   );
// }





// client/src/pages/KpiEdit.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import EditableTableModal from "../components/EditableTableModal";
import ChartBuilderModal from "../components/ChartBuilderModal";
import TargetRevisions from "../components/TargetRevisions";
import AttributePicker from "../components/AttributePicker";


const CATEGORIES = [
  "Throughput",
  "COST",
  "DELIVERY",
  "QUALITY",
  "Safety",
  "Productivity",
];

function LoadingBox({ text = "Loading..." }) {
  return (
    <div className="p-2 bg-white rounded shadow-sm text-sm text-slate-500">
      {text}
    </div>
  );
}
function nowTimeString() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function normalizeAction(a) {
  if (!a) return "maintain";
  if (String(a) === "sustain") return "maintain";
  return String(a);
}
function isNumberStringEmptyOrValid(v) {
  if (v === null || v === undefined || String(v).trim() === "") return true;
  return !Number.isNaN(Number(String(v).trim()));
}

/* produce expected headers for an action */
function headersForAction(action) {
  action = normalizeAction(action);
  const pairs = [];
  for (let i = 1; i <= 5; i++) {
    pairs.push(`Root Cause ${i}`);
    pairs.push(`Time ${i}`);
  }
  if (action === "maintain") {
    return ["Timestamp", "Date", "KPI Value", "Target Lower", "Target Upper", ...pairs];
  } else {
    return ["Timestamp", "Date", "KPI Value", "Target Value", ...pairs];
  }
}

/* find header index by candidate names (simple) */
function findHeaderIndex(headers, candidates = []) {
  if (!Array.isArray(headers)) return -1;
  const normalized = headers.map((h) => (h || "").toString().trim().toLowerCase());
  for (const c of candidates) {
    const lower = c.toLowerCase();
    const exact = normalized.findIndex((s) => s === lower);
    if (exact !== -1) return exact;
    const contains = normalized.findIndex((s) => s.includes(lower));
    if (contains !== -1) return contains;
  }
  return -1;
}

/* Create empty quick inputs structure */
function makeEmptyQuickInputs(action = "maintain", kpi = null) {
  action = normalizeAction(action);
  const base = {
    timestamp: nowTimeString(),
    date: todayIso(),
    kpiValue: "",
    targetValue: "",
    targetValueEdited: false,
    targetLower: "",
    targetLowerEdited: false,
    targetUpper: "",
    targetUpperEdited: false,
  };
  for (let i = 1; i <= 5; i++) {
    base[`rootCause${i}`] = "";
    base[`rootCause${i}Custom`] = "";
    base[`time${i}`] = "";
  }
  if (kpi) {
    const act = normalizeAction(kpi.action);
    if (act === "maintain") {
      if (kpi.targetLowerValue != null) base.targetLower = String(kpi.targetLowerValue);
      if (kpi.targetUpperValue != null) base.targetUpper = String(kpi.targetUpperValue);
    } else {
      if (kpi.targetValue != null) base.targetValue = String(kpi.targetValue);
      else if (act === "maximize" && kpi.targetUpperValue != null) base.targetValue = String(kpi.targetUpperValue);
      else if (act === "minimize" && kpi.targetLowerValue != null) base.targetValue = String(kpi.targetLowerValue);
    }
  }
  return base;
}

/* Build a row array aligned to headers using quickInputs */
function buildRowFromQuickInputs(headersArr, inputs) {
  const headers = Array.isArray(headersArr) && headersArr.length ? headersArr : headersForAction(inputs._action || "maintain");
  const row = new Array(headers.length).fill("");
  const idxTimestamp = findHeaderIndex(headers, ["timestamp", "time stamp", "time"]);
  const idxDate = findHeaderIndex(headers, ["date"]);
  const idxValue = findHeaderIndex(headers, ["kpi value", "value", "actual", "produced", "qty", "quantity"]);
  const idxTargetSingle = findHeaderIndex(headers, ["target value", "target"]);
  const idxTargetLower = findHeaderIndex(headers, ["target lower", "lower target"]);
  const idxTargetUpper = findHeaderIndex(headers, ["target upper", "upper target"]);

  if (idxTimestamp !== -1) row[idxTimestamp] = inputs.timestamp || "";
  if (idxDate !== -1) row[idxDate] = inputs.date || "";
  if (idxValue !== -1) row[idxValue] = inputs.kpiValue || "";

  if (idxTargetSingle !== -1) row[idxTargetSingle] = inputs.targetValue || "";
  else {
    if (idxTargetLower !== -1) row[idxTargetLower] = inputs.targetLower || "";
    if (idxTargetUpper !== -1) row[idxTargetUpper] = inputs.targetUpper || "";
  }

  // fill root cause/time pairs left-to-right: find first root-like headers and populate
  const normalized = headers.map((h) => (h || "").toString().trim().toLowerCase());
  let nextSearchStart = 0;
  for (let i = 1; i <= 5; i++) {
    let foundRoot = normalized.findIndex((s, idx) => idx >= nextSearchStart && (s.includes("root") || s.includes("cause")));
    if (foundRoot === -1) {
      foundRoot = normalized.findIndex((s) => s.includes("root"));
    }
    if (foundRoot !== -1) {
      row[foundRoot] = inputs[`rootCause${i}`] === "__custom__" ? inputs[`rootCause${i}Custom`] || "" : (inputs[`rootCause${i}`] || "");
      nextSearchStart = foundRoot + 1;
      const foundTime = normalized.findIndex((s, idx) => idx > foundRoot && (s.includes("time") || s.includes("hour")));
      if (foundTime !== -1) row[foundTime] = inputs[`time${i}`] || "";
    }
  }

  if (row.length < headers.length) while (row.length < headers.length) row.push("");
  else if (row.length > headers.length) row.length = headers.length;
  return row;
}

/* ----- Main component ----- */
export default function KpiEdit() {
  const { plantId } = useParams();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [selectedKpiId, setSelectedKpiId] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);

  const [preview, setPreview] = useState({ headers: [], rows: [] });
  const [tableHeaders, setTableHeaders] = useState([]);
  const [tableRows, setTableRows] = useState([]);
  const [charts, setCharts] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCharts, setLoadingCharts] = useState(false);

  const [form, setForm] = useState({
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
    targetRevisionDate: "",
    category: "",
  });

  const [attrs, setAttrs] = useState([]); // attributes attached to current KPI
  const [allAttributes, setAllAttributes] = useState([]); // union of attributes across KPIs
  const [actions, setActions] = useState([]);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editRowsOpen, setEditRowsOpen] = useState(false);
  const [chartModalOpen, setChartModalOpen] = useState(false);

  // compact edit toggle
  const [editingMeta, setEditingMeta] = useState(false);

  // quick add
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickInputs, setQuickInputs] = useState(() => makeEmptyQuickInputs("maintain"));
  const [quickAdding, setQuickAdding] = useState(false);

  // upload state
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchKpis();
    fetchAllAttributes(); // load global attribute list
    // eslint-disable-next-line
  }, [plantId]);

  async function fetchAllAttributes() {
    try {
      const res = await api.get("/attributes"); // <-- expects global attributes endpoint
      const list = Array.isArray(res.data) ? res.data : [];
      setAllAttributes(list);
    } catch (err) {
      console.error("Failed to load global attributes", err);
      setAllAttributes([]);
    }
  }

  async function fetchKpis() {
    setLoadingKpis(true);
    try {
      const res = await api.get(`/kpis/plant/${encodeURIComponent(plantId)}`);
      const list = Array.isArray(res.data) ? res.data : [];
      setKpis(list);
      if (list.length > 0 && !selectedKpiId) setSelectedKpiId(list[0].id);
      if (list.length === 0) setSelectedKpiId(null);
    } catch (err) {
      console.error("Failed to load KPIs", err);
      setKpis([]);
    } finally {
      setLoadingKpis(false);
    }
  }

  useEffect(() => {
    if (!selectedKpiId) {
      setSelectedKpi(null);
      resetFormStates();
      return;
    }
    let mounted = true;
    async function loadKpi() {
      try {
        const res = await api.get(`/kpis/${encodeURIComponent(selectedKpiId)}`);
        if (!mounted) return;
        const k = res.data;
        setSelectedKpi(k || null);
        setForm({
          name: k?.name || "",
          description: k?.description || "",
          owner: k?.owner || "",
          action: k?.action || "maintain",
          presentValue: (k?.presentValue != null) ? String(k.presentValue) : "",
          targetValue: (k?.targetValue != null) ? String(k.targetValue) : "",
          targetLowerValue: (k?.targetLowerValue != null) ? String(k.targetLowerValue) : "",
          targetUpperValue: (k?.targetUpperValue != null) ? String(k.targetUpperValue) : "",
          unit: k?.unit || "",
          deadline: k?.deadline || "",
          targetRevisionDate: k?.targetRevisionDate || "",
          category: k?.category || "",
        });
        setAttrs(Array.isArray(k?.attributes) ? k.attributes : []);
        setActions(Array.isArray(k?.actions) ? k.actions : []);
      } catch (err) {
        console.error("Failed to load KPI", err);
        setSelectedKpi(null);
      }
      fetchPreview(selectedKpiId);
      fetchCharts(selectedKpiId);
    }
    loadKpi();
    return () => { mounted = false; };
    // eslint-disable-next-line
  }, [selectedKpiId]);

  async function fetchPreview(kpiId) {
    setLoadingPreview(true);
    try {
      const res = await api.get(`/uploads/${encodeURIComponent(kpiId)}/preview?limit=99999`);
      const data = res.data || { headers: [], rows: [] };
      const headers = Array.isArray(data.headers) && data.headers.length ? data.headers : headersForAction((kpis.find(k => k.id === kpiId) || {}).action);
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setPreview({ headers, rows });
      setTableHeaders(headers);
      setTableRows(rows);
      const k = kpis.find((x) => x.id === kpiId) || selectedKpi;
      setQuickInputs(makeEmptyQuickInputs(k?.action || "maintain", k));
    } catch (err) {
      console.error("Failed to fetch preview", err);
      setPreview({ headers: [], rows: [] });
      setTableHeaders([]);
      setTableRows([]);
      setQuickInputs(makeEmptyQuickInputs(selectedKpi?.action || "maintain", selectedKpi));
    } finally {
      setLoadingPreview(false);
    }
  }

  async function fetchCharts(kpiId) {
    setLoadingCharts(true);
    try {
      const res = await api.get(`/kpis/${encodeURIComponent(kpiId)}/charts`);
      setCharts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch charts", err);
      setCharts([]);
    } finally {
      setLoadingCharts(false);
    }
  }

  function resetFormStates() {
    setForm({
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
      targetRevisionDate: "",
      category: "",
    });
    setAttrs([]);
    setActions([]);
    setPreview({ headers: [], rows: [] });
    setTableHeaders([]);
    setTableRows([]);
    setCharts([]);
    setQuickAddOpen(false);
    setQuickInputs(makeEmptyQuickInputs("maintain"));
    setEditingMeta(false);
  }

  /* save metadata */
  async function handleSaveMetadata() {
    if (!selectedKpiId) return;
    if (!form.name || !form.name.trim()) return alert("KPI name is required");
    if (!isNumberStringEmptyOrValid(form.presentValue)) return alert("Present value must be numeric or empty");
    if (!isNumberStringEmptyOrValid(form.targetValue)) return alert("Target value must be numeric or empty");
    if (!isNumberStringEmptyOrValid(form.targetLowerValue)) return alert("Lower target must be numeric or empty");
    if (!isNumberStringEmptyOrValid(form.targetUpperValue)) return alert("Upper target must be numeric or empty");

    if ((form.action === "increase" || form.action === "decrease") && (form.targetValue === "")) {
      return alert("Please provide targetValue for increase/decrease.");
    }
    if (form.action === "maintain" && (form.targetLowerValue === "" || form.targetUpperValue === "")) {
      return alert("Please provide both lower and upper targets for maintain.");
    }
    if (form.action === "maximize" && (form.targetUpperValue === "")) {
      return alert("Please provide upper target for maximize.");
    }
    if (form.action === "minimize" && (form.targetLowerValue === "")) {
      return alert("Please provide lower target for minimize.");
    }

    setSaving(true);
    try {
      const payload = {
        name: String(form.name).trim(),
        description: form.description ? String(form.description).trim() : "",
        owner: form.owner ? String(form.owner).trim() : "",
        action: form.action || "maintain",
        presentValue: form.presentValue === "" ? null : Number(String(form.presentValue).trim()),
        targetValue: form.targetValue === "" ? null : Number(String(form.targetValue).trim()),
        targetLowerValue: form.targetLowerValue === "" ? null : Number(String(form.targetLowerValue).trim()),
        targetUpperValue: form.targetUpperValue === "" ? null : Number(String(form.targetUpperValue).trim()),
        unit: form.unit ? String(form.unit).trim() : "",
        deadline: form.deadline ? String(form.deadline) : null,
        targetRevisionDate: form.targetRevisionDate ? String(form.targetRevisionDate) : null,
        category: form.category || null,
      };
      const res = await api.put(`/kpis/${encodeURIComponent(selectedKpiId)}`, payload);
      setSelectedKpi(res.data);
      fetchKpis();
      fetchPreview(selectedKpiId);
      fetchCharts(selectedKpiId);
      setEditingMeta(false);
      alert("Saved successfully");
    } catch (err) {
      console.error("Save failed", err);
      alert(err?.response?.data?.error || err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteKpi() {
    if (!selectedKpiId) return;
    if (!confirm("Delete this KPI? This will remove it and associated uploaded data.")) return;
    setDeleting(true);
    try {
      await api.delete(`/kpis/${encodeURIComponent(selectedKpiId)}`);
      alert("Deleted");
      await fetchKpis();
      setSelectedKpiId(null);
    } catch (err) {
      console.error("Delete failed", err);
      alert(err?.response?.data?.error || err?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  /* Attributes CRUD & attach existing */
  async function handleAddAttribute(attrOrName) {
    // attrOrName: string (name) OR { id, name } (existing attribute object)
    if (!selectedKpiId) return alert("Select a KPI first");
    try {
      // If a plain string: create a new attribute and attach (existing behavior)
      if (typeof attrOrName === "string") {
        const res = await api.post(`/kpis/${encodeURIComponent(selectedKpiId)}/attributes`, { name: String(attrOrName).trim(), count: 0 });
        // backend should return the created attribute object
        if (res && res.data) {
          setAttrs((s) => [...s, res.data]);
        } else {
          // fallback: refetch kpi
          const r = await api.get(`/kpis/${encodeURIComponent(selectedKpiId)}`);
          setAttrs(Array.isArray(r.data?.attributes) ? r.data.attributes : []);
        }
      } else if (attrOrName && attrOrName.id) {
        // Attach existing attribute to KPI.
        // I assume backend accepts attributeId in the same POST endpoint.
        // If your backend expects a different endpoint (e.g. /kpis/:id/attributes/attach), adjust accordingly.
        const res = await api.post(`/kpis/${encodeURIComponent(selectedKpiId)}/attributes`, { attributeId: attrOrName.id });
        if (res && res.data) {
          // if backend returned attached attribute object
          setAttrs((s) => {
            // avoid duplicate
            if (s.some(x => x.id === res.data.id)) return s;
            return [...s, res.data];
          });
        } else {
          // fallback: refetch KPI attributes from server
          const r = await api.get(`/kpis/${encodeURIComponent(selectedKpiId)}`);
          setAttrs(Array.isArray(r.data?.attributes) ? r.data.attributes : []);
        }
      }
      // refresh union list
      await fetchAllAttributes();
    } catch (err) {
      console.error("Add/Attach attribute failed", err);
      alert(err?.response?.data?.error || err?.message || "Add/Attach attribute failed");
    }
  }

  async function handleUpdateAttribute(attrId, updates) {
    if (!selectedKpiId) return;
    try {
      const res = await api.put(`/kpis/${encodeURIComponent(selectedKpiId)}/attributes/${encodeURIComponent(attrId)}`, updates);
      setAttrs((s) => s.map(a => (a.id === attrId ? res.data : a)));
      await fetchAllAttributes();
      fetchPreview(selectedKpiId);
    } catch (err) {
      console.error("Update attribute failed", err);
      alert(err?.response?.data?.error || err?.message || "Update attribute failed");
    }
  }
  async function handleDeleteAttribute(attrId) {
    if (!selectedKpiId) return;
    if (!confirm("Delete this attribute?")) return;
    try {
      await api.delete(`/kpis/${encodeURIComponent(selectedKpiId)}/attributes/${encodeURIComponent(attrId)}`);
      setAttrs((s) => s.filter(a => a.id !== attrId));
      await fetchAllAttributes();
      fetchPreview(selectedKpiId);
    } catch (err) {
      console.error("Delete attribute failed", err);
      alert(err?.response?.data?.error || err?.message || "Delete attribute failed");
    }
  }

  /* Actions CRUD */
  async function handleAddAction(payload) {
    if (!selectedKpiId) return alert("Select a KPI first");
    if (!payload || !payload.description || !String(payload.description).trim()) return alert("Description required");
    try {
      const res = await api.post(`/kpis/${encodeURIComponent(selectedKpiId)}/actions`, {
        description: String(payload.description).trim(),
        deadline: payload.deadline || null,
        responsibility: payload.responsibility || "",
        status: payload.status || "Planned",
      });
      setActions((s) => [...s, res.data]);
    } catch (err) {
      console.error("Add action failed", err);
      alert(err?.response?.data?.error || err?.message || "Add action failed");
    }
  }
  async function handleUpdateAction(actionId, updates) {
    if (!selectedKpiId) return;
    try {
      const res = await api.put(`/kpis/${encodeURIComponent(selectedKpiId)}/actions/${encodeURIComponent(actionId)}`, updates);
      setActions((s) => s.map(a => (a.id === actionId ? res.data : a)));
    } catch (err) {
      console.error("Update action failed", err);
      alert(err?.response?.data?.error || err?.message || "Update action failed");
    }
  }
  async function handleDeleteAction(actionId) {
    if (!selectedKpiId) return;
    if (!confirm("Delete this action plan?")) return;
    try {
      await api.delete(`/kpis/${encodeURIComponent(selectedKpiId)}/actions/${encodeURIComponent(actionId)}`);
      setActions((s) => s.filter(a => a.id !== actionId));
    } catch (err) {
      console.error("Delete action failed", err);
      alert(err?.response?.data?.error || err?.message || "Delete action failed");
    }
  }

  /* Editable table save */
  async function handleSaveTable(headers, rows) {
    if (!selectedKpiId) return alert("Select a KPI first");
    try {
      await api.put(`/kpis/${encodeURIComponent(selectedKpiId)}/data`, { headers, rows });
      await fetchPreview(selectedKpiId);
      setEditRowsOpen(false);
      alert("Saved table data");
    } catch (err) {
      console.error("Save table failed", err);
      alert(err?.response?.data?.error || err?.message || "Save table failed");
    }
  }

  /* Quick add handlers */
  function setQuickField(field, value) {
    setQuickInputs((s) => ({ ...s, [field]: value }));
  }
  async function handleQuickAddSubmit(e) {
    e && e.preventDefault();
    if (!selectedKpiId) return alert("Select a KPI first");
    const headers = Array.isArray(tableHeaders) && tableHeaders.length ? tableHeaders : headersForAction(form.action);
    const inputs = { ...quickInputs, _action: form.action };
    const hasValue = inputs.kpiValue !== "" && inputs.kpiValue != null;
    const hasTargetSingle = inputs.targetValue !== "" && inputs.targetValue != null;
    const hasTargetMaintain = (inputs.targetLower !== "" && inputs.targetLower != null) || (inputs.targetUpper !== "" && inputs.targetUpper != null);
    const anyRoot = [1, 2, 3, 4, 5].some(i => inputs[`rootCause${i}`] || inputs[`rootCause${i}Custom`]);
    if (!hasValue && !hasTargetSingle && !hasTargetMaintain && !anyRoot) {
      return alert("Enter KPI value, or target, or at least one root cause.");
    }
    if (hasValue && isNaN(Number(inputs.kpiValue))) return alert("KPI value must be numeric.");
    if (hasTargetSingle && isNaN(Number(inputs.targetValue))) return alert("Target value must be numeric.");
    if (inputs.targetLower !== "" && inputs.targetLower != null && isNaN(Number(inputs.targetLower))) return alert("Target Lower must be numeric.");
    if (inputs.targetUpper !== "" && inputs.targetUpper != null && isNaN(Number(inputs.targetUpper))) return alert("Target Upper must be numeric.");

    setQuickAdding(true);
    try {
      const previewRes = await api.get(`/uploads/${encodeURIComponent(selectedKpiId)}/preview?limit=99999`);
      let headersNow = Array.isArray(previewRes.data?.headers) && previewRes.data.headers.length ? previewRes.data.headers : headers;
      let rowsNow = Array.isArray(previewRes.data?.rows) ? previewRes.data.rows.map(r => (Array.isArray(r) ? [...r] : [...r])) : [];

      if (!headersNow || headersNow.length === 0) headersNow = headersForAction(form.action);

      // Resolve any rootCause values that are attribute IDs (from allAttributes) into names
      const attrById = {};
      for (const a of allAttributes) attrById[a.id] = a.name;
      const inputsForBuild = { ...inputs };
      for (let i = 1; i <= 5; i++) {
        const v = inputs[`rootCause${i}`];
        if (!v) continue;
        if (v === "__custom__") {
          // keep custom value from rootCause{i}Custom — will be handled by buildRowFromQuickInputs
          inputsForBuild[`rootCause${i}`] = "__custom__";
        } else if (attrById[v]) {
          // v is an attribute id — translate to attribute name
          inputsForBuild[`rootCause${i}`] = attrById[v];
        } else {
          // maybe user typed a name directly (older behaviour)
          inputsForBuild[`rootCause${i}`] = v;
        }
      }

      const newRow = buildRowFromQuickInputs(headersNow, inputsForBuild);
      if (newRow.length < headersNow.length) while (newRow.length < headersNow.length) newRow.push("");
      else if (newRow.length > headersNow.length) newRow.length = headersNow.length;
      rowsNow.push(newRow);
      await api.put(`/kpis/${encodeURIComponent(selectedKpiId)}/data`, { headers: headersNow, rows: rowsNow });

      await fetchPreview(selectedKpiId);
      const preserved = {
        timestamp: nowTimeString(),
        date: todayIso(),
        kpiValue: "",
        targetValue: quickInputs.targetValue,
        targetValueEdited: quickInputs.targetValueEdited,
        targetLower: quickInputs.targetLower,
        targetLowerEdited: quickInputs.targetLowerEdited,
        targetUpper: quickInputs.targetUpper,
        targetUpperEdited: quickInputs.targetUpperEdited,
      };
      for (let i = 1; i <= 5; i++) {
        preserved[`rootCause${i}`] = "";
        preserved[`rootCause${i}Custom`] = "";
        preserved[`time${i}`] = "";
      }
      setQuickInputs((s) => ({ ...s, ...preserved }));
      setQuickAddOpen(false);
      alert("Row added");
      // refresh global attributes - in case user created new one elsewhere
      await fetchAllAttributes();
    } catch (err) {
      console.error("Quick add failed", err);
      alert(err?.response?.data?.error || err?.message || "Quick add failed");
    } finally {
      setQuickAdding(false);
    }
  }

  /* Chart builder open */
  function openChartBuilder() {
    if (!selectedKpiId) return alert("Select a KPI first");
    setChartModalOpen(true);
  }

  const daysCount = useMemo(() => (preview.rows ? preview.rows.length : 0), [preview]);

  /* Sync quick input targets from metadata unless edited */
  useEffect(() => {
    if (!selectedKpi) return;
    setQuickInputs((prev) => {
      const next = { ...prev };
      const act = normalizeAction(form.action);
      if (!next.targetValueEdited && act !== "maintain") {
        next.targetValue = selectedKpi?.targetValue != null ? String(selectedKpi.targetValue) : (act === "maximize" ? (selectedKpi?.targetUpperValue != null ? String(selectedKpi.targetUpperValue) : "") : (act === "minimize" ? (selectedKpi?.targetLowerValue != null ? String(selectedKpi?.targetLowerValue) : "") : ""));
      }
      if (!next.targetLowerEdited && act === "maintain") {
        next.targetLower = selectedKpi?.targetLowerValue != null ? String(selectedKpi.targetLowerValue) : "";
      }
      if (!next.targetUpperEdited && act === "maintain") {
        next.targetUpper = selectedKpi?.targetUpperValue != null ? String(selectedKpi.targetUpperValue) : "";
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKpiId, selectedKpi, form.action]);

  /* ---------- Upload handling (added) ---------- */
  async function handleFileChange(e) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (!selectedKpiId) return alert("Select a KPI first");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`/uploads/${encodeURIComponent(selectedKpiId)}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchPreview(selectedKpiId);
      await fetchKpis();
      alert(`Uploaded. Rows parsed: ${res.data?.parsed?.rowCount ?? "unknown"}`);
    } catch (err) {
      console.error("Upload failed", err);
      alert(err?.response?.data?.error || err?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (e?.target) e.target.value = "";
    }
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <button className="text-sm text-blue-600 mr-3" onClick={() => navigate(-1)}>← Back</button>
          <h1 className="text-xl font-semibold inline">KPI Editor</h1>
          <div className="text-xs text-slate-500 mt-1">Select KPI → edit metadata / preview / quick add / attributes / actions / charts</div>
        </div>


        <div className="flex gap-2 items-center">
          {/* Upload button */}
          <label className="px-2 py-1 bg-slate-100 rounded text-sm cursor-pointer">
            {uploading ? "Uploading..." : "Upload File"}
            <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFileChange} className="hidden" />
          </label>

          <button onClick={() => {
            if (!selectedKpi) return;
            setForm({
              name: selectedKpi.name || "",
              description: selectedKpi.description || "",
              owner: selectedKpi.owner || "",
              action: selectedKpi.action || "maintain",
              presentValue: selectedKpi.presentValue != null ? String(selectedKpi.presentValue) : "",
              targetValue: selectedKpi.targetValue != null ? String(selectedKpi.targetValue) : "",
              targetLowerValue: selectedKpi.targetLowerValue != null ? String(selectedKpi.targetLowerValue) : "",
              targetUpperValue: selectedKpi.targetUpperValue != null ? String(selectedKpi.targetUpperValue) : "",
              unit: selectedKpi.unit || "",
              deadline: selectedKpi.deadline || "",
              targetRevisionDate: selectedKpi.targetRevisionDate || "",
              category: selectedKpi.category || "",
            });
          }} className="px-2 py-1 bg-slate-100 rounded text-sm">Reset</button>

          {/* CREATE KPI - placed before Save */}
          <button
            onClick={() => navigate(`/plant/${encodeURIComponent(plantId)}/kpi-create`)}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm"
            title="Create a new KPI"
            disabled={!plantId}
          >
            Create KPI
          </button>

          <button onClick={() => setEditingMeta((s) => !s)} className="px-2 py-1 bg-slate-50 rounded text-sm">{editingMeta ? "Close" : "Edit"}</button>

          <button onClick={handleSaveMetadata} disabled={saving} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">{saving ? "Saving..." : "Save"}</button>

          <button
            onClick={handleDeleteKpi}
            disabled={deleting || !selectedKpiId}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm"
            title="Delete selected KPI"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>

        </div>


      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Compact KPI list (less vertical padding) */}
        <aside className="lg:col-span-1">
          <div className="bg-white rounded border shadow-sm p-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="text-sm font-medium">KPIs</div>
              <div className="text-xs text-slate-400">{kpis.length}</div>
            </div>

            {loadingKpis ? (
              <LoadingBox />
            ) : kpis.length === 0 ? (
              <div className="text-sm text-slate-500 p-2">No KPIs</div>
            ) : (
              <div className="space-y-1 max-h-[64vh] overflow-auto pr-1">
                {kpis.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => setSelectedKpiId(k.id)}
                    className={`w-full text-left p-2 rounded-md flex items-center justify-between gap-2 ${selectedKpiId === k.id ? "bg-slate-50 border border-slate-100" : "hover:bg-slate-50"}`}
                  >
                    <div className="text-sm font-medium">{k.name}</div>
                    <div className="text-xs text-slate-400">{k.unit || ""}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main compact editor */}
        <main className="lg:col-span-3">
          <div className="bg-white rounded border shadow-sm p-3">
            {!selectedKpi ? (
              <div className="text-sm text-slate-500 p-2">Select a KPI from the left to edit.</div>
            ) : (
              <div className="space-y-3">
                {/* Top bar: KPI title, small edit toggle, Save + Reset */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">{form.name || "—"}</div>
                    <div className="text-xs text-slate-500">{form.owner || "—"} • {form.unit || ""}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Reset, Edit and Save already placed above; kept for layout parity */}
                  </div>
                </div>

                {/* Compact editable metadata area (toggle) */}
                {editingMeta ? (
                  <div className="border rounded p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-600">Name</label>
                      <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="w-full p-2 border rounded text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600">Category</label>
                      <select value={form.category || ""} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className="w-full p-2 border rounded text-sm">
                        <option value="">(none)</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-600">Owner</label>
                      <input value={form.owner} onChange={(e) => setForm(f => ({ ...f, owner: e.target.value }))} className="w-full p-2 border rounded text-sm" />
                    </div>

                    <div className="md:col-span-3">
                      <label className="text-xs text-slate-600">Description</label>
                      <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="w-full p-2 border rounded text-sm" rows={2} />
                    </div>

                    <div>
                      <label className="text-xs text-slate-600">Action</label>
                      <select value={form.action} onChange={(e) => setForm(f => ({ ...f, action: e.target.value }))} className="w-full p-2 border rounded text-sm">
                        <option value="increase">Increase</option>
                        <option value="decrease">Decrease</option>
                        <option value="maintain">Maintain (range)</option>
                        <option value="maximize">Maximize</option>
                        <option value="minimize">Minimize</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-600">Present</label>
                      <input type="number" value={form.presentValue} onChange={(e) => setForm(f => ({ ...f, presentValue: e.target.value }))} className="w-full p-2 border rounded text-sm" />
                    </div>

                    {/* target fields */}
                    {(form.action === "increase" || form.action === "decrease") && (
                      <div>
                        <label className="text-xs text-slate-600">Target</label>
                        <input type="number" value={form.targetValue} onChange={(e) => setForm(f => ({ ...f, targetValue: e.target.value }))} className="w-full p-2 border rounded text-sm" />
                      </div>
                    )}

                    {form.action === "maintain" && (
                      <>
                        <div>
                          <label className="text-xs text-slate-600">Lower</label>
                          <input type="number" value={form.targetLowerValue} onChange={(e) => setForm(f => ({ ...f, targetLowerValue: e.target.value }))} className="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-600">Upper</label>
                          <input type="number" value={form.targetUpperValue} onChange={(e) => setForm(f => ({ ...f, targetUpperValue: e.target.value }))} className="w-full p-2 border rounded text-sm" />
                        </div>
                      </>
                    )}

                    {form.action === "maximize" && (
                      <div>
                        <label className="text-xs text-slate-600">Upper</label>
                        <input type="number" value={form.targetUpperValue} onChange={(e) => setForm(f => ({ ...f, targetUpperValue: e.target.value }))} className="w-full p-2 border rounded text-sm" />
                      </div>
                    )}

                    {form.action === "minimize" && (
                      <div>
                        <label className="text-xs text-slate-600">Lower</label>
                        <input type="number" value={form.targetLowerValue} onChange={(e) => setForm(f => ({ ...f, targetLowerValue: e.target.value }))} className="w-full p-2 border rounded text-sm" />
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-slate-600">Unit / Location</label>
                      <input value={form.unit} onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full p-2 border rounded text-sm" />
                    </div>

                    <div>
                      <label className="text-xs text-slate-600">Deadline</label>
                      <input type="date" value={form.deadline || ""} onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))} className="w-full p-2 border rounded text-sm" />
                    </div>

                    <div>
                      <label className="text-xs text-slate-600">Target revision</label>
                      <input type="date" value={form.targetRevisionDate || ""} onChange={(e) => setForm(f => ({ ...f, targetRevisionDate: e.target.value }))} className="w-full p-2 border rounded text-sm" />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-600 border rounded p-2">
                    <div>{form.description ? form.description : <span className="text-slate-400">No description</span>}</div>
                    <div className="mt-2 text-xs">
                      Action: <strong>{(form.action || "maintain").toUpperCase()}</strong> • Targets: {form.action === "maintain" ? `${form.targetLowerValue || "—"} — ${form.targetUpperValue || "—"}` : (form.targetValue || "—")}
                    </div>
                  </div>
                )}

                {/* Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Preview (last rows)</div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="text-slate-400">Rows: {daysCount}</div>
                      <button onClick={() => fetchPreview(selectedKpiId)} className="px-2 py-1 bg-slate-100 rounded text-sm">Refresh</button>
                      <button onClick={() => setEditRowsOpen(true)} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Edit Rows</button>
                    </div>
                  </div>

                  {loadingPreview ? (
                    <LoadingBox text="Loading preview..." />
                  ) : !preview.headers || preview.headers.length === 0 ? (
                    <div className="text-sm text-slate-500 p-2">No data uploaded yet.</div>
                  ) : (
                    <div className="overflow-auto max-h-48 border rounded text-sm">
                      <table className="w-full table-auto">
                        <thead className="bg-slate-50">
                          <tr>
                            {preview.headers.map((h, i) => <th key={i} className="text-left text-xs p-2 border-b">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.slice(-8).map((row, ri) => (
                            <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                              {preview.headers.map((_, ci) => <td key={ci} className="p-2 text-xs text-slate-700 border-b">{(row && row[ci]) ?? ""}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Quick Add (structured) */}
                <div className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Quick add row</div>
                    <div className="text-xs text-slate-400">Add one row quickly (saves immediately)</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">Timestamp</label>
                      <input value={quickInputs.timestamp} onChange={(e) => setQuickField("timestamp", e.target.value)} className="mt-1 p-2 border rounded w-full text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Date</label>
                      <input type="date" value={quickInputs.date} onChange={(e) => setQuickField("date", e.target.value)} className="mt-1 p-2 border rounded w-full text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">KPI Value</label>
                      <input type="number" value={quickInputs.kpiValue} onChange={(e) => setQuickField("kpiValue", e.target.value)} className="mt-1 p-2 border rounded w-full text-sm" />
                    </div>
                  </div>

                  {normalizeAction(form.action) === "maintain" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="text-xs text-slate-500">Target Lower</label>
                        <input type="number" value={quickInputs.targetLower} onChange={(e) => { setQuickField("targetLower", e.target.value); setQuickField("targetLowerEdited", true); }} className="mt-1 p-2 border rounded w-full text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Target Upper</label>
                        <input type="number" value={quickInputs.targetUpper} onChange={(e) => { setQuickField("targetUpper", e.target.value); setQuickField("targetUpperEdited", true); }} className="mt-1 p-2 border rounded w-full text-sm" />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <label className="text-xs text-slate-500">Target Value</label>
                      <input type="number" value={quickInputs.targetValue} onChange={(e) => { setQuickField("targetValue", e.target.value); setQuickField("targetValueEdited", true); }} className="mt-1 p-2 border rounded w-full text-sm" />
                    </div>
                  )}

                  {/* Root cause & time (compact tile for 1..5)
                      Use global allAttributes union for dropdown so user can pick previously used attributes.
                      Selecting an option stores the attribute.id in quickInputs (we resolve to name later). */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="border rounded p-2">
                        <div className="text-xs text-slate-500">Root {i}</div>
                        <select value={quickInputs[`rootCause${i}`] || ""} onChange={(e) => {
                          setQuickField(`rootCause${i}`, e.target.value);
                          if (e.target.value !== "__custom__") setQuickField(`rootCause${i}Custom`, "");
                        }} className="mt-1 p-2 border rounded w-full text-sm">
                          <option value="">(none)</option>
                          <option value="__custom__">(custom)</option>
                          {allAttributes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        {quickInputs[`rootCause${i}`] === "__custom__" && (
                          <input placeholder="Custom" value={quickInputs[`rootCause${i}Custom`] || ""} onChange={(e) => setQuickField(`rootCause${i}Custom`, e.target.value)} className="mt-1 p-2 border rounded w-full text-sm" />
                        )}
                        <div className="mt-2">
                          <div className="text-xs text-slate-500">Time</div>
                          <input value={quickInputs[`time${i}`] || ""} onChange={(e) => setQuickField(`time${i}`, e.target.value)} placeholder={nowTimeString()} className="mt-1 p-2 border rounded w-full text-sm" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 justify-end mt-3">
                    <button onClick={() => setQuickInputs(makeEmptyQuickInputs(form.action, selectedKpi))} className="px-2 py-1 bg-slate-100 rounded text-sm">Reset</button>
                    <button onClick={handleQuickAddSubmit} disabled={quickAdding} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">{quickAdding ? "Adding..." : "Add & Save"}</button>
                  </div>
                </div>

                {/* Attributes */}
                <div className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Attributes (Cause)</div>
                    <div className="text-xs text-slate-400">Total: {attrs.length}</div>
                  </div>

                  {/* AttributePicker: pass union list and handlers */}
                  <div className="mb-3">
                    <AttributePicker
                      kpiId={selectedKpiId}
                      allAttributes={allAttributes}
                      onSelect={(attr) => {
                        // attr might be { id, name } selected from picker
                        if (!attr) return;
                        handleAddAttribute(attr);
                      }}
                      onAdded={(attr) => {
                        // new attr created from picker - attach freshly created attribute to KPI
                        if (!attr) return;
                        // if picker returns object or string
                        if (typeof attr === "string") handleAddAttribute(attr);
                        else handleAddAttribute(attr);
                      }}
                    />
                  </div>

                  {attrs.length === 0 ? (
                    <div className="text-sm text-slate-500">No attributes yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {attrs.map(a => (
                        <div key={a.id} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-slate-50">
                          <div>
                            <div className="font-medium">{a.name}</div>
                            <div className="text-xs text-slate-400">Count: {a.count}</div>
                          </div>
                          <div className="flex gap-2">
                            <button className="text-xs px-2 py-1 bg-slate-100 rounded" onClick={() => {
                              const newName = prompt("Edit attribute name", a.name);
                              if (newName !== null && newName.trim() !== "") handleUpdateAttribute(a.id, { name: newName.trim() });
                            }}>Edit</button>
                            <button className="text-xs px-2 py-1 bg-red-100 rounded text-red-700" onClick={() => handleDeleteAttribute(a.id)}>Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manual add fallback (keeps existing behaviour) */}
                  <div className="mt-3 flex gap-2">
                    <input placeholder="Cause description" id="attrNew" className="p-2 border rounded text-sm flex-1" />
                    <button onClick={() => {
                      const el = document.getElementById("attrNew");
                      if (!el) return;
                      const v = el.value;
                      if (!v || !v.trim()) return alert("Enter attribute");
                      handleAddAttribute(v.trim());
                      el.value = "";
                    }} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Add Attribute</button>
                  </div>
                </div>

                {/* Action Plans */}
                <div className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Action Plans</div>
                    <div className="text-xs text-slate-400">Total: {actions.length}</div>
                  </div>

                  {actions.length === 0 ? (
                    <div className="text-sm text-slate-500">No action plans yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {actions.map(a => (
                        <div key={a.id} className="p-2 rounded hover:bg-slate-50 flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium">{a.description}</div>
                            <div className="text-xs text-slate-400 mt-1">Deadline: {a.deadline || "—"} • Resp: {a.responsibility || "—"} • Status: {a.status || "Planned"}</div>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <div className="flex gap-2">
                              <button className="text-xs px-2 py-1 bg-slate-100 rounded" onClick={() => {
                                const newDesc = prompt("Edit description", a.description);
                                if (newDesc === null) return;
                                const newDeadline = prompt("Deadline (YYYY-MM-DD)", a.deadline || "") || null;
                                const newResp = prompt("Responsibility", a.responsibility || "") || "";
                                const newStatus = prompt("Status", a.status || "Planned") || a.status || "Planned";
                                handleUpdateAction(a.id, { description: newDesc, deadline: newDeadline, responsibility: newResp, status: newStatus });
                              }}>Edit</button>
                              <button className="text-xs px-2 py-1 bg-red-100 rounded text-red-700" onClick={() => handleDeleteAction(a.id)}>Delete</button>
                            </div>
                            <div className="text-xs text-slate-400">Created: {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "—"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <input placeholder="New action description" id="actionNew" className="p-2 border rounded text-sm flex-1" />
                    <button onClick={() => {
                      const el = document.getElementById("actionNew");
                      if (!el) return;
                      const v = el.value;
                      if (!v || !v.trim()) return alert("Enter action description");
                      const deadline = prompt("Deadline (YYYY-MM-DD) - optional") || null;
                      const responsibility = prompt("Responsibility - optional") || "";
                      handleAddAction({ description: v.trim(), deadline, responsibility, status: "Planned" });
                      el.value = "";
                    }} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Add Action</button>
                  </div>
                </div>

                <TargetRevisions kpiId={selectedKpiId} />

                {/* Charts summary */}
                <div className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Charts</div>
                    <div className="text-xs text-slate-400">{charts.length}</div>                   </div>
                  {loadingCharts ? <LoadingBox /> : (
                    <div className="space-y-2">
                      {charts.length === 0 ? <div className="text-sm text-slate-500">No charts.</div> : charts.map(c => (
                        <div key={c.id} className="p-2 border rounded">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-slate-400">Updated: {c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "—"}</div>
                        </div>
                      ))}
                      <div className="mt-2 flex gap-2">
                        <button onClick={openChartBuilder} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Edit Chart</button>
                        <button onClick={() => fetchCharts(selectedKpiId)} className="px-3 py-1 bg-slate-100 rounded text-sm">Refresh</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>


      {/* Modals */}
      <EditableTableModal
        open={editRowsOpen}
        onClose={() => setEditRowsOpen(false)}
        headers={tableHeaders}
        rows={tableRows}
        attributes={attrs}        // <-- pass current KPI attributes here
        onSave={(h, r) => handleSaveTable(h, r)}
      />


      <ChartBuilderModal
        open={chartModalOpen}
        onClose={() => setChartModalOpen(false)}
        kpiId={selectedKpiId}
        headers={tableHeaders}
        rows={tableRows}
        onSaved={() => { fetchCharts(selectedKpiId); setChartModalOpen(false); }}
      />
    </div>
  );
}
