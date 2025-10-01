// // client/src/pages/KpiDailyEntry.jsx
// import React, { useEffect, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import api from "../utils/api";

// /**
//  * KpiDailyEntry
//  * - Lists KPIs for a plant
//  * - For each KPI shows fixed-sheet inputs:
//  *   Timestamp | Date | KPI Value | Target Value | Root Cause 1 | Time | Root Cause 2 | Time
//  * - Auto-fills Target Value from KPI target fields until user edits it (targetValueEditable flag)
//  * - Root Cause dropdown populated from KPI.attributes; supports "(custom)" option
//  * - Save appends the row to KPI's parsed data via PUT /kpis/:kpiId/data
//  */

// const FIXED_HEADERS = [
//   "Timestamp",
//   "Date",
//   "KPI Value",
//   "Target Value",
//   "Root Cause 1",
//   "Time",
//   "Root Cause 2",
//   "Time"
// ];

// function nowTimeString() {
//   const d = new Date();
//   return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
// }
// function todayIso() {
//   const d = new Date();
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, "0");
//   const day = String(d.getDate()).padStart(2, "0");
//   return `${y}-${m}-${day}`;
// }

// function LoadingBox({ text = "Loading..." }) {
//   return <div className="p-3 bg-white rounded shadow-sm text-sm text-slate-500">{text}</div>;
// }

// function normalizeAction(a) {
//   if (!a) return "maintain";
//   if (String(a) === "sustain") return "maintain";
//   return String(a);
// }

// export default function KpiDailyEntry() {
//   const { plantId } = useParams();
//   const navigate = useNavigate();

//   const [kpis, setKpis] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [stateMap, setStateMap] = useState({}); // per-kpi state cache
//   const [error, setError] = useState(null);
//   const [savingAll, setSavingAll] = useState(false);

//   useEffect(() => {
//     loadKpis();
//     // eslint-disable-next-line
//   }, [plantId]);

//   async function loadKpis() {
//     setLoading(true);
//     setError(null);
//     try {
//       const res = await api.get(`/kpis/plant/${encodeURIComponent(plantId)}`);
//       const list = Array.isArray(res.data) ? res.data : [];
//       setKpis(list);

//       const map = {};
//       for (const k of list) {
//         map[k.id] = makeInitialKpiState(k);
//       }
//       setStateMap(map);

//       // 🔥 fetch details for each KPI to populate attributes
//       for (const k of list) {
//         try {
//           const detailRes = await api.get(`/kpis/${encodeURIComponent(k.id)}`);
//           const detail = detailRes.data;
//           if (detail && Array.isArray(detail.attributes)) {
//             setStateMap(prev => ({
//               ...prev,
//               [k.id]: {
//                 ...(prev[k.id] || makeInitialKpiState(k)),
//                 attributes: detail.attributes
//               }
//             }));
//           }
//         } catch (err) {
//           console.warn("Failed to fetch details for KPI", k.id, err);
//         }
//       }
//     } catch (err) {
//       console.error("Failed to load KPIs", err);
//       setError(err?.message || "Failed to load KPIs");
//       setKpis([]);
//       setStateMap({});
//     } finally {
//       setLoading(false);
//     }
//   }

//   function makeInitialKpiState(kpi) {
//     const act = normalizeAction(kpi?.action);
//     const tv = kpi?.targetValue;
//     const tl = kpi?.targetLowerValue;
//     const tu = kpi?.targetUpperValue;
//     let defaultTarget = "";
//     if (act === "increase" || act === "decrease") {
//       defaultTarget = tv != null ? String(tv) : "";
//     } else if (act === "maximize") {
//       defaultTarget = tu != null ? String(tu) : "";
//     } else if (act === "minimize") {
//       defaultTarget = tl != null ? String(tl) : "";
//     } else if (act === "maintain") {
//       if (tl != null && tu != null && !Number.isNaN(Number(tl)) && !Number.isNaN(Number(tu))) {
//         const avg = (Number(tl) + Number(tu)) / 2;
//         defaultTarget = String(Number.isInteger(avg) ? avg : Number(avg.toFixed(2)));
//       } else if (tl != null) defaultTarget = String(tl);
//       else if (tu != null) defaultTarget = String(tu);
//       else if (tv != null) defaultTarget = String(tv);
//       else defaultTarget = "";
//     } else {
//       defaultTarget = tv != null ? String(tv) : "";
//     }

//     return {
//       preview: null, // cached preview: { headers, rows }
//       busy: false,
//       saving: false,
//       inputs: {
//         timestamp: nowTimeString(),
//         date: todayIso(),
//         kpiValue: "",
//         targetValue: defaultTarget,
//         targetValueEditable: false, // becomes true if user types target
//         rootCause1: "", // either attribute id or "__custom__"
//         rootCause1Custom: "",
//         time1: "",
//         rootCause2: "",
//         rootCause2Custom: "",
//         time2: ""
//       },
//       attributes: Array.isArray(kpi?.attributes) ? [...kpi.attributes] : []
//     };
//   }

//   // update entire entry for kpiId
//   function updateKpiState(kpiId, patch) {
//     setStateMap(prev => ({ ...prev, [kpiId]: { ...(prev[kpiId] || {}), ...patch } }));
//   }
//   // update only inputs
//   function updateKpiInputs(kpiId, patch) {
//     setStateMap(prev => {
//       const entry = prev[kpiId] || {};
//       const inputs = { ...(entry.inputs || {}), ...patch };
//       return { ...prev, [kpiId]: { ...entry, inputs } };
//     });
//   }

//   // fetch preview (cached)
//   async function fetchPreview(kpiId) {
//     const entry = stateMap[kpiId];
//     if (entry && entry.preview) return entry.preview;
//     updateKpiState(kpiId, { busy: true });
//     try {
//       const res = await api.get(`/uploads/${encodeURIComponent(kpiId)}/preview?limit=999999`);
//       const data = res.data || { headers: [], rows: [] };
//       const headers = Array.isArray(data.headers) && data.headers.length ? data.headers : FIXED_HEADERS.slice();
//       const rows = Array.isArray(data.rows) ? data.rows : [];
//       const preview = { headers, rows };
//       updateKpiState(kpiId, { preview, busy: false });
//       return preview;
//     } catch (err) {
//       console.error("Failed to fetch preview for", kpiId, err);
//       const preview = { headers: FIXED_HEADERS.slice(), rows: [] };
//       updateKpiState(kpiId, { preview, busy: false });
//       return preview;
//     }
//   }

//   // detect indexes
//   function detectIndexes(headers = []) {
//     const h = headers.map(x => (x || "").toString());
//     const find = pattern => h.findIndex(s => new RegExp(pattern, "i").test(s));
//     let timestamp = find("^timestamp$|timestamp|time stamp|time$");
//     let date = find("^date$|^date\\b");
//     let value = find("kpi\\s*value|value|actual|produced|qty|quantity|measure");
//     let target = find("target");
//     let root1 = find("^root\\s*cause\\s*1|^root\\s*cause|^root1|root cause");
//     let root2 = find("^root\\s*cause\\s*2|root cause 2");

//     const fallback = {};
//     for (let i = 0; i < FIXED_HEADERS.length; i++) fallback[FIXED_HEADERS[i].toLowerCase()] = i;
//     if (timestamp === -1) timestamp = fallback["timestamp"] ?? 0;
//     if (date === -1) date = fallback["date"] ?? 1;
//     if (value === -1) value = fallback["kpi value"] ?? 2;
//     if (target === -1) target = fallback["target value"] ?? 3;
//     if (root1 === -1) root1 = fallback["root cause 1"] ?? 4;
//     if (root2 === -1) date = fallback["root cause 2"] ?? 6;

//     const len = headers.length || FIXED_HEADERS.length;
//     timestamp = Math.max(0, Math.min(timestamp, len - 1));
//     date = Math.max(0, Math.min(date, len - 1));
//     value = Math.max(0, Math.min(value, len - 1));
//     target = Math.max(0, Math.min(target, len - 1));
//     root1 = Math.max(0, Math.min(root1, len - 1));
//     root2 = Math.max(0, Math.min(root2, len - 1));

//     return { timestamp, date, value, target, root1, root2 };
//   }

//   // build row array
//   function buildRow(headers, inputs) {
//     const len = headers.length;
//     const row = Array.from({ length: len }).map(() => "");
//     const idx = detectIndexes(headers);

//     row[idx.timestamp] = inputs.timestamp || nowTimeString();
//     row[idx.date] = inputs.date || todayIso();
//     row[idx.value] = inputs.kpiValue !== undefined && inputs.kpiValue !== null ? String(inputs.kpiValue) : "";
//     row[idx.target] = inputs.targetValue !== undefined && inputs.targetValue !== null ? String(inputs.targetValue) : "";

//     // root1
//     if (inputs.rootCause1 === "__custom__") row[idx.root1] = inputs.rootCause1Custom || "";
//     else row[idx.root1] = inputs.rootCause1 || "";

//     const time1Index = idx.root1 + 1 < len ? idx.root1 + 1 : null;
//     if (time1Index !== null) row[time1Index] = inputs.time1 || "";

//     // root2
//     if (inputs.rootCause2 === "__custom__") row[idx.root2] = inputs.rootCause2Custom || "";
//     else row[idx.root2] = inputs.rootCause2 || "";

//     const time2Index = idx.root2 + 1 < len ? idx.root2 + 1 : null;
//     if (time2Index !== null) row[time2Index] = inputs.time2 || "";

//     return row;
//   }

//   // validate inputs
//   function validateInputs(kpi, inputs) {
//     if (
//       (inputs.kpiValue === "" || inputs.kpiValue === null) &&
//       (inputs.targetValue === "" || inputs.targetValue === null) &&
//       !inputs.rootCause1 && !inputs.rootCause1Custom && !inputs.rootCause2 && !inputs.rootCause2Custom
//     ) {
//       return { ok: false, message: "Please enter at least KPI value, target or a root cause." };
//     }
//     if (inputs.kpiValue !== "" && isNaN(Number(inputs.kpiValue))) return { ok: false, message: "KPI Value must be numeric." };
//     if (inputs.targetValue !== "" && isNaN(Number(inputs.targetValue))) return { ok: false, message: "Target Value must be numeric." };
//     return { ok: true };
//   }

//   // Save one KPI
//   async function saveKpi(kpi) {
//     const kpiId = kpi.id;
//     const entry = stateMap[kpiId];
//     if (!entry) return;
//     const inputs = entry.inputs || {};

//     const v = validateInputs(kpi, inputs);
//     if (!v.ok) return alert(v.message);

//     updateKpiState(kpiId, { saving: true });
//     try {
//       const preview = await fetchPreview(kpiId);
//       const headers = Array.isArray(preview.headers) && preview.headers.length ? preview.headers.slice() : FIXED_HEADERS.slice();
//       const rows = Array.isArray(preview.rows) ? preview.rows.map(r => Array.isArray(r) ? [...r] : [...r]) : [];

//       const newRow = buildRow(headers, inputs);
//       if (newRow.length < headers.length) {
//         while (newRow.length < headers.length) newRow.push("");
//       } else if (newRow.length > headers.length) {
//         newRow.length = headers.length;
//       }

//       rows.push(newRow);
//       await api.put(`/kpis/${encodeURIComponent(kpiId)}/data`, { headers, rows });

//       updateKpiState(kpiId, {
//         preview: { headers, rows },
//         saving: false,
//         inputs: {
//           ...entry.inputs,
//           timestamp: nowTimeString(),
//           kpiValue: "",
//           time1: "",
//           rootCause1: "",
//           rootCause1Custom: "",
//           time2: "",
//           rootCause2: "",
//           rootCause2Custom: ""
//           // note: targetValue retained unless user cleared it (per requirement)
//         }
//       });

//       // try to refresh attributes from server
//       try {
//         const updatedRes = await api.get(`/kpis/${encodeURIComponent(kpiId)}`);
//         const updated = updatedRes.data;
//         if (updated && Array.isArray(updated.attributes)) updateKpiState(kpiId, { attributes: [...updated.attributes] });
//       } catch (e) {
//         // ignore
//       }

//       alert(`Saved entry for "${kpi.name || kpiId}"`);
//     } catch (err) {
//       console.error("Failed to save KPI row", err);
//       alert(err?.response?.data?.error || err?.message || "Save failed");
//       updateKpiState(kpiId, { saving: false });
//     }
//   }

//   // Save all sequentially
//   async function handleSaveAll() {
//     setSavingAll(true);
//     try {
//       for (const kpi of kpis) {
//         const st = stateMap[kpi.id];
//         if (!st) continue;
//         const inputs = st.inputs || {};
//         if (
//           (inputs.kpiValue === "" || inputs.kpiValue == null) &&
//           (inputs.targetValue === "" || inputs.targetValue == null) &&
//           !inputs.rootCause1 && !inputs.rootCause1Custom && !inputs.rootCause2 && !inputs.rootCause2Custom
//         ) continue;
//         await saveKpi(kpi);
//       }
//       for (const kpi of kpis) {
//         await fetchPreview(kpi.id);
//       }
//     } finally {
//       setSavingAll(false);
//     }
//   }

//   // Root cause select renderer
//   function renderRootCauseSelect(kpiId, which = 1) {
//     const entry = stateMap[kpiId];
//     const attrs = (entry && Array.isArray(entry.attributes)) ? entry.attributes : [];
//     const inputs = entry?.inputs || {};
//     const selected = which === 1 ? inputs.rootCause1 : inputs.rootCause2;
//     const custom = which === 1 ? inputs.rootCause1Custom : inputs.rootCause2Custom;

//     const handleChange = (e) => {
//       const v = e.target.value;
//       if (v === "__custom__") {
//         if (which === 1) updateKpiInputs(kpiId, { rootCause1: "__custom__", rootCause1Custom: "" });
//         else updateKpiInputs(kpiId, { rootCause2: "__custom__", rootCause2Custom: "" });
//       } else {
//         if (which === 1) updateKpiInputs(kpiId, { rootCause1: v, rootCause1Custom: "" });
//         else updateKpiInputs(kpiId, { rootCause2: v, rootCause2Custom: "" });
//       }
//     };

//     return (
//       <select
//         value={selected || (custom ? "__custom__" : "")}
//         onChange={handleChange}
//         className="p-2 border rounded w-full bg-white text-sm"
//       >
//         <option value="">(none)</option>
//         <option value="__custom__">(custom)</option>
//         {attrs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
//       </select>
//     );
//   }

//   function handleTargetManualEdit(kpiId, v) {
//     updateKpiInputs(kpiId, { targetValue: v, targetValueEditable: true });
//   }

//   // --- IMPORTANT: top-level effect that syncs auto-filled target values for all KPIs
//   useEffect(() => {
//     // For each KPI: if user's not manually edited the target (targetValueEditable === false),
//     // compute default target and update the entry inputs if different.
//     if (!kpis || kpis.length === 0) return;

//     kpis.forEach(kpi => {
//       const entry = stateMap[kpi.id];
//       if (!entry) return;
//       const inputs = entry.inputs || {};
//       if (inputs.targetValueEditable) return; // user already edited, don't overwrite

//       const act = normalizeAction(kpi.action);
//       const tv = kpi.targetValue;
//       const tl = kpi.targetLowerValue;
//       const tu = kpi.targetUpperValue;
//       let defaultTarget = "";
//       if (act === "increase" || act === "decrease") {
//         defaultTarget = tv != null ? String(tv) : "";
//       } else if (act === "maximize") {
//         defaultTarget = tu != null ? String(tu) : "";
//       } else if (act === "minimize") {
//         defaultTarget = tl != null ? String(tl) : "";
//       } else if (act === "maintain") {
//         if (tl != null && tu != null && !Number.isNaN(Number(tl)) && !Number.isNaN(Number(tu))) {
//           const avg = (Number(tl) + Number(tu)) / 2;
//           defaultTarget = String(Number.isInteger(avg) ? avg : Number(avg.toFixed(2)));
//         } else if (tl != null) defaultTarget = String(tl);
//         else if (tu != null) defaultTarget = String(tu);
//         else if (tv != null) defaultTarget = String(tv);
//         else defaultTarget = "";
//       } else {
//         defaultTarget = tv != null ? String(tv) : "";
//       }

//       if (defaultTarget !== inputs.targetValue) {
//         // update target value to new default
//         updateKpiInputs(kpi.id, { targetValue: defaultTarget });
//       }
//     });
//     // only run when kpis list or stateMap changes
//   }, [kpis, stateMap]);

//   if (loading) return <LoadingBox text="Loading KPIs..." />;
//   if (error) return <div className="p-4 text-red-600">Error loading KPIs: {error}</div>;

//   return (
//     <div className="p-4 max-w-6xl mx-auto">
//       <div className="flex items-center justify-between mb-4">
//         <h1 className="text-2xl font-bold">Daily Entry</h1>
//         <div className="flex gap-2">
//           <button onClick={() => navigate(-1)} className="px-3 py-1 bg-slate-100 rounded">Back</button>
//           <button onClick={handleSaveAll} disabled={savingAll} className="px-3 py-1 bg-emerald-600 text-white rounded">
//             {savingAll ? "Saving..." : "Save All"}
//           </button>
//         </div>
//       </div>

//       {kpis.length === 0 && (
//         <div className="p-4 bg-white rounded shadow-sm">No KPIs found for this plant.</div>
//       )}

//       <table className="w-full border-collapse">
//         <tbody>
//           {kpis.map(kpi => {
//             const entry = stateMap[kpi.id] || makeInitialKpiState(kpi);
//             const inputs = entry.inputs || {};
//             const attrs = entry.attributes || [];

//             return (
//               <tr key={kpi.id} className="bg-white border-b">
//                 <td className="p-2 w-1/4">
//                   <div className="font-semibold">{kpi.name}</div>
//                   <div className="text-sm text-slate-600">{kpi.description || "—"}</div>
//                 </td>
//                 <td className="p-2">
//                   <div className="flex items-center gap-2">
//                     <div className="flex-grow grid grid-cols-8 gap-2">
//                       <div>
//                         <label className="text-xs text-slate-500">Timestamp</label>
//                         <input className="p-2 border rounded w-full text-sm" value={inputs.timestamp} onChange={(e) => updateKpiInputs(kpi.id, { timestamp: e.target.value })} />
//                       </div>
//                       <div>
//                         <label className="text-xs text-slate-500">Date</label>
//                         <input type="date" className="p-2 border rounded w-full text-base" value={inputs.date} onChange={(e) => updateKpiInputs(kpi.id, { date: e.target.value })} style={{ fontSize: '16px', padding: '4px' }} />
//                       </div>
//                       <div>
//                         <label className="text-xs text-slate-500">KPI Value</label>
//                         <input type="number" className="p-2 border rounded w-full text-sm" value={inputs.kpiValue} onChange={(e) => updateKpiInputs(kpi.id, { kpiValue: e.target.value })} />
//                       </div>
//                       <div>
//                         <label className="text-xs text-slate-500">Target Value</label>
//                         <input type="number" className="p-2 border rounded w-full text-sm" value={inputs.targetValue} onChange={(e) => handleTargetManualEdit(kpi.id, e.target.value)} />
//                       </div>
//                       <div>
//                         <label className="text-xs text-slate-500">Root Cause 1</label>
//                         {renderRootCauseSelect(kpi.id, 1)}
//                         {(inputs.rootCause1 === "__custom__" || inputs.rootCause1Custom) && (
//                           <input value={inputs.rootCause1Custom} onChange={(e) => updateKpiInputs(kpi.id, { rootCause1Custom: e.target.value })} className="mt-1 p-2 border rounded w-full text-sm" />
//                         )}
//                       </div>
//                       <div>
//                         <label className="text-xs text-slate-500">Time</label>
//                         <input className="p-2 border rounded w-full text-sm" value={inputs.time1} onChange={(e) => updateKpiInputs(kpi.id, { time1: e.target.value })} />
//                       </div>
//                       <div>
//                         <label className="text-xs text-slate-500">Root Cause 2</label>
//                         {renderRootCauseSelect(kpi.id, 2)}
//                         {(inputs.rootCause2 === "__custom__" || inputs.rootCause2Custom) && (
//                           <input value={inputs.rootCause2Custom} onChange={(e) => updateKpiInputs(kpi.id, { rootCause2Custom: e.target.value })} className="mt-1 p-2 border rounded w-full text-sm" />
//                         )}
//                       </div>
//                       <div>
//                         <label className="text-xs text-slate-500">Time</label>
//                         <input className="p-2 border rounded w-full text-sm" value={inputs.time2} onChange={(e) => updateKpiInputs(kpi.id, { time2: e.target.value })} />
//                       </div>
//                     </div>
//                     <div className="flex flex-col gap-2">
//                       <button onClick={() => {
//                         updateKpiState(kpi.id, {
//                           inputs: {
//                             ...entry.inputs,
//                             timestamp: nowTimeString(),
//                             kpiValue: "",
//                             time1: "",
//                             rootCause1: "",
//                             rootCause1Custom: "",
//                             time2: "",
//                             rootCause2: "",
//                             rootCause2Custom: ""
//                           }
//                         });
//                       }} className="px-3 py-1 bg-slate-100 rounded text-sm">Reset</button>
//                       <button disabled={entry.saving} onClick={() => saveKpi(kpi)} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">
//                         {entry.saving ? "Saving..." : "Save"}
//                       </button>
//                     </div>
//                   </div>
//                 </td>
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>
//     </div>
//   );
// }


// client/src/pages/KpiDailyEntry.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";

/* --- helpers --- */
function nowTimeString() {
  const d = new Date();
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayDisplayFormat() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}-${m}-${y}`;
}
function nowDateTimeString() {
  const d = new Date();
  const date = todayDisplayFormat();
  const time = nowTimeString();
  return `${date} ${time}`;
}
function LoadingBox({ text = "Loading..." }) {
  return <div className="p-3 bg-white rounded shadow-sm text-sm text-slate-500">{text}</div>;
}
function normalizeAction(a) {
  if (!a) return "maintain";
  if (String(a) === "sustain") return "maintain";
  return String(a);
}

/* --- header factories --- */
function headersForAction(action) {
  action = normalizeAction(action);
  const rootPairs = [];
  for (let i = 1; i <= 5; i++) {
    rootPairs.push(`Root Cause ${i}`);
    rootPairs.push(`Time ${i}`);
  }
  if (action === "maintain") {
    return ["Timestamp", "Date", "KPI Value", "Target Lower", "Target Upper", ...rootPairs];
  } else {
    // increase/decrease/maximize/minimize: single target col
    return ["Timestamp", "Date", "KPI Value", "Target Value", ...rootPairs];
  }
}

/* --- component --- */
export default function KpiDailyEntry() {
  const { plantId } = useParams();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stateMap, setStateMap] = useState({}); // per-kpi state
  const [error, setError] = useState(null);
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    loadKpis();
    // eslint-disable-next-line
  }, [plantId]);

  async function loadKpis() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/kpis/plant/${encodeURIComponent(plantId)}`);
      const list = Array.isArray(res.data) ? res.data : [];
      setKpis(list);

      const map = {};
      for (const k of list) {
        map[k.id] = makeInitialKpiState(k);
      }
      setStateMap(map);

      // fetch details for each KPI to populate attributes (and ensure we have latest)
      await Promise.all(list.map(async (k) => {
        try {
          const detailRes = await api.get(`/kpis/${encodeURIComponent(k.id)}`);
          if (detailRes.data && Array.isArray(detailRes.data.attributes)) {
            setStateMap(prev => ({
              ...prev,
              [k.id]: {
                ...(prev[k.id] || makeInitialKpiState(k)),
                attributes: detailRes.data.attributes
              }
            }));
          }
        } catch (err) {
          console.warn("Failed to fetch KPI details for", k.id, err);
        }
      }));
    } catch (err) {
      console.error("Failed to load KPIs", err);
      setError(err?.message || "Failed to load KPIs");
      setKpis([]);
      setStateMap({});
    } finally {
      setLoading(false);
    }
  }

  function makeInitialKpiState(kpi) {
    const act = normalizeAction(kpi?.action);
    const tv = kpi?.targetValue;
    const tl = kpi?.targetLowerValue;
    const tu = kpi?.targetUpperValue;

    // default target(s) logic
    let defaultSingle = "";
    let defaultLower = "";
    let defaultUpper = "";
    if (act === "maintain") {
      if (tl != null) defaultLower = String(tl);
      if (tu != null) defaultUpper = String(tu);
      // if both exist, default for target might be average but we keep two explicit fields
    } else {
      if (act === "increase" || act === "decrease") defaultSingle = tv != null ? String(tv) : "";
      else if (act === "maximize") defaultSingle = tu != null ? String(tu) : "";
      else if (act === "minimize") defaultSingle = tl != null ? String(tl) : "";
      else defaultSingle = tv != null ? String(tv) : "";
    }

    return {
      preview: null, // { headers, rows }
      busy: false,
      saving: false,
      attributes: Array.isArray(kpi?.attributes) ? [...kpi.attributes] : [],
      inputs: {
        timestamp: nowDateTimeString(),
        date: todayDisplayFormat(),
        kpiValue: "",
        // single target (for non-maintain)
        targetValue: defaultSingle,
        targetValueEditable: false,
        // maintain targets
        targetLower: defaultLower,
        targetLowerEditable: false,
        targetUpper: defaultUpper,
        targetUpperEditable: false,
        // up to 5 root causes/time pairs
        // rootCauseN stores either attribute id or "__custom__" or empty
        // rootCauseNCustom stores custom text when "__custom__" selected
        rootCause1: "",
        rootCause1Custom: "",
        time1: "",
        rootCause2: "",
        rootCause2Custom: "",
        time2: "",
        rootCause3: "",
        rootCause3Custom: "",
        time3: "",
        rootCause4: "",
        rootCause4Custom: "",
        time4: "",
        rootCause5: "",
        rootCause5Custom: "",
        time5: ""
      }
    };
  }

  /* --- state helpers --- */
  function updateKpiState(kpiId, patch) {
    setStateMap(prev => ({ ...prev, [kpiId]: { ...(prev[kpiId] || {}), ...patch } }));
  }
  function updateKpiInputs(kpiId, patch) {
    setStateMap(prev => {
      const entry = prev[kpiId] || {};
      const inputs = { ...(entry.inputs || {}), ...patch };
      return { ...prev, [kpiId]: { ...entry, inputs } };
    });
  }

  /* --- preview fetch (returns headers/rows); caches preview in stateMap --- */
  async function fetchPreview(kpiId) {
    const entry = stateMap[kpiId];
    if (entry && entry.preview) return entry.preview;
    updateKpiState(kpiId, { busy: true });
    try {
      const res = await api.get(`/uploads/${encodeURIComponent(kpiId)}/preview?limit=999999`);
      const data = res.data || { headers: [], rows: [] };
      const headers = Array.isArray(data.headers) && data.headers.length ? data.headers : headersForAction(normalizeAction((kpis.find(k => k.id === kpiId) || {}).action));
      const rows = Array.isArray(data.rows) ? data.rows : [];
      const preview = { headers, rows };
      updateKpiState(kpiId, { preview, busy: false });
      return preview;
    } catch (err) {
      console.error("Failed to fetch preview for", kpiId, err);
      const preview = { headers: headersForAction(normalizeAction((kpis.find(k => k.id === kpiId) || {}).action)), rows: [] };
      updateKpiState(kpiId, { preview, busy: false });
      return preview;
    }
  }

  /* --- index detection helpers for dynamic headers --- */
  function detectIndexes(headers = []) {
    const h = headers.map(x => (x || "").toString().trim().toLowerCase());
    const byName = name => {
      const idx = h.findIndex(s => s === name.toLowerCase());
      if (idx !== -1) return idx;
      // try contains
      const idx2 = h.findIndex(s => s.indexOf(name.toLowerCase()) !== -1);
      return idx2;
    };

    const timestamp = byName("timestamp") ?? 0;
    const date = byName("date") ?? 1;
    const value = (() => {
      const names = ["kpi value", "value", "actual", "produced", "qty", "quantity", "measure"];
      for (const n of names) {
        const i = byName(n);
        if (i !== -1) return i;
      }
      return 2;
    })();

    // detect target columns: maintain has two (lower/upper) else single
    const targetLower = (byName("target lower") !== -1) ? byName("target lower") : -1;
    const targetUpper = (byName("target upper") !== -1) ? byName("target upper") : -1;
    const targetSingle = (byName("target value") !== -1) ? byName("target value") : -1;

    // root cause / time indices arrays for up to 5
    const rootIdxs = [];
    const timeIdxs = [];
    for (let i = 1; i <= 5; i++) {
      const rNameCandidates = [`root cause ${i}`, `rootcause ${i}`, `root ${i}`, `root cause`];
      let foundR = -1;
      for (const c of rNameCandidates) {
        const f = byName(c);
        if (f !== -1) { foundR = f; break; }
      }
      // fallback: find first header that matches "root" if none
      if (foundR === -1) {
        const anyRoot = h.findIndex(s => /^root\b/.test(s) || s.indexOf("root") !== -1);
        if (anyRoot !== -1) foundR = anyRoot;
      }
      rootIdxs.push(foundR);

      // time column likely immediately after this root cause (common pattern), else try headers names
      const tNameCandidates = [`time ${i}`, `time${i}`, `time`];
      let foundT = -1;
      for (const c of tNameCandidates) {
        const f = byName(c);
        if (f !== -1) { foundT = f; break; }
      }
      timeIdxs.push(foundT);
    }

    // As a final fallback, if the header array matches the fixed headers we expect, map them accordingly:
    const fixed = headersForAction("maintain").map(s => s.toLowerCase());
    if (headers.length === fixed.length && fixed.every((x, i) => h[i] === x || h[i].indexOf(x) !== -1)) {
      // map by position
      const timestampPos = 0, datePos = 1, valuePos = 2;
      const isMaintain = headers.length > 13; // maintain variant has 15
      const result = {
        timestamp: timestampPos,
        date: datePos,
        value: valuePos,
        targetSingle: isMaintain ? -1 : 3,
        targetLower: isMaintain ? 3 : -1,
        targetUpper: isMaintain ? 4 : -1,
        rootIdxs: [],
        timeIdxs: []
      };
      let start = isMaintain ? 5 : 4;
      for (let i = 0; i < 5; i++) {
        result.rootIdxs.push(start + i * 2);
        result.timeIdxs.push(start + i * 2 + 1);
      }
      return result;
    }

    // final sanitization - ensure indices are within bounds or -1
    const len = headers.length;
    function normalizeIdx(i) {
      if (i === undefined || i === null) return -1;
      const n = Number(i);
      if (Number.isInteger(n) && n >= 0 && n < len) return n;
      return -1;
    }

    return {
      timestamp: normalizeIdx(timestamp),
      date: normalizeIdx(date),
      value: normalizeIdx(value),
      targetSingle: normalizeIdx(targetSingle),
      targetLower: normalizeIdx(targetLower),
      targetUpper: normalizeIdx(targetUpper),
      rootIdxs: rootIdxs.map(normalizeIdx),
      timeIdxs: timeIdxs.map(normalizeIdx)
    };
  }

  /* --- build row given headers and inputs --- */
  function buildRow(headers, inputs) {
    const len = Math.max(0, headers.length);
    const row = Array.from({ length: len }).map(() => "");
    const idx = detectIndexes(headers);

    if (idx.timestamp !== -1) row[idx.timestamp] = inputs.timestamp || nowDateTimeString();
    if (idx.date !== -1) row[idx.date] = inputs.date || todayDisplayFormat();
    if (idx.value !== -1) row[idx.value] = inputs.kpiValue !== undefined && inputs.kpiValue !== null ? String(inputs.kpiValue) : "";

    // target columns
    if (idx.targetSingle !== -1) {
      row[idx.targetSingle] = inputs.targetValue !== undefined && inputs.targetValue !== null ? String(inputs.targetValue) : "";
    } else {
      if (idx.targetLower !== -1) row[idx.targetLower] = inputs.targetLower !== undefined && inputs.targetLower !== null ? String(inputs.targetLower) : "";
      if (idx.targetUpper !== -1) row[idx.targetUpper] = inputs.targetUpper !== undefined && inputs.targetUpper !== null ? String(inputs.targetUpper) : "";
    }

    // root causes/time pairs up to 5
    for (let i = 0; i < 5; i++) {
      const rIdx = idx.rootIdxs[i];
      const tIdx = idx.timeIdxs[i];
      const rVal = inputs[`rootCause${i + 1}`];
      const rCustom = inputs[`rootCause${i + 1}Custom`];
      const tVal = inputs[`time${i + 1}`];

      if (rIdx !== -1) {
        if (rVal === "__custom__") row[rIdx] = rCustom || "";
        else row[rIdx] = rVal || "";
      }
      if (tIdx !== -1) {
        row[tIdx] = tVal || "";
      }
    }

    return row;
  }

  /* --- validation --- */
  function validateInputs(kpi, inputs) {
    // require at least one of KPI value / target(s) / any root cause provided
    const anyRoot = [1,2,3,4,5].some(i => inputs[`rootCause${i}`] || inputs[`rootCause${i}Custom`]);
    const hasValue = inputs.kpiValue !== "" && inputs.kpiValue !== null;
    const hasTargetSingle = inputs.targetValue !== "" && inputs.targetValue !== null;
    const hasTargetMaintain = (inputs.targetLower !== "" && inputs.targetLower != null) || (inputs.targetUpper !== "" && inputs.targetUpper != null);

    if (!hasValue && !hasTargetSingle && !hasTargetMaintain && !anyRoot) {
      return { ok: false, message: "Please enter at least KPI value, target or a root cause." };
    }
    if (hasValue && isNaN(Number(inputs.kpiValue))) return { ok: false, message: "KPI Value must be numeric." };
    if (hasTargetSingle && isNaN(Number(inputs.targetValue))) return { ok: false, message: "Target Value must be numeric." };
    if (inputs.targetLower !== "" && inputs.targetLower != null && isNaN(Number(inputs.targetLower))) return { ok: false, message: "Target Lower must be numeric." };
    if (inputs.targetUpper !== "" && inputs.targetUpper != null && isNaN(Number(inputs.targetUpper))) return { ok: false, message: "Target Upper must be numeric." };
    return { ok: true };
  }

  /* --- save single KPI --- */
  async function saveKpi(kpi, skipAlert = false) {
    const kpiId = kpi.id;
    const entry = stateMap[kpiId];
    if (!entry) return;
    const inputs = entry.inputs || {};

    const v = validateInputs(kpi, inputs);
    if (!v.ok) return alert(v.message);

    updateKpiState(kpiId, { saving: true });
    try {
      const preview = await fetchPreview(kpiId);
      const headers = Array.isArray(preview.headers) && preview.headers.length ? preview.headers.slice() : headersForAction(normalizeAction(kpi.action));
      const rows = Array.isArray(preview.rows) ? preview.rows.map(r => Array.isArray(r) ? [...r] : [...r]) : [];

      // Prevent duplicate date entries
      const idxs = detectIndexes(headers);
      const dateIdx = idxs.date;
      if (dateIdx !== -1) {
        const d = inputs.date || todayIso();
        const duplicate = rows.some(r => (r && r[dateIdx]) === d);
        if (duplicate) {
          if (!skipAlert) alert(`An entry for ${d} already exists for "${kpi.name || kpiId}".`);
          updateKpiState(kpiId, { saving: false });
          return;
        }
      }

      const newRow = buildRow(headers, inputs);

      // normalize length
      if (newRow.length < headers.length) {
        while (newRow.length < headers.length) newRow.push("");
      } else if (newRow.length > headers.length) {
        newRow.length = headers.length;
      }

      rows.push(newRow);
      await api.put(`/kpis/${encodeURIComponent(kpiId)}/data`, { headers, rows });

      // Add any custom root causes as attributes to the database
      await addCustomAttributesToDatabase(kpiId, inputs);

      // reset inputs (keep target values unless user cleared them)
      const preserved = { ...inputs };
      const resetFields = {
        timestamp: nowDateTimeString(),
        kpiValue: "",
        // clear root causes/time pairs
        time1: "", rootCause1: "", rootCause1Custom: "",
        time2: "", rootCause2: "", rootCause2Custom: "",
        time3: "", rootCause3: "", rootCause3Custom: "",
        time4: "", rootCause4: "", rootCause4Custom: "",
        time5: "", rootCause5: "", rootCause5Custom: ""
      };
      updateKpiState(kpiId, {
        preview: { headers, rows },
        saving: false,
        inputs: { ...preserved, ...resetFields }
      });

      // attempt to refresh attributes from server to include newly added custom attributes
      try {
        const updatedRes = await api.get(`/kpis/${encodeURIComponent(kpiId)}`);
        if (updatedRes.data && Array.isArray(updatedRes.data.attributes)) {
          updateKpiState(kpiId, { attributes: [...updatedRes.data.attributes] });
        }
      } catch (e) { /* ignore */ }

      // Only show alert if not called from Save All
      if (!skipAlert) {
        alert(`Saved entry for "${kpi.name || kpiId}"`);
      }
    } catch (err) {
      console.error("Failed to save KPI row", err);
      alert(err?.response?.data?.error || err?.message || "Save failed");
      updateKpiState(kpiId, { saving: false });
    }
  }

  /* --- save all non-empty entries sequentially --- */
  async function handleSaveAll() {
    setSavingAll(true);
    let savedCount = 0;
    let errorCount = 0;
    const duplicateMessages = [];
    
    try {
      for (const kpi of kpis) {
        const st = stateMap[kpi.id];
        if (!st) continue;
        const inputs = st.inputs || {};
        const anyRoot = [1,2,3,4,5].some(i => inputs[`rootCause${i}`] || inputs[`rootCause${i}Custom`]);
        const hasValue = inputs.kpiValue !== "" && inputs.kpiValue != null;
        const hasTargetSingle = inputs.targetValue !== "" && inputs.targetValue != null;
        const hasTargetMaintain = (inputs.targetLower !== "" && inputs.targetLower != null) || (inputs.targetUpper !== "" && inputs.targetUpper != null);
        
        if (!hasValue && !hasTargetSingle && !hasTargetMaintain && !anyRoot) continue;
        
        // Duplicate date guard per KPI
        try {
          const preview = await fetchPreview(kpi.id);
          const headers = Array.isArray(preview.headers) ? preview.headers : [];
          const rows = Array.isArray(preview.rows) ? preview.rows : [];
          const idxs = detectIndexes(headers);
          const dateIdx = idxs.date;
          if (dateIdx !== -1) {
            const d = inputs.date || todayIso();
            const duplicate = rows.some(r => (r && r[dateIdx]) === d);
            if (duplicate) {
              duplicateMessages.push(`${kpi.name || kpi.id}: ${d}`);
              errorCount++;
              continue; // skip saving this KPI
            }
          }
        } catch (e) {
          // if preview fails, proceed and let saveKpi handle errors
        }
        
        try {
          await saveKpi(kpi, true); // skipAlert = true
          savedCount++;
        } catch (err) {
          console.error(`Failed to save KPI ${kpi.name}:`, err);
          errorCount++;
        }
      }
      
      // refresh previews after batch
      for (const kpi of kpis) {
        await fetchPreview(kpi.id);
      }
      
      // Single confirmation message
      if (savedCount > 0 && errorCount === 0) {
        alert(`Successfully saved ${savedCount} KPI entries!`);
      } else if (savedCount > 0 && errorCount > 0) {
        const dupText = duplicateMessages.length ? `\nDuplicate dates:\n- ${duplicateMessages.join("\n- ")}` : "";
        alert(`Saved ${savedCount} KPI entries successfully. ${errorCount} entries failed to save.${dupText}`);
      } else if (errorCount > 0) {
        const dupText = duplicateMessages.length ? `\nDuplicate dates:\n- ${duplicateMessages.join("\n- ")}` : "";
        alert(`Failed to save ${errorCount} KPI entries. Please check the data and try again.${dupText}`);
      } else {
        alert("No entries to save. Please fill in at least one KPI.");
      }
    } finally {
      setSavingAll(false);
    }
  }

  /* --- UI: root cause select --- */
  function renderRootCauseSelect(kpiId, which = 1) {
    const entry = stateMap[kpiId] || {};
    const attrs = Array.isArray(entry.attributes) ? entry.attributes : [];
    const inputs = entry.inputs || {};
    const selected = inputs[`rootCause${which}`];
    const custom = inputs[`rootCause${which}Custom`];

    const handleChange = (e) => {
      const v = e.target.value;
      if (v === "__custom__") {
        updateKpiInputs(kpiId, { [`rootCause${which}`]: "__custom__", [`rootCause${which}Custom`]: "" });
      } else {
        updateKpiInputs(kpiId, { [`rootCause${which}`]: v, [`rootCause${which}Custom`]: "" });
      }
    };

    return (
      <select
        value={selected || (custom ? "__custom__" : "")}
        onChange={handleChange}
        className="p-2 border rounded w-full bg-white text-sm"
      >
        <option value="">(none)</option>
        <option value="__custom__">(custom)</option>
        {attrs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    );
  }

  /* --- auto-add custom attributes to database --- */
  async function addCustomAttributesToDatabase(kpiId, inputs) {
    const customAttributes = [];
    
    // Collect all custom root causes
    for (let i = 1; i <= 5; i++) {
      const rootCause = inputs[`rootCause${i}`];
      const customText = inputs[`rootCause${i}Custom`];
      
      if (rootCause === "__custom__" && customText && customText.trim()) {
        customAttributes.push(customText.trim());
      }
    }
    
    // Add each unique custom attribute to the database
    let anyAdded = false;
    for (const customAttr of customAttributes) {
      try {
        const res = await api.post(`/kpis/${encodeURIComponent(kpiId)}/attributes`, {
          name: customAttr
          // Don't send count so backend will scan data and update count
        });
        console.log(`Added custom attribute: ${customAttr}`);
        // Update local state immediately if we got a response
        if (res && res.data) {
          const currentEntry = stateMap[kpiId] || {};
          const currentAttrs = Array.isArray(currentEntry.attributes) ? currentEntry.attributes : [];
          // Only add if not already present
          if (!currentAttrs.some(x => x.id === res.data.id)) {
            updateKpiState(kpiId, { 
              attributes: [...currentAttrs, res.data] 
            });
          }
          anyAdded = true;
        }
      } catch (err) {
        // Ignore if attribute already exists or other errors
        console.warn(`Failed to add custom attribute "${customAttr}":`, err?.response?.data?.error || err?.message);
      }
    }
    
    // If any attributes were added but we couldn't update state directly, refresh from server
    if (customAttributes.length > 0 && !anyAdded) {
      try {
        const kpiRes = await api.get(`/kpis/${encodeURIComponent(kpiId)}`);
        if (kpiRes.data && Array.isArray(kpiRes.data.attributes)) {
          updateKpiState(kpiId, { attributes: [...kpiRes.data.attributes] });
        }
      } catch (err) {
        console.warn('Failed to refresh attributes:', err);
      }
    }
  }
  // Target values are now fixed and read-only in daily entry
  // They can only be modified in KPI creation/edit forms
  function handleTargetManualEdit(kpiId, field, value) {
    // This function is no longer used for editing targets in daily entry
    // Keeping for backward compatibility but targets remain read-only
    console.warn('Target values are read-only in daily entry. Use KPI edit form to modify targets.');
  }

  /* --- auto-fill effect for targets (synchronise to KPI metadata if user hasn't edited) --- */
  useEffect(() => {
    if (!kpis || kpis.length === 0) return;
    // For each KPI: if user's not manually edited the target(s), compute defaults and update inputs
    kpis.forEach(kpi => {
      const entry = stateMap[kpi.id];
      if (!entry) return;
      const inputs = entry.inputs || {};
      const act = normalizeAction(kpi.action);
      // compute defaults
      if (act === "maintain") {
        const tl = kpi.targetLowerValue;
        const tu = kpi.targetUpperValue;
        const defaultLower = tl != null ? String(tl) : "";
        const defaultUpper = tu != null ? String(tu) : "";
        if (!inputs.targetLowerEditable && inputs.targetLower !== defaultLower) {
          updateKpiInputs(kpi.id, { targetLower: defaultLower });
        }
        if (!inputs.targetUpperEditable && inputs.targetUpper !== defaultUpper) {
          updateKpiInputs(kpi.id, { targetUpper: defaultUpper });
        }
      } else {
        let defaultSingle = "";
        const tv = kpi.targetValue;
        const tl = kpi.targetLowerValue;
        const tu = kpi.targetUpperValue;
        if (act === "increase" || act === "decrease") defaultSingle = tv != null ? String(tv) : "";
        else if (act === "maximize") defaultSingle = tu != null ? String(tu) : "";
        else if (act === "minimize") defaultSingle = tl != null ? String(tl) : "";
        else defaultSingle = tv != null ? String(tv) : "";
        if (!inputs.targetValueEditable && inputs.targetValue !== defaultSingle) {
          updateKpiInputs(kpi.id, { targetValue: defaultSingle });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpis, stateMap]);

  if (loading) return <LoadingBox text="Loading KPIs..." />;
  if (error) return <div className="p-4 text-red-600">Error loading KPIs: {error}</div>;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Daily Entry</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate(-1)} className="px-3 py-1 bg-slate-100 rounded">Back</button>
          <button onClick={handleSaveAll} disabled={savingAll} className="px-3 py-1 bg-emerald-600 text-white rounded">
            {savingAll ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {kpis.length === 0 && (
        <div className="p-4 bg-white rounded shadow-sm">No KPIs found for this plant.</div>
      )}

      <div className="space-y-4">
        {kpis.map(kpi => {
          const entry = stateMap[kpi.id] || makeInitialKpiState(kpi);
          const inputs = entry.inputs || {};
          const headers = (entry.preview && Array.isArray(entry.preview.headers) && entry.preview.headers.length)
            ? entry.preview.headers
            : headersForAction(normalizeAction(kpi.action));
          const isMaintain = normalizeAction(kpi.action) === "maintain";

          return (
            <div key={kpi.id} className="bg-white border rounded p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">{kpi.name}</div>
                  <div className="text-sm text-slate-600 mt-1">{kpi.description || "—"}</div>
                </div>

                <div className="flex flex-col gap-2">
                  <button onClick={() => fetchPreview(kpi.id)} className="px-3 py-1 bg-slate-100 rounded text-sm">Refresh Preview</button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                <div className="lg:col-span-3">
                  <label className="block text-xs text-slate-500">Timestamp (Fixed)</label>
                  <input className="p-2 border rounded w-full bg-gray-100" value={inputs.timestamp} readOnly disabled />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs text-slate-500">Date (Fixed)</label>
                  <input className="p-2 border rounded w-full bg-gray-100" value={inputs.date} readOnly disabled />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs text-slate-500">KPI Value</label>
                  <input type="number" className="p-2 border rounded w-full" value={inputs.kpiValue} onChange={(e) => updateKpiInputs(kpi.id, { kpiValue: e.target.value })} />
                </div>

                {isMaintain ? (
                  <>
                    <div className="lg:col-span-2">
                      <label className="block text-xs text-slate-500">Target Lower (Fixed)</label>
                      <input type="number" className="p-2 border rounded w-full bg-gray-100" value={inputs.targetLower} readOnly disabled />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-xs text-slate-500">Target Upper (Fixed)</label>
                      <input type="number" className="p-2 border rounded w-full bg-gray-100" value={inputs.targetUpper} readOnly disabled />
                    </div>
                  </>
                ) : (
                  <div className="lg:col-span-3">
                    <label className="block text-xs text-slate-500">Target Value (Fixed)</label>
                    <input type="number" className="p-2 border rounded w-full bg-gray-100" value={inputs.targetValue} readOnly disabled />
                  </div>
                )}

                <div className="lg:col-span-12 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {/* up to 5 root cause + time pairs, each pair occupies one col on md+ */}
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="border rounded p-3 bg-slate-50">
                        <div className="text-xs text-slate-500 mb-1">Root Cause {i}</div>
                        {renderRootCauseSelect(kpi.id, i)}
                        {(inputs[`rootCause${i}`] === "__custom__" || inputs[`rootCause${i}Custom`]) && (
                          <input value={inputs[`rootCause${i}Custom`]} onChange={(e) => updateKpiInputs(kpi.id, { [`rootCause${i}Custom`]: e.target.value })} placeholder="Custom cause" className="mt-1 p-2 border rounded w-full text-sm" />
                        )}
                        <div className="mt-2">
                          <div className="text-xs text-slate-500">Time</div>
                          <input className="p-2 border rounded w-full text-sm" value={inputs[`time${i}`]} onChange={(e) => updateKpiInputs(kpi.id, { [`time${i}`]: e.target.value })} placeholder="MINUTES" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-12 flex justify-end gap-2 mt-4">
                  <button disabled={entry.saving} onClick={() => saveKpi(kpi)} className="px-4 py-2 bg-emerald-600 text-white rounded">
                    {entry.saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>

              {/* preview (small) */}
              <div className="mt-4">
                <div className="text-sm font-semibold mb-2">Preview (last rows)</div>
                {entry.busy ? (
                  <LoadingBox text="Loading preview..." />
                ) : entry.preview && Array.isArray(entry.preview.rows) && entry.preview.rows.length > 0 ? (
                  <div className="overflow-auto border rounded">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          {(entry.preview.headers || headers).map((h, i) => <th key={i} className="px-2 py-1 text-left">{h || `(col ${i})`}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {entry.preview.rows.slice(-5).map((r, ri) => (
                          <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                            {(r || []).map((c, ci) => {
                              // Convert attribute ID to name for root cause columns
                              const headerName = (entry.preview.headers || headers)[ci] || '';
                              const isRootCause = /root\s*cause/i.test(headerName.toString());
                              if (isRootCause && c && entry.attributes) {
                                const attr = entry.attributes.find(a => String(a.id) === String(c));
                                if (attr) {
                                  return <td key={ci} className="px-2 py-1 align-top">{attr.name}</td>;
                                }
                              }
                              return <td key={ci} className="px-2 py-1 align-top">{c}</td>;
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No uploaded data yet for this KPI.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
