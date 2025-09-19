
// import React, { useEffect, useMemo, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import api from "../utils/api";
// import KpiTile from "../components/KpiTile";

// /* small loading box */
// function LoadingBox({ text = "Loading..." }) {
//   return <div className="p-4 bg-white rounded shadow-sm text-sm text-slate-500">{text}</div>;
// }

// /* parse date lenient */
// function parseDateLenient(value) {
//   if (value == null) return null;
//   if (value instanceof Date) return isFinite(value.getTime()) ? value : null;
//   const s = String(value).trim();
//   if (!s) return null;
//   const n = Date.parse(s);
//   if (!Number.isNaN(n)) return new Date(n);

//   // support dd-mm-yyyy or dd/mm/yyyy
//   const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
//   if (dmy) {
//     let day = Number(dmy[1]), mon = Number(dmy[2]), year = Number(dmy[3]);
//     if (year < 100) year += 2000;
//     // swap if month looks like day
//     if (mon > 12 && day <= 12) [day, mon] = [mon, day];
//     const date = new Date(year, mon - 1, day);
//     if (isFinite(date.getTime())) return date;
//   }

//   // fallback
//   const fallback = new Date(s);
//   return isFinite(fallback.getTime()) ? fallback : null;
// }

// /* heuristics to detect numeric columns */
// function detectNumericColumns(headers = [], rows = []) {
//   const candidates = [];
//   for (let i = 0; i < Math.max(headers.length, 1); i++) {
//     let samples = 0, numeric = 0;
//     for (let r = 0; r < Math.min(12, rows.length); r++) {
//       const v = rows[r] && rows[r][i];
//       if (v === null || v === undefined || String(v).trim() === "") continue;
//       samples++;
//       const n = Number(String(v).replace(/,/g, ""));
//       if (!Number.isNaN(n)) numeric++;
//     }
//     if (samples === 0) {
//       if (/target|value|actual|produced|qty|quantity|count|pieces|loss|snf|fat|kpi/i.test(String(headers[i] || ""))) candidates.push(i);
//     } else if (numeric >= Math.ceil(samples / 2)) {
//       candidates.push(i);
//     }
//   }
//   return candidates;
// }

// /* find date column */
// function findDateIndex(headers = []) {
//   const h = headers.map(x => (x || "").toString());
//   const patterns = [/^date$/i, /\bdate\b/i, /timestamp/i, /day/i];
//   for (const p of patterns) {
//     const idx = h.findIndex(s => p.test(s));
//     if (idx !== -1) return idx;
//   }
//   return 0;
// }

// /* find value column index robustly */
// function findValueIndex(headers = [], rows = []) {
//   const h = headers.map(x => (x || "").toString());
//   const patterns = [/kpi\s*value/i, /\bvalue\b/i, /actual/i, /produced/i, /qty|quantity/i, /measurement|measure/i];
//   for (const p of patterns) {
//     const idx = h.findIndex(s => p.test(s));
//     if (idx !== -1) return idx;
//   }
//   const numericCols = detectNumericColumns(headers, rows);
//   if (numericCols.length > 0) return numericCols[0];
//   // fallback to index 2 if exists, else last column
//   if (headers.length > 2) return 2;
//   return Math.max(0, headers.length - 1);
// }

// /* ---------- New: determine target for a KPI at a given date ----------
//    semantics: revision.revisionDate is "effective from" that date (inclusive).
//    revision object expected shape:
//      { id, targetValue?, targetLowerValue?, targetUpperValue?, revisionDate? }
//    Returns an object:
//      { kind: "single"|"range"|"none", value: number|null, lower:number|null, upper:number|null, revisionId: string|null }
// */
// function getTargetForDate(kpi, dateObj) {
//   const result = { kind: "none", value: null, lower: null, upper: null, revisionId: null };
//   if (!kpi || !dateObj) return result;

//   // gather revisions (support both targetRevisions or revisions naming)
//   const revisions = Array.isArray(kpi.targetRevisions) ? kpi.targetRevisions
//                     : Array.isArray(kpi.revisions) ? kpi.revisions
//                     : [];

//   // normalize date to local midnight
//   const targetDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0,0,0,0).getTime();

//   // If revisions exist, pick the latest revision whose revisionDate <= targetDay
//   if (Array.isArray(revisions) && revisions.length > 0) {
//     // Normalize and sort revisions by revisionDate asc; treat null/invalid dates as -Infinity fallback (but keep them)
//     const parsed = revisions.map(r => {
//       let pd = null;
//       if (r && r.revisionDate) pd = parseDateLenient(r.revisionDate);
//       return { raw: r, date: pd instanceof Date ? new Date(pd.getFullYear(), pd.getMonth(), pd.getDate(), 0,0,0,0).getTime() : null };
//     }).sort((a,b) => {
//       const aa = a.date === null ? -Infinity : a.date;
//       const bb = b.date === null ? -Infinity : b.date;
//       return aa - bb;
//     });

//     // walk and pick latest <= targetDay
//     let chosen = null;
//     for (let i = 0; i < parsed.length; i++) {
//       const p = parsed[i];
//       if (p.date !== null && p.date <= targetDay) chosen = p.raw;
//       // if date is null, store as fallbackCandidate but only use if nothing else matches later
//     }
//     if (!chosen) {
//       // use last null-date revision if any (it will be at start after sort)
//       const fallback = parsed.find(p => p.date === null);
//       if (fallback) chosen = fallback.raw;
//     }

//     if (chosen) {
//       result.revisionId = chosen.id || null;
//       // prefer maintain range when present
//       if (chosen.targetLowerValue != null || chosen.targetUpperValue != null) {
//         // normalize numbers or null
//         const lower = chosen.targetLowerValue != null ? Number(chosen.targetLowerValue) : null;
//         const upper = chosen.targetUpperValue != null ? Number(chosen.targetUpperValue) : null;
//         if (lower != null && upper != null) {
//           result.kind = "range"; result.lower = lower; result.upper = upper; result.value = (lower + upper) / 2;
//           return result;
//         }
//         if (lower != null) { result.kind = "single"; result.value = lower; result.lower = lower; return result; }
//         if (upper != null) { result.kind = "single"; result.value = upper; result.upper = upper; return result; }
//       }
//       if (chosen.targetValue != null) {
//         result.kind = "single"; result.value = Number(chosen.targetValue); return result;
//       }
//     }
//   }

//   // fallback to top-level KPI fields (current metadata)
//   const action = (kpi.action === "sustain" ? "maintain" : (kpi.action || "maintain"));
//   if (action === "maintain") {
//     const tl = kpi.targetLowerValue != null ? Number(kpi.targetLowerValue) : null;
//     const tu = kpi.targetUpperValue != null ? Number(kpi.targetUpperValue) : null;
//     if (tl != null && tu != null) { result.kind = "range"; result.lower = tl; result.upper = tu; result.value = (tl + tu) / 2; return result; }
//     if (tl != null) { result.kind = "single"; result.value = tl; result.lower = tl; return result; }
//     if (tu != null) { result.kind = "single"; result.value = tu; result.upper = tu; return result; }
//   } else {
//     if (kpi.targetValue != null) { result.kind = "single"; result.value = Number(kpi.targetValue); return result; }
//     if (action === "maximize" && kpi.targetUpperValue != null) { result.kind = "single"; result.value = Number(kpi.targetUpperValue); result.upper = Number(kpi.targetUpperValue); return result; }
//     if (action === "minimize" && kpi.targetLowerValue != null) { result.kind = "single"; result.value = Number(kpi.targetLowerValue); result.lower = Number(kpi.targetLowerValue); return result; }
//   }

//   return result;
// }

// /* map percent -> color */
// function colorForPercent(pct) {
//   if (pct == null || Number.isNaN(pct)) return "gray";
//   if (pct < 30) return "red";
//   if (pct < 60) return "yellow";
//   return "green";
// }

// /* Small helper to normalize to local midnight string key */
// function dayKeyForDate(d) {
//   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
// }

// export default function PresentationOverview() {
//   const { plantId } = useParams();
//   const navigate = useNavigate();

//   const [plantName, setPlantName] = useState("");
//   const [kpis, setKpis] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [tileData, setTileData] = useState([]);
//   const [fromDate, setFromDate] = useState(() => {
//     const d = new Date();
//     d.setMonth(d.getMonth() - 1);
//     d.setDate(1);
//     return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
//   });
//   const [toDate, setToDate] = useState(() => {
//     const d = new Date();
//     return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
//   });
//   const [loadingTiles, setLoadingTiles] = useState(false);

//   useEffect(() => {
//     async function load() {
//       setLoading(true);
//       try {
//         const res = await api.get(`/kpis/plant/${encodeURIComponent(plantId)}`);
//         const list = Array.isArray(res.data) ? res.data : [];
//         setKpis(list);

//         // optional: plant name
//         try {
//           const p = await api.get("/plants");
//           const found = Array.isArray(p.data) ? p.data.find(x => x.id === plantId) : null;
//           setPlantName(found ? found.name : "");
//         } catch (e) {
//           // ignore
//         }
//       } catch (err) {
//         console.error("Failed to load KPIs", err);
//         setKpis([]);
//       } finally {
//         setLoading(false);
//       }
//     }
//     load();
//   }, [plantId]);

//   useEffect(() => {
//     if (!kpis || kpis.length === 0) {
//       setTileData([]);
//       return;
//     }

//     let cancelled = false;
//     async function computeAll() {
//       setLoadingTiles(true);
//       const [fy, fm, fd] = (fromDate || "").split("-").map(s => Number(s));
//       const [ty, tm, td] = (toDate || "").split("-").map(s => Number(s));
//       const start = (fy && fm && fd) ? new Date(fy, fm - 1, fd, 0, 0, 0, 0) : null;
//       const end = (ty && tm && td) ? new Date(ty, tm - 1, td, 23, 59, 59, 999) : null;

//       const jobs = kpis.map(async (kpi) => {
//         try {
//           const res = await api.get(`/uploads/${encodeURIComponent(kpi.id)}/preview?limit=999999`);
//           const data = res.data || { headers: [], rows: [] };
//           const headers = Array.isArray(data.headers) ? data.headers : [];
//           const rows = Array.isArray(data.rows) ? data.rows : [];

//           const dateIdx = findDateIndex(headers);
//           const valueIdx = findValueIndex(headers, rows);

//           // Build per-day map => last numeric value for that day
//           const dayMap = new Map(); // key -> { date: Date, value: number }
//           for (let r = 0; r < rows.length; r++) {
//             const row = Array.isArray(rows[r]) ? rows[r] : [];
//             const rawDate = row[dateIdx];
//             const d = parseDateLenient(rawDate);
//             if (!d) continue;
//             // normalize to midnight for comparison
//             const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
//             if (start && dayStart < start) continue;
//             if (end && dayStart > end) continue;

//             // extract numeric value from valueIdx (fallback if missing)
//             let rawValue = row[valueIdx];
//             if (rawValue === null || rawValue === undefined || String(rawValue).trim() === "") {
//               // try to find any numeric cell in the row (right-to-left preference)
//               let found = null;
//               for (let ci = row.length - 1; ci >= 0; ci--) {
//                 const cand = row[ci];
//                 if (cand === null || cand === undefined || String(cand).trim() === "") continue;
//                 const n = Number(String(cand).replace(/,/g, ""));
//                 if (!Number.isNaN(n)) {
//                   found = n;
//                   break;
//                 }
//               }
//               if (found === null) continue;
//               rawValue = found;
//             }

//             const num = Number(String(rawValue).replace(/,/g, ""));
//             if (Number.isNaN(num)) continue;

//             const key = dayKeyForDate(dayStart);
//             // Overwrite so last-seen row for that day remains (we iterate in order)
//             dayMap.set(key, { date: dayStart, value: num });
//           }

//           // If no rows in date range -> produce blank tile
//           const dayEntries = Array.from(dayMap.values());
//           const daysFilled = dayEntries.length;

//           // Build per-day target list using revisions and KPI metadata:
//           const perDayTargets = []; // array of numbers (for percent calculation) when available
//           // we'll also compute daysAchieved using action-specific logic
//           let daysAchieved = 0;

//           for (const entry of dayEntries) {
//             const dayDate = entry.date;
//             const val = entry.value;

//             // Determine applicable target object for that day
//             const targetObj = getTargetForDate(kpi, dayDate);
//             let appliedNumericTargetForPct = null; // used for averaging target values
//             // Determine achievement based on action & targetObj
//             const action = (kpi.action === "sustain" ? "maintain" : (kpi.action || "maintain"));

//             if (targetObj.kind === "range") {
//               // range -> maintain semantics
//               const lower = targetObj.lower;
//               const upper = targetObj.upper;
//               if (lower != null && upper != null) {
//                 appliedNumericTargetForPct = (lower + upper) / 2;
//                 if (val != null && Number.isFinite(Number(val))) {
//                   const nv = Number(val);
//                   if (nv >= lower && nv <= upper) daysAchieved++;
//                 }
//               } else if (lower != null) {
//                 appliedNumericTargetForPct = lower;
//                 if (val != null && Number.isFinite(Number(val))) {
//                   if (Number(val) <= lower && (action === "minimize")) daysAchieved++;
//                   if (Number(val) >= lower && (action === "increase" || action === "maximize")) daysAchieved++;
//                 }
//               } else if (upper != null) {
//                 appliedNumericTargetForPct = upper;
//                 if (val != null && Number.isFinite(Number(val))) {
//                   if (Number(val) >= upper && (action === "increase" || action === "maximize")) daysAchieved++;
//                   if (Number(val) <= upper && (action === "minimize")) daysAchieved++;
//                 }
//               }
//             } else if (targetObj.kind === "single") {
//               appliedNumericTargetForPct = targetObj.value;
//               if (appliedNumericTargetForPct != null) {
//                 const nv = Number(val);
//                 if (!Number.isFinite(nv)) {
//                   // skip
//                 } else {
//                   if (action === "increase" || action === "maximize") {
//                     if (nv >= appliedNumericTargetForPct) daysAchieved++;
//                   } else if (action === "decrease" || action === "minimize") {
//                     if (nv <= appliedNumericTargetForPct) daysAchieved++;
//                   } else if (action === "maintain") {
//                     // maintain with single target: count only when equal-ish (not ideal), but we'll treat >=lower<=upper not available
//                     const tol = 1e-6;
//                     if (Math.abs(nv - appliedNumericTargetForPct) <= tol) daysAchieved++;
//                   } else {
//                     // fallback equality
//                     const tol = 1e-6;
//                     if (Math.abs(nv - appliedNumericTargetForPct) <= tol) daysAchieved++;
//                   }
//                 }
//               }
//             } else {
//               // no targetObj -> fallback using top-level KPI metadata (computeTargetForKpi style)
//               // use same logic as computeTargetForKpi but per day
//               const actionFallback = (kpi.action === "sustain" ? "maintain" : (kpi.action || "maintain"));
//               if (actionFallback === "maintain") {
//                 const tl = kpi.targetLowerValue != null ? Number(kpi.targetLowerValue) : null;
//                 const tu = kpi.targetUpperValue != null ? Number(kpi.targetUpperValue) : null;
//                 if (tl != null && tu != null) {
//                   appliedNumericTargetForPct = (tl + tu) / 2;
//                   if (Number.isFinite(entry.value)) {
//                     const nv = Number(entry.value);
//                     if (nv >= tl && nv <= tu) daysAchieved++;
//                   }
//                 } else if (tl != null) {
//                   appliedNumericTargetForPct = tl;
//                   if (Number.isFinite(entry.value)) {
//                     if ((actionFallback === "minimize" && Number(entry.value) <= tl) || (actionFallback === "increase" && Number(entry.value) >= tl)) daysAchieved++;
//                   }
//                 } else if (tu != null) {
//                   appliedNumericTargetForPct = tu;
//                   if (Number.isFinite(entry.value)) {
//                     if ((actionFallback === "increase" && Number(entry.value) >= tu) || (actionFallback === "minimize" && Number(entry.value) <= tu)) daysAchieved++;
//                   }
//                 }
//               } else {
//                 const tv = kpi.targetValue != null ? Number(kpi.targetValue) : null;
//                 const tu = kpi.targetUpperValue != null ? Number(kpi.targetUpperValue) : null;
//                 const tl = kpi.targetLowerValue != null ? Number(kpi.targetLowerValue) : null;
//                 const nv = Number(entry.value);
//                 if (tv != null) {
//                   appliedNumericTargetForPct = tv;
//                   if (actionFallback === "increase" || actionFallback === "maximize") {
//                     if (Number.isFinite(nv) && nv >= tv) daysAchieved++;
//                   } else if (actionFallback === "decrease" || actionFallback === "minimize") {
//                     if (Number.isFinite(nv) && nv <= tv) daysAchieved++;
//                   }
//                 } else if (actionFallback === "maximize" && tu != null) {
//                   appliedNumericTargetForPct = tu;
//                   if (Number.isFinite(nv) && nv >= tu) daysAchieved++;
//                 } else if (actionFallback === "minimize" && tl != null) {
//                   appliedNumericTargetForPct = tl;
//                   if (Number.isFinite(nv) && nv <= tl) daysAchieved++;
//                 }
//               }
//             }

//             if (appliedNumericTargetForPct != null && Number.isFinite(Number(appliedNumericTargetForPct))) {
//               perDayTargets.push(Number(appliedNumericTargetForPct));
//             } else {
//               // if no applicable numeric target for this day, we don't add to perDayTargets.
//             }
//           } // end per-day loop

//           // compute average value & average target
//           const dayValues = dayEntries.map(x => x.value);
//           let avgValue = null;
//           if (dayValues.length > 0) {
//             avgValue = dayValues.reduce((a,b) => a + b, 0) / dayValues.length;
//           }

//           let avgTarget = null;
//           if (perDayTargets.length > 0) {
//             avgTarget = perDayTargets.reduce((a,b) => a + b, 0) / perDayTargets.length;
//           } else {
//             // fallback: try compute single target for whole KPI using top-level metadata
//             const fallbackTargetObj = getTargetForDate(kpi, start || new Date());
//             if (fallbackTargetObj.kind === "single") avgTarget = fallbackTargetObj.value;
//             else if (fallbackTargetObj.kind === "range" && fallbackTargetObj.lower != null && fallbackTargetObj.upper != null) avgTarget = (fallbackTargetObj.lower + fallbackTargetObj.upper) / 2;
//           }

//           const percentAchieved = (avgTarget != null && avgTarget !== 0 && avgValue != null) ? (avgValue / Number(avgTarget)) * 100 : 0;
//           const color = colorForPercent(percentAchieved);

//           const displayValue = avgValue != null ? (Number.isInteger(avgValue) ? avgValue : Number(avgValue.toFixed(2))) : null;

//           return {
//             kpiId: kpi.id,
//             name: kpi.name,
//             fullText: kpi.description || "",
//             value: displayValue,
//             target: avgTarget,
//             percent: Number.isFinite(percentAchieved) ? Number(percentAchieved) : 0,
//             color,
//             unit: kpi.unit || "",
//             note: `${daysFilled} day(s) in range`,
//             achievedDays: daysAchieved,
//             daysFilled,
//             avgValue,
//             kpiMeta: kpi
//           };
//         } catch (err) {
//           console.error("Failed processing KPI", kpi.id, err);
//           return {
//             kpiId: kpi.id,
//             name: kpi.name,
//             fullText: kpi.description || "",
//             value: null,
//             target: null,
//             percent: null,
//             color: "gray",
//             unit: kpi.unit || "",
//             note: "error",
//             achievedDays: 0,
//             daysFilled: 0,
//             avgValue: null,
//             kpiMeta: kpi
//           };
//         }
//       });

//       const all = await Promise.all(jobs);
//       if (!cancelled) setTileData(all);
//       setLoadingTiles(false);
//     }

//     computeAll();
//     return () => { cancelled = true; };
//   }, [kpis, fromDate, toDate]);

//   const counts = useMemo(() => {
//     const c = { total: tileData.length, red: 0, yellow: 0, green: 0, gray: 0 };
//     tileData.forEach(t => {
//       if (!t) return;
//       if (t.color === "red") c.red++;
//       else if (t.color === "yellow") c.yellow++;
//       else if (t.color === "green") c.green++;
//       else c.gray++;
//     });
//     return c;
//   }, [tileData]);

//   if (loading) return <div className="p-6 max-w-7xl mx-auto"><LoadingBox /></div>;

//   return (
//     <div className="p-6 max-w-7xl mx-auto">
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <button onClick={() => navigate(-1)} className="text-sm text-blue-600 mr-3">← Back</button>
//           <h1 className="text-2xl font-bold inline-block">DMT Performance — {plantName || "Plant"}</h1>
//           <div className="text-sm text-slate-500 mt-1">Overview for selected period</div>
//         </div>

//         <div className="flex items-center gap-3">
//           <div className="text-sm text-slate-500">From</div>
//           <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="p-2 border rounded" />
//           <div className="text-sm text-slate-500">To</div>
//           <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="p-2 border rounded" />
//           <button onClick={() => navigate(`/plant/${encodeURIComponent(plantId)}/presentation`)} className="px-3 py-2 bg-indigo-600 text-white rounded">Open Presentation Deck</button>
//         </div>
//       </div>

//       <div className="mb-4">
//         <div className="text-sm text-slate-600">
//           Tiles: {counts.total} • <span className="text-red-600">Red {counts.red}</span> • <span className="text-amber-600">Yellow {counts.yellow}</span> • <span className="text-green-600">Green {counts.green}</span>
//         </div>
//       </div>

//       {loadingTiles ? (
//         <LoadingBox text="Computing tiles..." />
//       ) : (
//         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
//           {tileData.map((t) => (
//             <div key={t.kpiId}>
//               <KpiTile
//                 name={t.name}
//                 fullText={t.fullText}
//                 value={t.value}
//                 target={t.target}
//                 percent={t.percent}
//                 color={t.color}
//                 unit={t.unit}
//                 numDaysAchieved={t.achievedDays}
//                 totalAchieved={t.daysFilled}
//                 achievedDays={t.achievedDays}
//                 daysFilled={t.daysFilled}
//                 achievedRate={t.percent}
//               />
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }



import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import KpiTile from "../components/KpiTile";

/* small loading box */
function LoadingBox({ text = "Loading..." }) {
  return <div className="p-4 bg-white rounded shadow-sm text-sm text-slate-500">{text}</div>;
}

/* parse date lenient */
function parseDateLenient(value) {
  if (value == null) return null;
  if (value instanceof Date) return isFinite(value.getTime()) ? value : null;
  const s = String(value).trim();
  if (!s) return null;
  const n = Date.parse(s);
  if (!Number.isNaN(n)) return new Date(n);

  // support dd-mm-yyyy or dd/mm/yyyy
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    let day = Number(dmy[1]), mon = Number(dmy[2]), year = Number(dmy[3]);
    if (year < 100) year += 2000;
    // swap if month looks like day
    if (mon > 12 && day <= 12) [day, mon] = [mon, day];
    const date = new Date(year, mon - 1, day);
    if (isFinite(date.getTime())) return date;
  }

  // fallback
  const fallback = new Date(s);
  return isFinite(fallback.getTime()) ? fallback : null;
}

/* heuristics to detect numeric columns */
function detectNumericColumns(headers = [], rows = []) {
  const candidates = [];
  for (let i = 0; i < Math.max(headers.length, 1); i++) {
    let samples = 0, numeric = 0;
    for (let r = 0; r < Math.min(12, rows.length); r++) {
      const v = rows[r] && rows[r][i];
      if (v === null || v === undefined || String(v).trim() === "") continue;
      samples++;
      const n = Number(String(v).replace(/,/g, ""));
      if (!Number.isNaN(n)) numeric++;
    }
    if (samples === 0) {
      if (/target|value|actual|produced|qty|quantity|count|pieces|loss|snf|fat|kpi/i.test(String(headers[i] || ""))) candidates.push(i);
    } else if (numeric >= Math.ceil(samples / 2)) {
      candidates.push(i);
    }
  }
  return candidates;
}

/* find date column */
function findDateIndex(headers = []) {
  const h = headers.map(x => (x || "").toString());
  const patterns = [/^date$/i, /\bdate\b/i, /timestamp/i, /day/i];
  for (const p of patterns) {
    const idx = h.findIndex(s => p.test(s));
    if (idx !== -1) return idx;
  }
  return 0;
}

/* find value column index robustly */
function findValueIndex(headers = [], rows = []) {
  const h = headers.map(x => (x || "").toString());
  const patterns = [/kpi\s*value/i, /\bvalue\b/i, /actual/i, /produced/i, /qty|quantity/i, /measurement|measure/i];
  for (const p of patterns) {
    const idx = h.findIndex(s => p.test(s));
    if (idx !== -1) return idx;
  }
  const numericCols = detectNumericColumns(headers, rows);
  if (numericCols.length > 0) return numericCols[0];
  // fallback to index 2 if exists, else last column
  if (headers.length > 2) return 2;
  return Math.max(0, headers.length - 1);
}

/* ---------- New: determine target for a KPI at a given date ----------
   semantics: revision.revisionDate is "effective from" that date (inclusive).
   revision object expected shape:
     { id, targetValue?, targetLowerValue?, targetUpperValue?, revisionDate? }
   Returns an object:
     { kind: "single"|"range"|"none", value: number|null, lower:number|null, upper:number|null, revisionId: string|null }
*/
function getTargetForDate(kpi, dateObj) {
  const result = { kind: "none", value: null, lower: null, upper: null, revisionId: null };
  if (!kpi || !dateObj) return result;

  // gather revisions (support both targetRevisions or revisions naming)
  const revisions = Array.isArray(kpi.targetRevisions) ? kpi.targetRevisions
                    : Array.isArray(kpi.revisions) ? kpi.revisions
                    : [];

  // normalize date to local midnight
  const targetDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0,0,0,0).getTime();

  // If revisions exist, pick the latest revision whose revisionDate <= targetDay
  if (Array.isArray(revisions) && revisions.length > 0) {
    // Normalize and sort revisions by revisionDate asc; treat null/invalid dates as -Infinity fallback (but keep them)
    const parsed = revisions.map(r => {
      let pd = null;
      if (r && r.revisionDate) pd = parseDateLenient(r.revisionDate);
      return { raw: r, date: pd instanceof Date ? new Date(pd.getFullYear(), pd.getMonth(), pd.getDate(), 0,0,0,0).getTime() : null };
    }).sort((a,b) => {
      const aa = a.date === null ? -Infinity : a.date;
      const bb = b.date === null ? -Infinity : b.date;
      return aa - bb;
    });

    // walk and pick latest <= targetDay
    let chosen = null;
    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      if (p.date !== null && p.date <= targetDay) chosen = p.raw;
      // if date is null, store as fallbackCandidate but only use if nothing else matches later
    }
    if (!chosen) {
      // use last null-date revision if any (it will be at start after sort)
      const fallback = parsed.find(p => p.date === null);
      if (fallback) chosen = fallback.raw;
    }

    if (chosen) {
      result.revisionId = chosen.id || null;
      // prefer maintain range when present
      if (chosen.targetLowerValue != null || chosen.targetUpperValue != null) {
        // normalize numbers or null
        const lower = chosen.targetLowerValue != null ? Number(chosen.targetLowerValue) : null;
        const upper = chosen.targetUpperValue != null ? Number(chosen.targetUpperValue) : null;
        if (lower != null && upper != null) {
          result.kind = "range"; result.lower = lower; result.upper = upper; result.value = (lower + upper) / 2;
          return result;
        }
        if (lower != null) { result.kind = "single"; result.value = lower; result.lower = lower; return result; }
        if (upper != null) { result.kind = "single"; result.value = upper; result.upper = upper; return result; }
      }
      if (chosen.targetValue != null) {
        result.kind = "single"; result.value = Number(chosen.targetValue); return result;
      }
    }
  }

  // fallback to top-level KPI fields (current metadata)
  const action = (kpi.action === "sustain" ? "maintain" : (kpi.action || "maintain"));
  if (action === "maintain") {
    const tl = kpi.targetLowerValue != null ? Number(kpi.targetLowerValue) : null;
    const tu = kpi.targetUpperValue != null ? Number(kpi.targetUpperValue) : null;
    if (tl != null && tu != null) { result.kind = "range"; result.lower = tl; result.upper = tu; result.value = (tl + tu) / 2; return result; }
    if (tl != null) { result.kind = "single"; result.value = tl; result.lower = tl; return result; }
    if (tu != null) { result.kind = "single"; result.value = tu; result.upper = tu; return result; }
  } else {
    if (kpi.targetValue != null) { result.kind = "single"; result.value = Number(kpi.targetValue); return result; }
    if (action === "maximize" && kpi.targetUpperValue != null) { result.kind = "single"; result.value = Number(kpi.targetUpperValue); result.upper = Number(kpi.targetUpperValue); return result; }
    if (action === "minimize" && kpi.targetLowerValue != null) { result.kind = "single"; result.value = Number(kpi.targetLowerValue); result.lower = Number(kpi.targetLowerValue); return result; }
  }

  return result;
}

/* map percent -> color */
function colorForPercent(pct) {
  if (pct == null || Number.isNaN(pct)) return "gray";
  if (pct < 30) return "red";
  if (pct < 60) return "yellow";
  return "green";
}

/* Small helper to normalize to local midnight string key */
function dayKeyForDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function PresentationOverview() {
  const { plantId } = useParams();
  const navigate = useNavigate();

  const [plantName, setPlantName] = useState("");
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tileData, setTileData] = useState([]);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [loadingTiles, setLoadingTiles] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get(`/kpis/plant/${encodeURIComponent(plantId)}`);
        const list = Array.isArray(res.data) ? res.data : [];
        setKpis(list);

        // optional: plant name
        try {
          const p = await api.get("/plants");
          const found = Array.isArray(p.data) ? p.data.find(x => x.id === plantId) : null;
          setPlantName(found ? found.name : "");
        } catch (e) {
          // ignore
        }
      } catch (err) {
        console.error("Failed to load KPIs", err);
        setKpis([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [plantId]);

  useEffect(() => {
    if (!kpis || kpis.length === 0) {
      setTileData([]);
      return;
    }

    let cancelled = false;
    async function computeAll() {
      setLoadingTiles(true);
      const [fy, fm, fd] = (fromDate || "").split("-").map(s => Number(s));
      const [ty, tm, td] = (toDate || "").split("-").map(s => Number(s));
      const start = (fy && fm && fd) ? new Date(fy, fm - 1, fd, 0, 0, 0, 0) : null;
      const end = (ty && tm && td) ? new Date(ty, tm - 1, td, 23, 59, 59, 999) : null;

      const jobs = kpis.map(async (kpi) => {
        try {
          const res = await api.get(`/uploads/${encodeURIComponent(kpi.id)}/preview?limit=999999`);
          const data = res.data || { headers: [], rows: [] };
          const headers = Array.isArray(data.headers) ? data.headers : [];
          const rows = Array.isArray(data.rows) ? data.rows : [];

          const dateIdx = findDateIndex(headers);
          const valueIdx = findValueIndex(headers, rows);

          // Build per-day map => last numeric value for that day
          const dayMap = new Map(); // key -> { date: Date, value: number }
          for (let r = 0; r < rows.length; r++) {
            const row = Array.isArray(rows[r]) ? rows[r] : [];
            const rawDate = row[dateIdx];
            const d = parseDateLenient(rawDate);
            if (!d) continue;
            // normalize to midnight for comparison
            const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
            if (start && dayStart < start) continue;
            if (end && dayStart > end) continue;

            // extract numeric value from valueIdx (fallback if missing)
            let rawValue = row[valueIdx];
            if (rawValue === null || rawValue === undefined || String(rawValue).trim() === "") {
              // try to find any numeric cell in the row (right-to-left preference)
              let found = null;
              for (let ci = row.length - 1; ci >= 0; ci--) {
                const cand = row[ci];
                if (cand === null || cand === undefined || String(cand).trim() === "") continue;
                const n = Number(String(cand).replace(/,/g, ""));
                if (!Number.isNaN(n)) {
                  found = n;
                  break;
                }
              }
              if (found === null) continue;
              rawValue = found;
            }

            const num = Number(String(rawValue).replace(/,/g, ""));
            if (Number.isNaN(num)) continue;

            const key = dayKeyForDate(dayStart);
            // Overwrite so last-seen row for that day remains (we iterate in order)
            dayMap.set(key, { date: dayStart, value: num });
          }

          // If no rows in date range -> produce blank tile
          const dayEntries = Array.from(dayMap.values());
          const daysFilled = dayEntries.length;

          // Build per-day target list using revisions and KPI metadata:
          const perDayTargets = []; // array of numbers (for percent calculation) when available
          // we'll also compute daysAchieved using action-specific logic
          let daysAchieved = 0;

          for (const entry of dayEntries) {
            const dayDate = entry.date;
            const val = entry.value;

            // Determine applicable target object for that day
            const targetObj = getTargetForDate(kpi, dayDate);
            let appliedNumericTargetForPct = null; // used for averaging target values
            // Determine achievement based on action & targetObj
            const action = (kpi.action === "sustain" ? "maintain" : (kpi.action || "maintain"));

            if (targetObj.kind === "range") {
              // range -> maintain semantics
              const lower = targetObj.lower;
              const upper = targetObj.upper;
              if (lower != null && upper != null) {
                appliedNumericTargetForPct = (lower + upper) / 2;
                if (val != null && Number.isFinite(Number(val))) {
                  const nv = Number(val);
                  if (nv >= lower && nv <= upper) daysAchieved++;
                }
              } else if (lower != null) {
                appliedNumericTargetForPct = lower;
                if (val != null && Number.isFinite(Number(val))) {
                  if (Number(val) <= lower && (action === "minimize")) daysAchieved++;
                  if (Number(val) >= lower && (action === "increase" || action === "maximize")) daysAchieved++;
                }
              } else if (upper != null) {
                appliedNumericTargetForPct = upper;
                if (val != null && Number.isFinite(Number(val))) {
                  if (Number(val) >= upper && (action === "increase" || action === "maximize")) daysAchieved++;
                  if (Number(val) <= upper && (action === "minimize")) daysAchieved++;
                }
              }
            } else if (targetObj.kind === "single") {
              appliedNumericTargetForPct = targetObj.value;
              if (appliedNumericTargetForPct != null) {
                const nv = Number(val);
                if (!Number.isFinite(nv)) {
                  // skip
                } else {
                  if (action === "increase" || action === "maximize") {
                    if (nv >= appliedNumericTargetForPct) daysAchieved++;
                  } else if (action === "decrease" || action === "minimize") {
                    if (nv <= appliedNumericTargetForPct) daysAchieved++;
                  } else if (action === "maintain") {
                    // maintain with single target: count only when equal-ish
                    const tol = 1e-6;
                    if (Math.abs(nv - appliedNumericTargetForPct) <= tol) daysAchieved++;
                  } else {
                    const tol = 1e-6;
                    if (Math.abs(nv - appliedNumericTargetForPct) <= tol) daysAchieved++;
                  }
                }
              }
            } else {
              // no targetObj -> fallback using top-level KPI metadata (computeTargetForKpi style)
              const actionFallback = (kpi.action === "sustain" ? "maintain" : (kpi.action || "maintain"));
              if (actionFallback === "maintain") {
                const tl = kpi.targetLowerValue != null ? Number(kpi.targetLowerValue) : null;
                const tu = kpi.targetUpperValue != null ? Number(kpi.targetUpperValue) : null;
                if (tl != null && tu != null) {
                  appliedNumericTargetForPct = (tl + tu) / 2;
                  if (Number.isFinite(entry.value)) {
                    const nv = Number(entry.value);
                    if (nv >= tl && nv <= tu) daysAchieved++;
                  }
                } else if (tl != null) {
                  appliedNumericTargetForPct = tl;
                  if (Number.isFinite(entry.value)) {
                    if ((actionFallback === "minimize" && Number(entry.value) <= tl) || (actionFallback === "increase" && Number(entry.value) >= tl)) daysAchieved++;
                  }
                } else if (tu != null) {
                  appliedNumericTargetForPct = tu;
                  if (Number.isFinite(entry.value)) {
                    if ((actionFallback === "increase" && Number(entry.value) >= tu) || (actionFallback === "minimize" && Number(entry.value) <= tu)) daysAchieved++;
                  }
                }
              } else {
                const tv = kpi.targetValue != null ? Number(kpi.targetValue) : null;
                const tu = kpi.targetUpperValue != null ? Number(kpi.targetUpperValue) : null;
                const tl = kpi.targetLowerValue != null ? Number(kpi.targetLowerValue) : null;
                const nv = Number(entry.value);
                if (tv != null) {
                  appliedNumericTargetForPct = tv;
                  if (actionFallback === "increase" || actionFallback === "maximize") {
                    if (Number.isFinite(nv) && nv >= tv) daysAchieved++;
                  } else if (actionFallback === "decrease" || actionFallback === "minimize") {
                    if (Number.isFinite(nv) && nv <= tv) daysAchieved++;
                  }
                } else if (actionFallback === "maximize" && tu != null) {
                  appliedNumericTargetForPct = tu;
                  if (Number.isFinite(nv) && nv >= tu) daysAchieved++;
                } else if (actionFallback === "minimize" && tl != null) {
                  appliedNumericTargetForPct = tl;
                  if (Number.isFinite(nv) && nv <= tl) daysAchieved++;
                }
              }
            }

            if (appliedNumericTargetForPct != null && Number.isFinite(Number(appliedNumericTargetForPct))) {
              perDayTargets.push(Number(appliedNumericTargetForPct));
            } else {
              // if no applicable numeric target for this day, we don't add to perDayTargets.
            }
          } // end per-day loop

          // compute average value & average target
          const dayValues = dayEntries.map(x => x.value);
          let avgValue = null;
          if (dayValues.length > 0) {
            avgValue = dayValues.reduce((a,b) => a + b, 0) / dayValues.length;
          }

          let avgTarget = null;
          if (perDayTargets.length > 0) {
            avgTarget = perDayTargets.reduce((a,b) => a + b, 0) / perDayTargets.length;
          } else {
            // fallback: try compute single target for whole KPI using top-level metadata
            const fallbackTargetObj = getTargetForDate(kpi, start || new Date());
            if (fallbackTargetObj.kind === "single") avgTarget = fallbackTargetObj.value;
            else if (fallbackTargetObj.kind === "range" && fallbackTargetObj.lower != null && fallbackTargetObj.upper != null) avgTarget = (fallbackTargetObj.lower + fallbackTargetObj.upper) / 2;
          }

          // --- Updated percent calculation: for decrease/minimize use target/avgValue, else avgValue/target ---
          let percentAchieved = 0;
          const actionForPercent = (kpi.action === "sustain" ? "maintain" : (kpi.action || "maintain"));
          if (avgTarget != null && Number.isFinite(Number(avgTarget)) && avgValue != null && Number.isFinite(Number(avgValue))) {
            const aT = Number(avgTarget);
            const aV = Number(avgValue);
            if (aV === 0) {
              // avoid divide-by-zero; set percent to 0 if avgValue zero and action expects avg/target,
              // or to a large number if target > 0 and we compute target/avgValue (but better to set 0)
              percentAchieved = 0;
            } else if (actionForPercent === "decrease" || actionForPercent === "minimize") {
              percentAchieved = (aT / aV) * 100;
            } else {
              // increase, maximize, maintain and others
              percentAchieved = (aV / aT) * 100;
            }
          } else {
            percentAchieved = 0;
          }

          const color = colorForPercent(percentAchieved);

          const displayValue = avgValue != null ? (Number.isInteger(avgValue) ? avgValue : Number(avgValue.toFixed(2))) : null;

          return {
            kpiId: kpi.id,
            name: kpi.name,
            fullText: kpi.description || "",
            value: displayValue,
            target: avgTarget,
            percent: Number.isFinite(percentAchieved) ? Number(percentAchieved) : 0,
            color,
            unit: kpi.unit || "",
            note: `${daysFilled} day(s) in range`,
            achievedDays: daysAchieved,
            daysFilled,
            avgValue,
            kpiMeta: kpi
          };
        } catch (err) {
          console.error("Failed processing KPI", kpi.id, err);
          return {
            kpiId: kpi.id,
            name: kpi.name,
            fullText: kpi.description || "",
            value: null,
            target: null,
            percent: null,
            color: "gray",
            unit: kpi.unit || "",
            note: "error",
            achievedDays: 0,
            daysFilled: 0,
            avgValue: null,
            kpiMeta: kpi
          };
        }
      });

      const all = await Promise.all(jobs);
      if (!cancelled) setTileData(all);
      setLoadingTiles(false);
    }

    computeAll();
    return () => { cancelled = true; };
  }, [kpis, fromDate, toDate]);

  const counts = useMemo(() => {
    const c = { total: tileData.length, red: 0, yellow: 0, green: 0, gray: 0 };
    tileData.forEach(t => {
      if (!t) return;
      if (t.color === "red") c.red++;
      else if (t.color === "yellow") c.yellow++;
      else if (t.color === "green") c.green++;
      else c.gray++;
    });
    return c;
  }, [tileData]);

  if (loading) return <div className="p-6 max-w-7xl mx-auto"><LoadingBox /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600 mr-3">← Back</button>
          <h1 className="text-2xl font-bold inline-block">DMT Performance — {plantName || "Plant"}</h1>
          <div className="text-sm text-slate-500 mt-1">Overview for selected period</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500">From</div>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="p-2 border rounded" />
          <div className="text-sm text-slate-500">To</div>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="p-2 border rounded" />
          <button onClick={() => navigate(`/plant/${encodeURIComponent(plantId)}/presentation`)} className="px-3 py-2 bg-indigo-600 text-white rounded">Open Presentation Deck</button>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-sm text-slate-600">
          Tiles: {counts.total} • <span className="text-red-600">Red {counts.red}</span> • <span className="text-amber-600">Yellow {counts.yellow}</span> • <span className="text-green-600">Green {counts.green}</span>
        </div>
      </div>

      {loadingTiles ? (
        <LoadingBox text="Computing tiles..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tileData.map((t) => (
            <div key={t.kpiId}>
              <KpiTile
                name={t.name}
                fullText={t.fullText}
                value={t.value}
                target={t.target}
                percent={t.percent}
                color={t.color}
                unit={t.unit}
                numDaysAchieved={t.achievedDays}
                totalAchieved={t.daysFilled}
                achievedDays={t.achievedDays}
                daysFilled={t.daysFilled}
                achievedRate={t.percent}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


