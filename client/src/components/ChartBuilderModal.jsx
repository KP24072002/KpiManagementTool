
// import React, { useEffect, useMemo, useState } from "react";
// import api from "../utils/api";
// import {
//   ResponsiveContainer,
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   Tooltip,
//   Legend,
//   BarChart,
//   Bar,
//   CartesianGrid,
//   ReferenceLine,
// } from "recharts";

// /* ---------- Helpers ---------- */
// function parseDateLenient(value) {
//   if (value == null) return null;
//   if (value instanceof Date) return isFinite(value.getTime()) ? value : null;
//   if (typeof value === "number") {
//     const d = new Date(value);
//     return isFinite(d.getTime()) ? d : null;
//   }
//   const s = String(value).trim();
//   if (!s) return null;
//   const native = Date.parse(s);
//   if (!Number.isNaN(native)) return new Date(native);
//   const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
//   if (dmy) {
//     let day = Number(dmy[1]), mon = Number(dmy[2]), year = Number(dmy[3]);
//     if (year < 100) year += 2000;
//     if (mon > 12 && day <= 12) [day, mon] = [mon, day];
//     const date = new Date(year, mon - 1, day);
//     if (isFinite(date.getTime())) return date;
//   }
//   const mdy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
//   if (mdy) {
//     let mon = Number(mdy[1]), day = Number(mdy[2]), year = Number(mdy[3]);
//     if (year < 100) year += 2000;
//     const date = new Date(year, mon - 1, day);
//     if (isFinite(date.getTime())) return date;
//   }
//   return null;
// }
// function formatDateLabel(d) {
//   if (!(d instanceof Date) || isNaN(d.getTime())) return String(d);
//   return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
// }
// function detectDateHeader(headers = [], rows = []) {
//   const h = (headers || []).map(x => (x || "").toString());
//   const patterns = [/^date$/i, /^timestamp$/i, /\bdate\b/i, /time/i, /day/i];
//   for (const p of patterns) {
//     const idx = h.findIndex(s => p.test(s));
//     if (idx !== -1) return headers[idx];
//   }
//   return headers[0] || "";
// }
// function detectValueHeader(headers = [], rows = []) {
//   const h = (headers || []).map(x => (x || "").toString());
//   const prefer = [/kpi\s*value/i, /\bvalue\b/i, /actual/i, /produced/i, /qty|quantity/i, /measurement/i];
//   for (const p of prefer) {
//     const idx = h.findIndex(s => p.test(s));
//     if (idx !== -1) return headers[idx];
//   }
//   const maxCols = Math.max(headers.length, ...rows.map(r => (Array.isArray(r) ? r.length : 0)), 1);
//   for (let i = 0; i < maxCols; i++) {
//     let samples = 0, numeric = 0;
//     for (let r = 0; r < Math.min(12, rows.length); r++) {
//       const row = Array.isArray(rows[r]) ? rows[r] : [];
//       const v = row[i];
//       if (v === null || v === undefined || String(v).trim() === "") continue;
//       samples++;
//       const n = Number(String(v).replace(/,/g, ""));
//       if (!Number.isNaN(n)) numeric++;
//     }
//     if (samples > 0 && numeric >= Math.ceil(samples / 2)) {
//       return headers[i] || `col_${i}`;
//     }
//   }
//   return headers[1] || headers[0] || "";
// }
// function normalizeAction(a) {
//   if (!a) return "maintain";
//   const s = String(a);
//   return s === "sustain" ? "maintain" : s;
// }
// function parseNumericOrNull(v) {
//   if (v === null || v === undefined) return null;
//   const s = String(v).trim();
//   if (s === "") return null;
//   const cleaned = s.replace(/,/g, "").replace(/[^\d\.\-]/g, "");
//   const n = Number(cleaned);
//   return Number.isFinite(n) ? n : null;
// }

// /* read target(s) from KPI object according to action */
// function readTargetsFromKpi(kpiObj) {
//   if (!kpiObj) return { single: null, lower: null, upper: null, action: "maintain" };
//   const action = normalizeAction(kpiObj.action);
//   // attempt multiple field names defensively
//   const get = (keys) => {
//     for (const k of keys) {
//       if (kpiObj[k] !== undefined) {
//         const v = parseNumericOrNull(kpiObj[k]);
//         if (v !== null) return v;
//       }
//     }
//     return null;
//   };
//   const lower = get(["targetLowerValue", "target_lower", "targetLower", "lowerTarget", "targetLowerValue"]);
//   const upper = get(["targetUpperValue", "target_upper", "targetUpper", "upperTarget", "targetUpperValue"]);
//   const singleCandidate = get(["targetValue", "target_value", "target", "targetValue"]);
//   // choose single depending on action: increase/decrease use targetValue; maximize->upper; minimize->lower
//   let single = singleCandidate;
//   if (single === null) {
//     if (action === "maximize") single = upper;
//     if (action === "minimize") single = lower;
//   }
//   return { single, lower, upper, action };
// }

// /* ---------- Component ---------- */
// export default function ChartBuilderModal({ open, onClose, kpiId, headers = [], rows = [], onSaved }) {
//   const [chartType, setChartType] = useState("line");
//   const [xHeader, setXHeader] = useState("");
//   const [yHeaders, setYHeaders] = useState([]);
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [overlayLineOnBar, setOverlayLineOnBar] = useState(true);

//   const [kpiObj, setKpiObj] = useState(null);
//   const [targets, setTargets] = useState({ single: null, lower: null, upper: null, action: "maintain" });

//   const [primaryChartId, setPrimaryChartId] = useState(null);
//   const [primaryChartMeta, setPrimaryChartMeta] = useState(null);
//   const [saveName, setSaveName] = useState("");
//   const [loadingSaved, setLoadingSaved] = useState(false);
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     if (!open) return;
//     setChartType("line");
//     setDateFrom("");
//     setDateTo("");
//     setOverlayLineOnBar(true);
//     setPrimaryChartId(null);
//     setPrimaryChartMeta(null);
//     setSaveName("");
//     setKpiObj(null);
//     setTargets({ single: null, lower: null, upper: null, action: "maintain" });

//     const defaultX = detectDateHeader(headers, rows);
//     const defaultY = detectValueHeader(headers, rows);
//     setXHeader(defaultX);
//     setYHeaders(defaultY ? [defaultY] : (headers.length > 1 ? [headers[1]] : (headers[0] ? [headers[0]] : [])));

//     fetchPrimaryChartAndKpi();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [open, headers, rows, kpiId]);

//   async function fetchPrimaryChartAndKpi() {
//     if (!kpiId) return;
//     setLoadingSaved(true);
//     try {
//       const [chartsRes, kpiRes] = await Promise.allSettled([
//         api.get(`/kpis/${encodeURIComponent(kpiId)}/charts`),
//         api.get(`/kpis/${encodeURIComponent(kpiId)}`)
//       ]);

//       if (chartsRes.status === "fulfilled" && Array.isArray(chartsRes.value.data) && chartsRes.value.data.length > 0) {
//         const first = chartsRes.value.data[0];
//         setPrimaryChartId(first.id);
//         setPrimaryChartMeta(first);
//         if (first && first.config) {
//           setSaveName(first.name || "");
//           setChartType(first.config.chartType || "line");
//           setXHeader(first.config.xHeader || (headers[0] || ""));
//           setYHeaders(Array.isArray(first.config.yHeaders) && first.config.yHeaders.length ? first.config.yHeaders : (headers.length > 1 ? [headers[1]] : (headers[0] ? [headers[0]] : [])));
//           setDateFrom(first.config.dateFrom || "");
//           setDateTo(first.config.dateTo || "");
//         }
//       } else {
//         setPrimaryChartId(null);
//         setPrimaryChartMeta(null);
//       }

//       if (kpiRes.status === "fulfilled" && kpiRes.value && kpiRes.value.data) {
//         const k = kpiRes.value.data;
//         setKpiObj(k || null);
//         const t = readTargetsFromKpi(k);
//         setTargets(t);
//       }
//     } catch (err) {
//       console.error("Failed to fetch primary chart or KPI", err);
//     } finally {
//       setLoadingSaved(false);
//     }
//   }

//   const xIsDateLike = useMemo(() => {
//     if (!xHeader) return false;
//     const idx = headers.indexOf(xHeader);
//     if (idx === -1) return /date/i.test(xHeader);
//     const samples = [];
//     for (let r = 0; r < rows.length && samples.length < 12; r++) {
//       const v = (Array.isArray(rows[r]) ? rows[r][idx] : undefined);
//       if (v !== undefined && v !== null && String(v).trim() !== "") samples.push(v);
//     }
//     if (samples.length === 0) return /date|time|day|timestamp/i.test(xHeader);
//     let ok = 0;
//     for (const s of samples) if (parseDateLenient(s)) ok++;
//     return ok >= Math.ceil(samples.length / 2);
//   }, [xHeader, headers, rows]);

//   const chartData = useMemo(() => {
//     if (!xHeader || !Array.isArray(yHeaders) || yHeaders.length === 0) return [];
//     const idxMap = {};
//     headers.forEach((h, i) => (idxMap[h] = i));
//     const xIdx = idxMap[xHeader];
//     if (xIdx === undefined) return [];

//     const fromD = dateFrom ? parseDateLenient(dateFrom) : null;
//     const toD = dateTo ? parseDateLenient(dateTo) : null;
//     const out = [];

//     for (let r = 0; r < rows.length; r++) {
//       const row = rows[r];
//       if (!Array.isArray(row)) continue;
//       const rawX = row[xIdx];
//       if (xIsDateLike) {
//         const d = parseDateLenient(rawX);
//         if (!d) continue;
//         if (fromD && d < fromD) continue;
//         if (toD && d > toD) continue;
//         const obj = { x: formatDateLabel(d), xDate: d.getTime() };
//         let anyY = false;
//         for (const yh of yHeaders) {
//           const yi = idxMap[yh];
//           const rawY = yi >= 0 ? row[yi] : null;
//           const num = rawY === null || rawY === undefined || rawY === "" ? null : Number(String(rawY).replace(/,/g, ""));
//           obj[yh] = Number.isFinite(num) ? num : null;
//           if (obj[yh] !== null) anyY = true;
//         }
//         if (!anyY) continue;
//         out.push(obj);
//       } else {
//         const obj = { x: rawX };
//         let anyY = false;
//         for (const yh of yHeaders) {
//           const yi = idxMap[yh];
//           const rawY = yi >= 0 ? row[yi] : null;
//           const num = rawY === null || rawY === undefined || rawY === "" ? null : Number(String(rawY).replace(/,/g, ""));
//           obj[yh] = Number.isFinite(num) ? num : null;
//           if (obj[yh] !== null) anyY = true;
//         }
//         if (!anyY) continue;
//         out.push(obj);
//       }
//     }

//     if (out.length && out[0].xDate !== undefined) out.sort((a, b) => (a.xDate || 0) - (b.xDate || 0));
//     return out;
//   }, [xHeader, yHeaders, headers, rows, xIsDateLike, dateFrom, dateTo]);

//   // Y domain always starts at 0; top is computed from data & target(s)
//   const yDomain = useMemo(() => {
//     const nums = [];
//     const yKeys = yHeaders || [];
//     for (const row of chartData) {
//       for (const k of yKeys) {
//         const v = row[k];
//         if (v !== null && v !== undefined && Number.isFinite(Number(v))) nums.push(Number(v));
//       }
//     }
//     const tvals = [];
//     if (targets && targets.action) {
//       if (targets.action === "maintain") {
//         if (targets.lower !== null && Number.isFinite(Number(targets.lower))) tvals.push(Number(targets.lower));
//         if (targets.upper !== null && Number.isFinite(Number(targets.upper))) tvals.push(Number(targets.upper));
//       } else {
//         if (targets.single !== null && Number.isFinite(Number(targets.single))) tvals.push(Number(targets.single));
//       }
//     } else {
//       if (targets.single !== null && Number.isFinite(Number(targets.single))) tvals.push(Number(targets.single));
//       if (targets.lower !== null && Number.isFinite(Number(targets.lower))) tvals.push(Number(targets.lower));
//       if (targets.upper !== null && Number.isFinite(Number(targets.upper))) tvals.push(Number(targets.upper));
//     }
//     const all = nums.concat(tvals);
//     // ensure at least some positive range
//     const maxVal = all.length > 0 ? Math.max(...all) : 10;
//     // pad a bit on top
//     const pad = Math.max(1, (maxVal === 0 ? 1 : Math.abs(maxVal) * 0.08));
//     const maxTop = Math.ceil(maxVal + pad);
//     // always start at 0
//     return [0, maxTop];
//   }, [chartData, yHeaders, targets]);

//   async function savePrimaryChart() {
//     if (!kpiId) return alert("No KPI selected");
//     if (!saveName || !saveName.trim()) return alert("Please enter a name for the chart");
//     if (!xHeader) return alert("Please select X axis");
//     if (!yHeaders || yHeaders.length === 0) return alert("Please select at least one Y axis");

//     const cfg = {
//       chartType,
//       xHeader,
//       yHeaders,
//       dateFrom: dateFrom || null,
//       dateTo: dateTo || null,
//       overlayLineOnBar: !!overlayLineOnBar,
//     };

//     setSaving(true);
//     try {
//       let saved = null;
//       if (primaryChartId) {
//         const res = await api.put(
//           `/kpis/${encodeURIComponent(kpiId)}/charts/${encodeURIComponent(primaryChartId)}`,
//           { name: saveName.trim(), config: cfg }
//         );
//         saved = res.data;
//         setPrimaryChartMeta(saved);
//       } else {
//         const res = await api.post(`/kpis/${encodeURIComponent(kpiId)}/charts`, { name: saveName.trim(), config: cfg });
//         saved = res.data;
//         if (saved && saved.id) {
//           setPrimaryChartId(saved.id);
//           setPrimaryChartMeta(saved);
//         }
//       }

//       if (onSaved) {
//         try { onSaved(saved); } catch (_) {}
//       }
//       if (onClose) onClose();
//     } catch (err) {
//       console.error("Save failed", err);
//       alert(err?.response?.data?.error || err?.message || "Save failed");
//     } finally {
//       setSaving(false);
//     }
//   }

//   if (!open) return null;

//   // decide which reference lines to show
//   const act = (targets && targets.action) ? targets.action : (kpiObj ? normalizeAction(kpiObj.action) : "maintain");
//   const showSingleTarget = act !== "maintain" && targets.single !== null && Number.isFinite(targets.single);
//   const showLower = act === "maintain" && targets.lower !== null && Number.isFinite(targets.lower);
//   const showUpper = act === "maintain" && targets.upper !== null && Number.isFinite(targets.upper);

//   return (
//     <div className="fixed inset-0 z-50 flex items-start justify-center pt-6">
//       <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
//       <div className="relative z-60 bg-white rounded shadow-lg w-[96%] max-w-[1200px] h-[88vh] overflow-hidden">
//         <div className="flex items-center justify-between p-4 border-b">
//           <h3 className="text-lg font-semibold">Chart Builder</h3>
//           <button onClick={onClose} className="text-sm text-slate-600">Close</button>
//         </div>

//         <div className="p-4 overflow-auto" style={{ height: "calc(88vh - 120px)" }}>
//           <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
//             <div>
//               <label className="block text-sm text-slate-600">Chart Type</label>
//               <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="mt-1 block w-full p-2 border rounded">
//                 <option value="line">Line</option>
//                 <option value="bar">Bar</option>
//               </select>
//             </div>

//             <div>
//               <label className="block text-sm text-slate-600">X Axis (date by default)</label>
//               <select value={xHeader || ""} onChange={(e) => setXHeader(e.target.value)} className="mt-1 block w-full p-2 border rounded">
//                 <option value="">(choose)</option>
//                 {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
//               </select>
//             </div>

//             <div>
//               <label className="block text-sm text-slate-600">Y Axis (KPI value by default)</label>
//               <select multiple value={yHeaders} onChange={(e) => {
//                 const opts = Array.from(e.target.selectedOptions).map(o => o.value);
//                 setYHeaders(opts);
//               }} className="mt-1 block w-full p-2 border rounded h-24">
//                 {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
//               </select>
//             </div>

//             <div>
//               <label className="block text-sm text-slate-600">(Target references)</label>
//               <div className="text-xs text-slate-500 mt-2">
//                 Targets are taken from KPI metadata and shown automatically.
//               </div>
//               <div className="text-sm mt-2">
//                 <strong>Parsed targets:</strong>
//                 <div className="text-xs text-slate-600">Action: {act}</div>
//                 <div className="text-xs text-slate-600">Single: {targets.single !== null ? String(targets.single) : "—"}</div>
//                 <div className="text-xs text-slate-600">Lower: {targets.lower !== null ? String(targets.lower) : "—"}</div>
//                 <div className="text-xs text-slate-600">Upper: {targets.upper !== null ? String(targets.upper) : "—"}</div>
//               </div>
//             </div>
//           </div>

//           {xIsDateLike && (
//             <div className="mb-3 flex flex-wrap items-end gap-4">
//               <div>
//                 <label className="block text-sm text-slate-600">From</label>
//                 <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 p-2 border rounded text-sm" />
//               </div>
//               <div>
//                 <label className="block text-sm text-slate-600">To</label>
//                 <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 p-2 border rounded text-sm" />
//               </div>

//               <div className="ml-auto flex items-center gap-2">
//                 {chartType === "bar" && (
//                   <label className="flex items-center gap-2 text-sm">
//                     <input type="checkbox" checked={overlayLineOnBar} onChange={(e) => setOverlayLineOnBar(e.target.checked)} />
//                     Overlay line on bars
//                   </label>
//                 )}
//               </div>
//             </div>
//           )}

//           <div className="mb-3 flex items-center gap-2">
//             <input placeholder="Chart name" value={saveName} onChange={(e) => setSaveName(e.target.value)} className="p-2 border rounded flex-1" />
//             <button onClick={savePrimaryChart} disabled={saving || !xHeader || yHeaders.length === 0 || !saveName.trim()} className="px-3 py-2 bg-emerald-600 text-white rounded text-sm">
//               {saving ? (primaryChartId ? "Updating..." : "Saving...") : (primaryChartId ? "Save changes" : "Save chart")}
//             </button>
//           </div>

//           <div className="mb-3 border rounded" style={{ width: "100%", height: "calc(70vh - 160px)" }}>
//             <ResponsiveContainer width="100%" height="100%">
//               {chartType === "line" ? (
//                 <LineChart data={chartData} margin={{ top: 16, right: 24, left: 12, bottom: 36 }}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="x" tickFormatter={(t) => (xIsDateLike ? t : String(t))} angle={0} interval="preserveEnd" padding={{ left: 8, right: 8 }} />
//                   <YAxis domain={yDomain} />
//                   <Tooltip labelFormatter={(l) => l} />
//                   <Legend />
//                   {showSingleTarget && <ReferenceLine y={Number(targets.single)} stroke="#d62728" strokeDasharray="4 4" label={{ value: `Target: ${Number(targets.single)}`, position: "insideTopLeft", fill: "#d62728" }} />}
//                   {showLower && <ReferenceLine y={Number(targets.lower)} stroke="#2a9d8f" strokeDasharray="4 4" label={{ value: `Lower: ${Number(targets.lower)}`, position: "insideTopLeft", fill: "#2a9d8f" }} />}
//                   {showUpper && <ReferenceLine y={Number(targets.upper)} stroke="#e76f51" strokeDasharray="4 4" label={{ value: `Upper: ${Number(targets.upper)}`, position: "insideTopLeft", fill: "#e76f51" }} />}
//                   {yHeaders.map((yh, idx) => (
//                     <Line key={yh} type="monotone" dataKey={yh} stroke={["#1f77b4", "#ff7f0e", "#2ca02c", "#9467bd", "#8c564b"][idx % 5]} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
//                   ))}
//                 </LineChart>
//               ) : (
//                 <BarChart data={chartData} margin={{ top: 16, right: 24, left: 12, bottom: 36 }}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="x" tickFormatter={(t) => (xIsDateLike ? t : String(t))} padding={{ left: 8, right: 8 }} />
//                   <YAxis domain={yDomain} />
//                   <Tooltip />
//                   <Legend />
//                   {showSingleTarget && <ReferenceLine y={Number(targets.single)} stroke="#d62728" strokeDasharray="4 4" label={{ value: `Target: ${Number(targets.single)}`, position: "insideTopLeft", fill: "#d62728" }} />}
//                   {showLower && <ReferenceLine y={Number(targets.lower)} stroke="#2a9d8f" strokeDasharray="4 4" label={{ value: `Lower: ${Number(targets.lower)}`, position: "insideTopLeft", fill: "#2a9d8f" }} />}
//                   {showUpper && <ReferenceLine y={Number(targets.upper)} stroke="#e76f51" strokeDasharray="4 4" label={{ value: `Upper: ${Number(targets.upper)}`, position: "insideTopLeft", fill: "#e76f51" }} />}
//                   {yHeaders.map((yh, idx) => <Bar key={yh} dataKey={yh} barSize={40 / Math.max(1, yHeaders.length)} fill={["#1f77b4", "#ff7f0e", "#2ca02c", "#9467bd", "#8c564b"][idx % 5]} />)}
//                   {overlayLineOnBar && yHeaders.length > 0 && <Line type="monotone" dataKey={yHeaders[0]} stroke="#000000" dot={{ r: 3 }} connectNulls />}
//                 </BarChart>
//               )}
//             </ResponsiveContainer>
//           </div>
//         </div>

//         <div className="p-3 border-t flex justify-end gap-2">
//           <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded">Close</button>
//         </div>
//       </div>
//     </div>
//   );
// }

// client/src/components/ChartBuilderModal.jsx
// client/src/components/ChartBuilderModal.jsx
// client/src/components/ChartBuilderModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from "recharts";

/* ---------- Helpers ---------- */
function parseDateLenient(value) {
  if (value == null) return null;
  if (value instanceof Date) return isFinite(value.getTime()) ? value : null;
  if (typeof value === "number") {
    const d = new Date(value);
    return isFinite(d.getTime()) ? d : null;
  }
  const s = String(value).trim();
  if (!s) return null;
  const native = Date.parse(s);
  if (!Number.isNaN(native)) return new Date(native);
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    let day = Number(dmy[1]), mon = Number(dmy[2]), year = Number(dmy[3]);
    if (year < 100) year += 2000;
    if (mon > 12 && day <= 12) [day, mon] = [mon, day];
    const date = new Date(year, mon - 1, day);
    if (isFinite(date.getTime())) return date;
  }
  const mdy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (mdy) {
    let mon = Number(mdy[1]), day = Number(mdy[2]), year = Number(mdy[3]);
    if (year < 100) year += 2000;
    const date = new Date(year, mon - 1, day);
    if (isFinite(date.getTime())) return date;
  }
  return null;
}
function formatDateLabel(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return String(d);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function detectDateHeader(headers = [], rows = []) {
  const h = (headers || []).map(x => (x || "").toString());
  const patterns = [/^date$/i, /^timestamp$/i, /\bdate\b/i, /time/i, /day/i];
  for (const p of patterns) {
    const idx = h.findIndex(s => p.test(s));
    if (idx !== -1) return headers[idx];
  }
  return headers[0] || "";
}
function detectValueHeader(headers = [], rows = []) {
  const h = (headers || []).map(x => (x || "").toString());
  const prefer = [/kpi\s*value/i, /\bvalue\b/i, /actual/i, /produced/i, /qty|quantity/i, /measurement/i];
  for (const p of prefer) {
    const idx = h.findIndex(s => p.test(s));
    if (idx !== -1) return headers[idx];
  }
  const maxCols = Math.max(headers.length, ...rows.map(r => (Array.isArray(r) ? r.length : 0)), 1);
  for (let i = 0; i < maxCols; i++) {
    let samples = 0, numeric = 0;
    for (let r = 0; r < Math.min(12, rows.length); r++) {
      const row = Array.isArray(rows[r]) ? rows[r] : [];
      const v = row[i];
      if (v === null || v === undefined || String(v).trim() === "") continue;
      samples++;
      const n = Number(String(v).replace(/,/g, ""));
      if (!Number.isNaN(n)) numeric++;
    }
    if (samples > 0 && numeric >= Math.ceil(samples / 2)) {
      return headers[i] || `col_${i}`;
    }
  }
  return headers[1] || headers[0] || "";
}
function normalizeAction(a) {
  if (!a) return "maintain";
  const s = String(a);
  return s === "sustain" ? "maintain" : s;
}
function parseNumericOrNull(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const cleaned = s.replace(/,/g, "").replace(/[^\d\.\-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/* read target(s) from KPI object according to action */
function readTargetsFromKpi(kpiObj) {
  if (!kpiObj) return { single: null, lower: null, upper: null, action: "maintain" };
  const action = normalizeAction(kpiObj.action);
  const get = (keys) => {
    for (const k of keys) {
      if (kpiObj[k] !== undefined) {
        const v = parseNumericOrNull(kpiObj[k]);
        if (v !== null) return v;
      }
    }
    return null;
  };
  const lower = get(["targetLowerValue", "target_lower", "targetLower", "lowerTarget", "targetLowerValue"]);
  const upper = get(["targetUpperValue", "target_upper", "targetUpper", "upperTarget", "targetUpperValue"]);
  const singleCandidate = get(["targetValue", "target_value", "target", "targetValue"]);
  let single = singleCandidate;
  if (single === null) {
    if (action === "maximize") single = upper;
    if (action === "minimize") single = lower;
  }
  return { single, lower, upper, action };
}

/* palette: lighter blue, orange, dark green, etc. */
const COLORS = ["#5aa9ff", "#ff7f0e", "#006400", "#9467bd", "#8c564b"];
const GOOD_COLOR = "#006400";
const TARGET_COLOR = "#006400";
const BAD_COLOR = "#d64949";

/* ---------- Component ---------- */
export default function ChartBuilderModal({ open, onClose, kpiId, headers = [], rows = [], onSaved }) {
  const [chartType, setChartType] = useState("line");
  const [xHeader, setXHeader] = useState("");
  const [yHeaders, setYHeaders] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [overlayLineOnBar, setOverlayLineOnBar] = useState(true);

  const [kpiObj, setKpiObj] = useState(null);
  const [targets, setTargets] = useState({ single: null, lower: null, upper: null, action: "maintain" });
  const [presentValue, setPresentValue] = useState(null);

  const [primaryChartId, setPrimaryChartId] = useState(null);
  const [primaryChartMeta, setPrimaryChartMeta] = useState(null);
  const [saveName, setSaveName] = useState("");
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showPresentLine, setShowPresentLine] = useState(true);

  useEffect(() => {
    if (!open) return;
    setChartType("line");
    setDateFrom("");
    setDateTo("");
    setOverlayLineOnBar(true);
    setPrimaryChartId(null);
    setPrimaryChartMeta(null);
    setSaveName("");
    setKpiObj(null);
    setTargets({ single: null, lower: null, upper: null, action: "maintain" });
    setPresentValue(null);

    const defaultX = detectDateHeader(headers, rows);
    const defaultY = detectValueHeader(headers, rows);
    setXHeader(defaultX);
    setYHeaders(defaultY ? [defaultY] : (headers.length > 1 ? [headers[1]] : (headers[0] ? [headers[0]] : [])));

    fetchPrimaryChartAndKpi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, headers, rows, kpiId]);

  async function fetchPrimaryChartAndKpi() {
    if (!kpiId) return;
    setLoadingSaved(true);
    try {
      const [chartsRes, kpiRes] = await Promise.allSettled([
        api.get(`/kpis/${encodeURIComponent(kpiId)}/charts`),
        api.get(`/kpis/${encodeURIComponent(kpiId)}`)
      ]);

      if (chartsRes.status === "fulfilled" && Array.isArray(chartsRes.value.data) && chartsRes.value.data.length > 0) {
        const first = chartsRes.value.data[0];
        setPrimaryChartId(first.id);
        setPrimaryChartMeta(first);
        if (first && first.config) {
          setSaveName(first.name || "");
          setChartType(first.config.chartType || "line");
          setXHeader(first.config.xHeader || (headers[0] || ""));
          setYHeaders(Array.isArray(first.config.yHeaders) && first.config.yHeaders.length ? first.config.yHeaders : (headers.length > 1 ? [headers[1]] : (headers[0] ? [headers[0]] : [])));
          setDateFrom(first.config.dateFrom || "");
          setDateTo(first.config.dateTo || "");
        }
      } else {
        setPrimaryChartId(null);
        setPrimaryChartMeta(null);
      }

      if (kpiRes.status === "fulfilled" && kpiRes.value && kpiRes.value.data) {
        const k = kpiRes.value.data;
        setKpiObj(k || null);
        const t = readTargetsFromKpi(k);
        setTargets(t);
        const pv = parseNumericOrNull(k?.presentValue);
        setPresentValue(pv);
      }
    } catch (err) {
      console.error("Failed to fetch primary chart or KPI", err);
    } finally {
      setLoadingSaved(false);
    }
  }

  const xIsDateLike = useMemo(() => {
    if (!xHeader) return false;
    const idx = headers.indexOf(xHeader);
    if (idx === -1) return /date/i.test(xHeader);
    const samples = [];
    for (let r = 0; r < rows.length && samples.length < 12; r++) {
      const v = (Array.isArray(rows[r]) ? rows[r][idx] : undefined);
      if (v !== undefined && v !== null && String(v).trim() !== "") samples.push(v);
    }
    if (samples.length === 0) return /date|time|day|timestamp/i.test(xHeader);
    let ok = 0;
    for (const s of samples) if (parseDateLenient(s)) ok++;
    return ok >= Math.ceil(samples.length / 2);
  }, [xHeader, headers, rows]);

  const chartData = useMemo(() => {
    if (!xHeader || !Array.isArray(yHeaders) || yHeaders.length === 0) return [];
    const idxMap = {};
    headers.forEach((h, i) => (idxMap[h] = i));
    const xIdx = idxMap[xHeader];
    if (xIdx === undefined) return [];

    const fromD = dateFrom ? parseDateLenient(dateFrom) : null;
    const toD = dateTo ? parseDateLenient(dateTo) : null;
    const out = [];

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      const rawX = row[xIdx];
      if (xIsDateLike) {
        const d = parseDateLenient(rawX);
        if (!d) continue;
        if (fromD && d < fromD) continue;
        if (toD && d > toD) continue;
        const obj = { x: formatDateLabel(d), xDate: d.getTime() };
        let anyY = false;
        for (const yh of yHeaders) {
          const yi = idxMap[yh];
          const rawY = yi >= 0 ? row[yi] : null;
          const num = rawY === null || rawY === undefined || rawY === "" ? null : Number(String(rawY).replace(/,/g, ""));
          obj[yh] = Number.isFinite(num) ? num : null;
          if (obj[yh] !== null) anyY = true;
        }
        if (!anyY) continue;
        out.push(obj);
      } else {
        const obj = { x: rawX };
        let anyY = false;
        for (const yh of yHeaders) {
          const yi = idxMap[yh];
          const rawY = yi >= 0 ? row[yi] : null;
          const num = rawY === null || rawY === undefined || rawY === "" ? null : Number(String(rawY).replace(/,/g, ""));
          obj[yh] = Number.isFinite(num) ? num : null;
          if (obj[yh] !== null) anyY = true;
        }
        if (!anyY) continue;
        out.push(obj);
      }
    }

    if (out.length && out[0].xDate !== undefined) out.sort((a, b) => (a.xDate || 0) - (b.xDate || 0));
    return out;
  }, [xHeader, yHeaders, headers, rows, xIsDateLike, dateFrom, dateTo]);

  // Y domain always starts at 0; top is computed from data & target(s)
  const yDomain = useMemo(() => {
    const nums = [];
    const yKeys = yHeaders || [];
    for (const row of chartData) {
      for (const k of yKeys) {
        const v = row[k];
        if (v !== null && v !== undefined && Number.isFinite(Number(v))) nums.push(Number(v));
      }
    }
    const tvals = [];
    if (targets && targets.action) {
      if (targets.action === "maintain") {
        if (targets.lower !== null && Number.isFinite(Number(targets.lower))) tvals.push(Number(targets.lower));
        if (targets.upper !== null && Number.isFinite(Number(targets.upper))) tvals.push(Number(targets.upper));
      } else {
        if (targets.single !== null && Number.isFinite(Number(targets.single))) tvals.push(Number(targets.single));
      }
    } else {
      if (targets.single !== null && Number.isFinite(Number(targets.single))) tvals.push(Number(targets.single));
      if (targets.lower !== null && Number.isFinite(Number(targets.lower))) tvals.push(Number(targets.lower));
      if (targets.upper !== null && Number.isFinite(Number(targets.upper))) tvals.push(Number(targets.upper));
    }
    const all = nums.concat(tvals);
    const maxVal = all.length > 0 ? Math.max(...all) : 10;
    const pad = Math.max(1, (maxVal === 0 ? 1 : Math.abs(maxVal) * 0.08));
    const maxTop = Math.ceil(maxVal + pad);
    return [0, maxTop];
  }, [chartData, yHeaders, targets]);

  /* ---------- New: determine if a specific numeric datapoint is "good" ---------- */
  function isPointGood(nv, targetsObj, actionOverride) {
    if (nv == null || !Number.isFinite(Number(nv))) return false;
    const action = actionOverride || (targetsObj && targetsObj.action) || "maintain";
    const tSingle = (targetsObj && Number.isFinite(Number(targetsObj.single))) ? Number(targetsObj.single) : null;
    const tLower = (targetsObj && Number.isFinite(Number(targetsObj.lower))) ? Number(targetsObj.lower) : null;
    const tUpper = (targetsObj && Number.isFinite(Number(targetsObj.upper))) ? Number(targetsObj.upper) : null;

    if (action === "increase" || action === "maximize") {
      const threshold = tSingle != null ? tSingle : (tUpper != null ? tUpper : null);
      return threshold != null ? Number(nv) >= threshold : false;
    }
    if (action === "decrease" || action === "minimize") {
      const threshold = tSingle != null ? tSingle : (tLower != null ? tLower : null);
      return threshold != null ? Number(nv) <= threshold : false;
    }
    // maintain (range)
    if (tLower != null && tUpper != null) {
      return Number(nv) >= tLower && Number(nv) <= tUpper;
    }
    if (tLower != null) return Math.abs(Number(nv) - tLower) <= Number.EPSILON;
    if (tUpper != null) return Math.abs(Number(nv) - tUpper) <= Number.EPSILON;
    if (tSingle != null) return Math.abs(Number(nv) - tSingle) <= Number.EPSILON;
    return false;
  }

  /* customized dot renderer to color markers green when good; blue lighter otherwise */
  const renderCustomizedDot = (targetsObj, actionOverride) => (props) => {
    const { cx, cy, value } = props;
    if (cx == null || cy == null) return null;
    const good = isPointGood(value, targetsObj, actionOverride);
    const r = 4;
    const fill = good ? GOOD_COLOR : COLORS[0]; // lighter blue default
    return (
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#ffffff" strokeWidth={0.8} />
    );
  };

  /* activeDot renderer: larger and follows same coloring rule (so selection shows green if good) */
  const renderActiveDot = (targetsObj, actionOverride) => (props) => {
    const { cx, cy, value } = props;
    if (cx == null || cy == null) return null;
    const good = isPointGood(value, targetsObj, actionOverride);
    const r = 6;
    const fill = good ? GOOD_COLOR : COLORS[0];
    return (
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#ffffff" strokeWidth={1.2} />
    );
  };

  async function savePrimaryChart() {
    if (!kpiId) return alert("No KPI selected");
    if (!saveName || !saveName.trim()) return alert("Please enter a name for the chart");
    if (!xHeader) return alert("Please select X axis");
    if (!yHeaders || yHeaders.length === 0) return alert("Please select at least one Y axis");

    const cfg = {
      chartType,
      xHeader,
      yHeaders,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      overlayLineOnBar: !!overlayLineOnBar,
    };

    setSaving(true);
    try {
      let saved = null;
      if (primaryChartId) {
        const res = await api.put(
          `/kpis/${encodeURIComponent(kpiId)}/charts/${encodeURIComponent(primaryChartId)}`,
          { name: saveName.trim(), config: cfg }
        );
        saved = res.data;
        setPrimaryChartMeta(saved);
      } else {
        const res = await api.post(`/kpis/${encodeURIComponent(kpiId)}/charts`, { name: saveName.trim(), config: cfg });
        saved = res.data;
        if (saved && saved.id) {
          setPrimaryChartId(saved.id);
          setPrimaryChartMeta(saved);
        }
      }

      if (onSaved) {
        try { onSaved(saved); } catch (_) {}
      }
      if (onClose) onClose();
    } catch (err) {
      console.error("Save failed", err);
      alert(err?.response?.data?.error || err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  // decide which reference lines to show
  const act = (targets && targets.action) ? targets.action : (kpiObj ? normalizeAction(kpiObj.action) : "maintain");
  const showSingleTarget = act !== "maintain" && targets.single !== null && Number.isFinite(targets.single);
  const showLower = act === "maintain" && targets.lower !== null && Number.isFinite(targets.lower);
  const showUpper = act === "maintain" && targets.upper !== null && Number.isFinite(targets.upper);

  // derived present value for reference line
  const presentNum = parseNumericOrNull(presentValue);

  // arrow glyph
  const arrowGlyph = (act === "increase" || act === "maximize") ? <span style={{ color: "#006400", fontSize: 16, marginLeft: 8 }}>↑</span>
    : (act === "decrease" || act === "minimize") ? <span style={{ color: "#d65353", fontSize: 16, marginLeft: 8 }}>↓</span>
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />
      <div className="relative z-60 bg-white rounded shadow-lg w-[96%] max-w-[1200px] h-[88vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Chart Builder</h3>
          <button onClick={onClose} className="text-sm text-slate-600">Close</button>
        </div>

        <div className="p-4 overflow-auto" style={{ height: "calc(88vh - 120px)" }}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-sm text-slate-600">Chart Type</label>
              <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="mt-1 block w-full p-2 border rounded">
                <option value="line">Line</option>
                <option value="bar">Bar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-600">X Axis (date by default)</label>
              <select value={xHeader || ""} onChange={(e) => setXHeader(e.target.value)} className="mt-1 block w-full p-2 border rounded">
                <option value="">(choose)</option>
                {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-600">Y Axis (KPI value by default)</label>
              <select multiple value={yHeaders} onChange={(e) => {
                const opts = Array.from(e.target.selectedOptions).map(o => o.value);
                setYHeaders(opts);
              }} className="mt-1 block w-full p-2 border rounded h-24">
                {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-600">(Target references)</label>
              <div className="text-xs text-slate-500 mt-2">
                Targets are taken from KPI metadata and shown automatically.
              </div>
              <div className="text-sm mt-2">
                <strong>Parsed targets:</strong>
                <div className="text-xs text-slate-600">Action: {act} {arrowGlyph}</div>
                <div className="text-xs text-slate-600">Single: <span style={{ color: targets.single != null ? TARGET_COLOR : undefined }}>{targets.single !== null ? String(targets.single) : "—"}</span></div>
                <div className="text-xs text-slate-600">Lower: {targets.lower !== null ? String(targets.lower) : "—"}</div>
                <div className="text-xs text-slate-600">Upper: {targets.upper !== null ? String(targets.upper) : "—"}</div>

                <div className="mt-2 flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={showPresentLine} onChange={(e) => setShowPresentLine(e.target.checked)} />
                    Show present value
                  </label>
                </div>
              </div>
            </div>
          </div>

          {xIsDateLike && (
            <div className="mb-3 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm text-slate-600">From</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 p-2 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-sm text-slate-600">To</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 p-2 border rounded text-sm" />
              </div>

              <div className="ml-auto flex items-center gap-2">
                {chartType === "bar" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={overlayLineOnBar} onChange={(e) => setOverlayLineOnBar(e.target.checked)} />
                    Overlay line on bars
                  </label>
                )}
              </div>
            </div>
          )}

          <div className="mb-3 flex items-center gap-2">
            <input placeholder="Chart name" value={saveName} onChange={(e) => setSaveName(e.target.value)} className="p-2 border rounded flex-1" />
            <button onClick={savePrimaryChart} disabled={saving || !xHeader || yHeaders.length === 0 || !saveName.trim()} className="px-3 py-2 bg-emerald-600 text-white rounded text-sm">
              {saving ? (primaryChartId ? "Updating..." : "Saving...") : (primaryChartId ? "Save changes" : "Save chart")}
            </button>
          </div>

          <div className="mb-3 border rounded" style={{ width: "100%", height: "calc(70vh - 160px)" }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "line" ? (
                <LineChart data={chartData} margin={{ top: 16, right: 24, left: 12, bottom: 36 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" tickFormatter={(t) => (xIsDateLike ? t : String(t))} angle={0} interval="preserveEnd" padding={{ left: 8, right: 8 }} />
                  <YAxis domain={yDomain} />
                  <Tooltip labelFormatter={(l) => l} />
                  <Legend />

                  {/* Background shading (good zones) */}
                  {(targets && (targets.action === "increase" || targets.action === "maximize") && (targets.single != null || targets.upper != null)) && (
                    <ReferenceArea
                      y1={targets.single != null ? Number(targets.single) : Number(targets.upper)}
                      y2={yDomain[1]}
                      fill={GOOD_COLOR}
                      opacity={0.06}
                      isFront={false}
                    />
                  )}
                  {(targets && (targets.action === "decrease" || targets.action === "minimize") && (targets.single != null || targets.lower != null)) && (
                    <ReferenceArea
                      y1={0}
                      y2={targets.single != null ? Number(targets.single) : Number(targets.lower)}
                      fill={GOOD_COLOR}
                      opacity={0.06}
                      isFront={false}
                    />
                  )}
                  {(targets && targets.action === "maintain" && targets.lower != null && targets.upper != null) && (
                    <ReferenceArea
                      y1={Number(targets.lower)}
                      y2={Number(targets.upper)}
                      fill={GOOD_COLOR}
                      opacity={0.06}
                      isFront={false}
                    />
                  )}

                  {/* Present value reference line (toggle) */}
                  {showPresentLine && presentNum != null && (
                    <ReferenceLine y={Number(presentNum)} stroke="#111827" strokeDasharray="4 4" label={{ value: `Present: ${presentNum}`, position: "insideBottomRight", fill: "#111827" }} />
                  )}

                  {/* Standard target lines (now green) */}
                  {showSingleTarget && <ReferenceLine y={Number(targets.single)} stroke={TARGET_COLOR} strokeDasharray="4 4" label={{ value: `Target: ${Number(targets.single)}`, position: "insideTopLeft", fill: TARGET_COLOR }} />}
                  {showLower && <ReferenceLine y={Number(targets.lower)} stroke={TARGET_COLOR} strokeDasharray="4 4" label={{ value: `Lower: ${Number(targets.lower)}`, position: "insideTopLeft", fill: TARGET_COLOR }} />}
                  {showUpper && <ReferenceLine y={Number(targets.upper)} stroke={TARGET_COLOR} strokeDasharray="4 4" label={{ value: `Upper: ${Number(targets.upper)}`, position: "insideTopLeft", fill: TARGET_COLOR }} />}

                  {yHeaders.map((yh, idx) => (
                    <Line
                      key={yh}
                      type="monotone"
                      dataKey={yh}
                      stroke={COLORS[idx % COLORS.length]}
                      dot={renderCustomizedDot(targets, act)}
                      activeDot={renderActiveDot(targets, act)}
                      connectNulls
                    />
                  ))}
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 16, right: 24, left: 12, bottom: 36 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" tickFormatter={(t) => (xIsDateLike ? t : String(t))} padding={{ left: 8, right: 8 }} />
                  <YAxis domain={yDomain} />
                  <Tooltip />
                  <Legend />

                  {/* Background shading good zones */}
                  {(targets && (targets.action === "increase" || targets.action === "maximize") && (targets.single != null || targets.upper != null)) && (
                    <ReferenceArea
                      y1={targets.single != null ? Number(targets.single) : Number(targets.upper)}
                      y2={yDomain[1]}
                      fill={GOOD_COLOR}
                      opacity={0.06}
                      isFront={false}
                    />
                  )}
                  {(targets && (targets.action === "decrease" || targets.action === "minimize") && (targets.single != null || targets.lower != null)) && (
                    <ReferenceArea
                      y1={0}
                      y2={targets.single != null ? Number(targets.single) : Number(targets.lower)}
                      fill={GOOD_COLOR}
                      opacity={0.06}
                      isFront={false}
                    />
                  )}
                  {(targets && targets.action === "maintain" && targets.lower != null && targets.upper != null) && (
                    <ReferenceArea
                      y1={Number(targets.lower)}
                      y2={Number(targets.upper)}
                      fill={GOOD_COLOR}
                      opacity={0.06}
                      isFront={false}
                    />
                  )}

                  {showSingleTarget && <ReferenceLine y={Number(targets.single)} stroke={TARGET_COLOR} strokeDasharray="4 4" label={{ value: `Target: ${Number(targets.single)}`, position: "insideTopLeft", fill: TARGET_COLOR }} />}
                  {showLower && <ReferenceLine y={Number(targets.lower)} stroke={TARGET_COLOR} strokeDasharray="4 4" label={{ value: `Lower: ${Number(targets.lower)}`, position: "insideTopLeft", fill: TARGET_COLOR }} />}
                  {showUpper && <ReferenceLine y={Number(targets.upper)} stroke={TARGET_COLOR} strokeDasharray="4 4" label={{ value: `Upper: ${Number(targets.upper)}`, position: "insideTopLeft", fill: TARGET_COLOR }} />}

                  {/* present value */}
                  {showPresentLine && presentNum != null && (
                    <ReferenceLine y={Number(presentNum)} stroke="#111827" strokeDasharray="4 4" label={{ value: `Present: ${presentNum}`, position: "insideBottomRight", fill: "#111827" }} />
                  )}

                  {yHeaders.map((yh, idx) => <Bar key={yh} dataKey={yh} barSize={40 / Math.max(1, yHeaders.length)} fill={COLORS[idx % COLORS.length]} />)}
                  {overlayLineOnBar && yHeaders.length > 0 && (
                    <Line
                      type="monotone"
                      dataKey={yHeaders[0]}
                      stroke="#000000"
                      dot={renderCustomizedDot(targets, act)}
                      activeDot={renderActiveDot(targets, act)}
                      connectNulls
                    />
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded">Close</button>
        </div>
      </div>
    </div>
  );
}


