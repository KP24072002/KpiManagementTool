
// // client/src/pages/PresentationDeck.jsx
// // client/src/pages/PresentationDeck.jsx
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import api from "../utils/api";
// import {
//   ResponsiveContainer,
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   Tooltip,
//   Legend,
//   CartesianGrid,
//   ReferenceLine,
//   ReferenceArea,
//   BarChart,
//   Bar,
//   Cell,
//   ComposedChart,
// } from "recharts";
// import html2canvas from "html2canvas";
// import jsPDF from "jspdf";

// /* --------- helpers: lenient date parsing & formatting --------- */
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
//   return null;
// }
// function formatDateLabel(d) {
//   if (!(d instanceof Date) || isNaN(d.getTime())) return String(d);
//   return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
// }
// function formatDateDisplay(value) {
//   if (!value) return "—";
//   const d = parseDateLenient(value);
//   if (!d) return "—";
//   return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
// }

// /* --------- column detection helpers --------- */
// function detectNumericColumns(headers = [], rows = []) {
//   const candidates = [];
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
//     if (samples === 0) {
//       if (/target|value|actual|produced|qty|quantity|count|pieces|loss|snf|fat|kpi/i.test(String(headers[i] || ""))) candidates.push(i);
//     } else if (numeric >= Math.ceil(samples / 2)) {
//       candidates.push(i);
//     }
//   }
//   return candidates;
// }
// function findDateIndex(headers = []) {
//   const h = (headers || []).map(x => (x || "").toString());
//   const patterns = [/^date$/i, /\bdate\b/i, /timestamp/i, /day/i];
//   for (const p of patterns) {
//     const idx = h.findIndex(s => p && p.test && p.test(s));
//     if (idx !== -1) return idx;
//   }
//   return 0;
// }
// function findValueIndex(headers = [], rows = []) {
//   const h = (headers || []).map(x => (x || "").toString());
//   const patterns = [/kpi\s*value/i, /\bvalue\b/i, /actual/i, /produced/i, /qty|quantity/i, /measurement/i];
//   for (const p of patterns) {
//     const idx = h.findIndex(s => p && p.test && p.test(s));
//     if (idx !== -1) return idx;
//   }
//   const numericCols = detectNumericColumns(headers, rows);
//   if (numericCols.length > 0) return numericCols[0];
//   if (headers.length > 2) return 2;
//   return Math.max(0, headers.length - 1);
// }

// /* --------- compute target logic (same rules as other pages) --------- */
// function computeTargetsForKpi(kpi) {
//   if (!kpi) return { target: null, lower: null, upper: null };
//   const action = (kpi.action === "sustain" ? "maintain" : (kpi.action || "maintain"));
//   const tv = kpi.targetValue !== undefined ? kpi.targetValue : null;
//   const tl = kpi.targetLowerValue !== undefined ? kpi.targetLowerValue : null;
//   const tu = kpi.targetUpperValue !== undefined ? kpi.targetUpperValue : null;

//   if (action === "increase" || action === "decrease") {
//     return { target: tv != null ? Number(tv) : null, lower: null, upper: null };
//   }
//   if (action === "maximize") return { target: tu != null ? Number(tu) : null, lower: null, upper: null };
//   if (action === "minimize") return { target: tl != null ? Number(tl) : null, lower: null, upper: null };
//   if (action === "maintain") {
//     const lower = tl != null ? Number(tl) : null;
//     const upper = tu != null ? Number(tu) : null;
//     return { target: (lower != null && upper != null) ? (Number(lower) + Number(upper)) / 2 : (tv != null ? Number(tv) : null), lower, upper };
//   }
//   return { target: tv != null ? Number(tv) : null, lower: null, upper: null };
// }

// /* --------- pick target revision for a given date --------- */
// function getTargetAtDate(kpi, date) {
//   if (!kpi) return null;
//   if (!Array.isArray(kpi.targetRevisions) || kpi.targetRevisions.length === 0) {
//     const t = computeTargetsForKpi(kpi);
//     return t.target;
//   }

//   const d = date instanceof Date ? date : parseDateLenient(date);
//   const revs = [...kpi.targetRevisions].filter(Boolean).slice().sort((a, b) => {
//     const da = parseDateLenient(a.revisionDate);
//     const db = parseDateLenient(b.revisionDate);
//     if (!da && !db) return 0;
//     if (!da) return 1;
//     if (!db) return -1;
//     return da - db;
//   });

//   if (!d) {
//     const last = revs[revs.length - 1];
//     if (last && last.targetValue != null) return Number(last.targetValue);
//     return computeTargetsForKpi(kpi).target;
//   }

//   let chosen = null;
//   for (const r of revs) {
//     const rd = parseDateLenient(r.revisionDate);
//     if (!rd) continue;
//     if (d >= rd) chosen = r.targetValue;
//   }
//   if (chosen != null) return Number(chosen);
//   if (kpi.targetValue != null) return Number(kpi.targetValue);
//   const first = revs[0];
//   return first && first.targetValue != null ? Number(first.targetValue) : null;
// }

// /* --------- compute per-kpi metrics for a given date range --------- */
// function computeKpiMetrics({ kpi, headers = [], rows = [] }, dateFrom, dateTo) {
//   const fromD = dateFrom ? (dateFrom instanceof Date ? new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate(), 0,0,0,0) : parseDateLenient(dateFrom)) : null;
//   const toD = dateTo ? (dateTo instanceof Date ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23,59,59,999) : parseDateLenient(dateTo)) : null;

//   const dateIdx = findDateIndex(headers);
//   const valueIdx = findValueIndex(headers, rows);

//   const dayMap = new Map();
//   for (let r = 0; r < rows.length; r++) {
//     const row = Array.isArray(rows[r]) ? rows[r] : [];
//     const rawDate = row[dateIdx];
//     const d = parseDateLenient(rawDate);
//     if (!d) continue;
//     const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0);
//     if (fromD && dayStart < fromD) continue;
//     if (toD && dayStart > toD) continue;

//     let rawValue = row[valueIdx];
//     if (rawValue === null || rawValue === undefined || String(rawValue).trim() === "") {
//       let found = null;
//       for (let ci = row.length - 1; ci >= 0; ci--) {
//         const cand = row[ci];
//         if (cand === null || cand === undefined || String(cand).trim() === "") continue;
//         const n = Number(String(cand).replace(/,/g, ""));
//         if (!Number.isNaN(n)) { found = n; break; }
//       }
//       if (found === null) continue;
//       rawValue = found;
//     }

//     const num = Number(String(rawValue).replace(/,/g, "").trim());
//     if (Number.isNaN(num)) continue;

//     const key = `${dayStart.getFullYear()}-${String(dayStart.getMonth()+1).padStart(2, "0")}-${String(dayStart.getDate()).padStart(2, "0")}`;
//     dayMap.set(key, { date: dayStart, value: num });
//   }

//   const dayEntries = Array.from(dayMap.values()).map(x => x).sort((a,b) => a.date - b.date);
//   const dayValues = dayEntries.map(x => x.value);
//   const daysFilled = dayValues.length;
//   const avgValue = dayValues.length > 0 ? dayValues.reduce((a,b)=>a+b,0)/dayValues.length : null;

//   const targets = computeTargetsForKpi(kpi);
//   let daysAchieved = 0;
//   for (const entry of dayEntries) {
//     const perDayTarget = getTargetAtDate(kpi, entry.date);
//     const action = (kpi.action === "sustain" ? "maintain" : (kpi.action || "maintain"));
//     const v = Number(entry.value);
//     if (!Number.isFinite(v)) continue;
//     if (perDayTarget == null) {
//       if (action === "maintain") {
//         const lower = targets.lower, upper = targets.upper;
//         if (lower != null && upper != null && v >= lower && v <= upper) daysAchieved++;
//       }
//       continue;
//     }
//     if (action === "increase" || action === "maximize") {
//       if (v >= Number(perDayTarget)) daysAchieved++;
//     } else if (action === "decrease" || action === "minimize") {
//       if (v <= Number(perDayTarget)) daysAchieved++;
//     } else {
//       const lower = targets.lower, upper = targets.upper;
//       if (lower != null && upper != null) {
//         if (v >= lower && v <= upper) daysAchieved++;
//       } else {
//         const tol = 1e-6;
//         if (Math.abs(v - Number(perDayTarget)) <= tol) daysAchieved++;
//       }
//     }
//   }

//   let periodTarget = null;
//   if (dayEntries.length > 0) {
//     const lastDay = dayEntries[dayEntries.length - 1].date;
//     periodTarget = getTargetAtDate(kpi, lastDay);
//   } else if (toD) {
//     periodTarget = getTargetAtDate(kpi, toD);
//   } else {
//     periodTarget = computeTargetsForKpi(kpi).target;
//   }

//   const percentAchieved = (periodTarget != null && periodTarget !== 0 && avgValue != null) ? (avgValue / periodTarget) * 100 : 0;

//   return {
//     daysFilled,
//     daysAchieved,
//     avgValue,
//     percentAchieved,
//     target: periodTarget,
//   };
// }

// /* --------- Presentation Deck (one slide per KPI) --------- */
// export default function PresentationDeck() {
//   const { plantId } = useParams();
//   const navigate = useNavigate();

//   const [kpis, setKpis] = useState([]); // array of { kpi, parsed, primaryChart }
//   const [loading, setLoading] = useState(true);
//   const [selectedIdx, setSelectedIdx] = useState(0);
//   const containerRef = useRef(null);
//   const [isFullscreen, setIsFullscreen] = useState(false);

//   // Chart view state: 'main' for KPI value chart, 'attributes' for Pareto chart
//   const [chartView, setChartView] = useState('main');

//   // toggle for showing present value line on charts
//   const [showPresentLine, setShowPresentLine] = useState(true);

//   // Global date range state with presets
//   const [globalDateRange, setGlobalDateRange] = useState({
//     preset: '', // '', '3months', '6months', '1year'
//     dateFrom: '',
//     dateTo: ''
//   });

//   useEffect(() => {
//     async function loadAll() {
//       setLoading(true);
//       try {
//         const res = await api.get(`/kpis/plant/${encodeURIComponent(plantId)}`);
//         const list = Array.isArray(res.data) ? res.data : [];

//         const promises = list.map(async (k) => {
//           const [kpiRes, pRes, cRes] = await Promise.allSettled([
//             api.get(`/kpis/${encodeURIComponent(k.id)}`), // Get full KPI details
//             api.get(`/uploads/${encodeURIComponent(k.id)}/preview?limit=999999`),
//             api.get(`/kpis/${encodeURIComponent(k.id)}/charts`),
//           ]);
          
//           // Use the detailed KPI data instead of the basic list data
//           const fullKpi = (kpiRes.status === "fulfilled" && kpiRes.value && kpiRes.value.data) ? kpiRes.value.data : k;
//           const parsed = (pRes.status === "fulfilled" && pRes.value && pRes.value.data) ? pRes.value.data : { headers: [], rows: [] };
//           const charts = (cRes.status === "fulfilled" && Array.isArray(cRes.value.data)) ? cRes.value.data : [];
//           const primary = charts.length > 0 ? charts[0] : null;
          
//           console.log('Full KPI data for presentation:', fullKpi.id, {
//             targetRevisions: fullKpi.targetRevisions,
//             actions: fullKpi.actions,
//             attributes: fullKpi.attributes
//           });
          
//           return { kpi: fullKpi, parsed, primaryChart: primary };
//         });

//         const resolved = await Promise.all(promises);
//         setKpis(resolved);
//         setSelectedIdx(0);
//       } catch (err) {
//         console.error("Failed to load presentation content", err);
//         setKpis([]);
//       } finally {
//         setLoading(false);
//       }
//     }
//     loadAll();
//     // eslint-disable-next-line
//   }, [plantId]);

//   useEffect(() => {
//     function onFS() {
//       const inFs = Boolean(document.fullscreenElement);
//       setIsFullscreen(inFs);
//       if (inFs) {
//         document.documentElement.style.background = "#ffffff";
//         document.body.style.background = "#ffffff";
//       } else {
//         document.documentElement.style.background = "";
//         document.body.style.background = "";
//       }
//     }
//     document.addEventListener("fullscreenchange", onFS);
//     return () => document.removeEventListener("fullscreenchange", onFS);
//   }, []);

//   function enterFullscreen() {
//     const el = containerRef.current;
//     if (!el) return;
//     if (el.requestFullscreen) el.requestFullscreen();
//     else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
//   }
//   function exitFullscreen() {
//     if (document.exitFullscreen) document.exitFullscreen();
//     else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
//   }

//   function goto(idx) {
//     if (idx < 0) idx = kpis.length - 1; // Go to last slide when going before first
//     if (idx >= kpis.length) idx = 0; // Go to first slide when going after last
//     setSelectedIdx(idx);
//     // Reset chart view to main KPI chart when navigating
//     setChartView('main');
//   }
//   function next() { goto(selectedIdx + 1); }
//   function prev() { goto(selectedIdx - 1); }

//   useEffect(() => {
//     function onKey(e) {
//       const active = document.activeElement;
//       const tag = active && active.tagName ? active.tagName.toLowerCase() : "";
//       if (tag === "input" || tag === "textarea" || tag === "select" || active?.isContentEditable) return;
//       if (e.key === "ArrowRight") next();
//       else if (e.key === "ArrowLeft") prev();
//     }
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [selectedIdx, kpis.length]);

//   function getSlideConfig(slide) {
//     const cfg = slide.primaryChart && slide.primaryChart.config ? slide.primaryChart.config : null;
//     const headers = slide.parsed?.headers || [];
//     return {
//       chartType: cfg?.chartType || "line",
//       xHeader: cfg?.xHeader || (headers[0] || ""),
//       yHeaders: Array.isArray(cfg?.yHeaders) && cfg.yHeaders.length > 0 ? cfg.yHeaders : (headers.length > 1 ? [headers[1]] : (headers[0] ? [headers[0]] : [])),
//       dateFrom: globalDateRange.dateFrom || cfg?.dateFrom || "",
//       dateTo: globalDateRange.dateTo || cfg?.dateTo || "",
//     };
//   }

//   // Handle preset date range changes
//   const handlePresetChange = (e) => {
//     const preset = e.target.value;
//     const today = new Date();
//     let dateFrom = '';
//     let dateTo = today.toISOString().split('T')[0];
    
//     if (preset === '3months') {
//       const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
//       dateFrom = threeMonthsAgo.toISOString().split('T')[0];
//     } else if (preset === '6months') {
//       const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
//       dateFrom = sixMonthsAgo.toISOString().split('T')[0];
//     } else if (preset === '1year') {
//       const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
//       dateFrom = oneYearAgo.toISOString().split('T')[0];
//     }
    
//     setGlobalDateRange({
//       preset,
//       dateFrom,
//       dateTo
//     });
//   };

//   const currentSlide = kpis[selectedIdx];

//   /* ---------- derived chart data for recharts ---------- */
//   const chartData = useMemo(() => {
//     if (!currentSlide) {
//       console.log('No currentSlide available');
//       return [];
//     }
//     const parsed = currentSlide.parsed || { headers: [], rows: [] };
//     const cfg = getSlideConfig(currentSlide);
//     const headers = parsed.headers || [];
//     const rows = parsed.rows || [];
    
//     console.log(`Chart data for ${currentSlide.kpi.name}:`, {
//       headers: headers.length,
//       rowCount: rows.length,
//       dateRange: { from: globalDateRange.dateFrom, to: globalDateRange.dateTo },
//       configHeaders: { xHeader: cfg.xHeader, yHeaders: cfg.yHeaders }
//     });
    
//     if (!cfg.xHeader || !Array.isArray(cfg.yHeaders) || cfg.yHeaders.length === 0) {
//       const dateIdx = findDateIndex(headers);
//       const valueIdx = findValueIndex(headers, rows);
//       if (headers.length === 0) {
//         console.log('No headers found, returning empty data');
//         return [];
//       }
//       const xHeader = headers[dateIdx] || headers[0];
//       const yHeader = headers[valueIdx] || headers[headers.length - 1];
//       cfg.xHeader = xHeader;
//       cfg.yHeaders = [yHeader];
//       console.log('Auto-detected headers:', { xHeader, yHeader });
//     }

//     const idxMap = {};
//     headers.forEach((h, i) => (idxMap[h] = i));

//     const xIdx = idxMap[cfg.xHeader];
//     const resolvedXIdx = (xIdx === undefined) ? 0 : xIdx;

//     const fromD = globalDateRange.dateFrom ? parseDateLenient(globalDateRange.dateFrom) : (cfg.dateFrom ? parseDateLenient(cfg.dateFrom) : null);
//     const toD = globalDateRange.dateTo ? parseDateLenient(globalDateRange.dateTo) : (cfg.dateTo ? parseDateLenient(cfg.dateTo) : null);

//     console.log('Date filtering:', { fromD, toD, globalDateRange });

//     const out = [];
//     for (let r = 0; r < rows.length; r++) {
//       const row = rows[r];
//       if (!Array.isArray(row)) continue;
//       const rawX = row[resolvedXIdx];
//       const isDateLike = !!parseDateLenient(rawX);
//       if (isDateLike) {
//         const d = parseDateLenient(rawX);
//         if (!d) continue;
//         if (fromD && d < fromD) continue;
//         if (toD && d > toD) continue;
//         const obj = { x: formatDateLabel(d), xDate: d.getTime() };
//         let any = false;
//         for (const yh of cfg.yHeaders) {
//           const yi = idxMap[yh];
//           const rawY = yi >= 0 ? row[yi] : null;
//           const n = rawY === null || rawY === undefined || rawY === "" ? null : Number(String(rawY).replace(/,/g, ""));
//           obj[yh] = Number.isFinite(n) ? n : null;
//           if (obj[yh] !== null) any = true;
//         }
//         if (!any) continue;
//         out.push(obj);
//       } else {
//         const obj = { x: rawX };
//         let any = false;
//         for (const yh of cfg.yHeaders) {
//           const yi = idxMap[yh];
//           const rawY = yi >= 0 ? row[yi] : null;
//           const n = rawY === null || rawY === undefined || rawY === "" ? null : Number(String(rawY).replace(/,/g, ""));
//           obj[yh] = Number.isFinite(n) ? n : null;
//           if (obj[yh] !== null) any = true;
//         }
//         if (!any) continue;
//         out.push(obj);
//       }
//     }
//     if (out.length && out[0].xDate !== undefined) out.sort((a,b) => (a.xDate||0) - (b.xDate||0));
//     console.log(`Processed chart data for ${currentSlide.kpi.name}:`, { 
//       dataPoints: out.length, 
//       sampleData: out.length > 0 ? [out[0], out[out.length-1]] : [],
//       dateFiltering: { fromD: fromD ? fromD.toISOString().split('T')[0] : null, toD: toD ? toD.toISOString().split('T')[0] : null }
//     });
//     return out;
//   }, [currentSlide, globalDateRange, selectedIdx]);

//   /* ---------- Save chart config (persist primary chart config) ---------- */
//   async function saveDates() {
//     if (!globalDateRange.dateFrom && !globalDateRange.dateTo) {
//       alert('Please select date range first');
//       return;
//     }
    
//     try {
//       // Save global date range to all slides' chart configurations
//       const results = [];
//       let successCount = 0;
//       let errorCount = 0;
      
//       for (const slide of kpis) {
//         try {
//           const kpi = slide.kpi;
//           const primary = slide.primaryChart;
//           const cfgSaved = primary && primary.config ? { ...primary.config } : {
//             chartType: "line",
//             xHeader: slide.parsed?.headers?.[0] || "",
//             yHeaders: slide.parsed?.headers?.length > 1 ? [slide.parsed.headers[1]] : [slide.parsed?.headers?.[0] || ""]
//           };
//           cfgSaved.dateFrom = globalDateRange.dateFrom || null;
//           cfgSaved.dateTo = globalDateRange.dateTo || null;
          
//           let result;
//           if (primary && primary.id) {
//             result = await api.put(`/kpis/${encodeURIComponent(kpi.id)}/charts/${encodeURIComponent(primary.id)}`, {
//               config: cfgSaved,
//             });
//           } else {
//             result = await api.post(`/kpis/${encodeURIComponent(kpi.id)}/charts`, {
//               name: `Primary - ${kpi.name}`,
//               config: cfgSaved,
//             });
//           }
//           results.push({ success: true, result, slideIndex: kpis.indexOf(slide) });
//           successCount++;
//         } catch (slideErr) {
//           console.error(`Failed to save chart for KPI ${slide.kpi.name}:`, slideErr);
//           results.push({ success: false, error: slideErr, slideIndex: kpis.indexOf(slide) });
//           errorCount++;
//         }
//       }
      
//       // Update local state with successful saves
//       const updatedKpis = [...kpis];
//       results.forEach(({ success, result, slideIndex }) => {
//         if (success && result && result.data) {
//           updatedKpis[slideIndex] = { ...updatedKpis[slideIndex], primaryChart: result.data };
//         }
//       });
//       setKpis(updatedKpis);
      
//       if (errorCount === 0) {
//         alert(`Successfully saved global date range to all ${successCount} KPI charts`);
//       } else {
//         alert(`Saved ${successCount} charts successfully, ${errorCount} failed. Check console for details.`);
//       }
//     } catch (err) {
//       console.error('Save operation failed', err);
//       alert('Save operation failed. Check console for details.');
//     }
//   }

//   async function saveSlideConfig() {
//     if (!currentSlide) return;
//     const kpi = currentSlide.kpi;
//     const primary = currentSlide.primaryChart;
//     const cfgSaved = primary && primary.config ? { ...primary.config } : {};
//     cfgSaved.dateFrom = globalDateRange.dateFrom || cfgSaved.dateFrom || null;
//     cfgSaved.dateTo = globalDateRange.dateTo || cfgSaved.dateTo || null;
//     try {
//       if (primary && primary.id) {
//         const res = await api.put(`/kpis/${encodeURIComponent(kpi.id)}/charts/${encodeURIComponent(primary.id)}`, {
//           config: cfgSaved,
//         });
//         const updated = res.data;
//         const copy = [...kpis];
//         copy[selectedIdx] = { ...copy[selectedIdx], primaryChart: updated };
//         setKpis(copy);
//         alert("Saved changes (updated primary chart)");
//       } else {
//         const res = await api.post(`/kpis/${encodeURIComponent(kpi.id)}/charts`, {
//           name: `Primary - ${kpi.name}`,
//           config: cfgSaved,
//         });
//         const created = res.data;
//         const copy = [...kpis];
//         copy[selectedIdx] = { ...copy[selectedIdx], primaryChart: created };
//         setKpis(copy);
//         alert("Saved changes (created primary chart)");
//       }
//     } catch (err) {
//       console.error("Save failed", err);
//       alert("Save failed");
//     }
//   }

//   /* ---------- Export helpers (fixed for date controls visibility) ---------- */
//   async function withHiddenScrollbars(fn) {
//     const prevDocOverflow = document.documentElement.style.overflow;
//     const prevBodyOverflow = document.body.style.overflow;
//     const prevContainerPad = containerRef.current ? containerRef.current.style.paddingBottom : "";
//     const prevContainerPadTop = containerRef.current ? containerRef.current.style.paddingTop : "";
//     const prevContainerOverflow = containerRef.current ? containerRef.current.style.overflow : "";
//     const noExportEls = containerRef.current ? Array.from(containerRef.current.querySelectorAll(".no-export")) : [];
//     const prevDisplay = noExportEls.map(el => el.style.display);
//     const chartArea = containerRef.current ? containerRef.current.querySelector(".chart-area") : null;
//     const prevChartPad = chartArea ? chartArea.style.paddingBottom : "";
//     const prevScrollTop = window.scrollY || window.pageYOffset || 0;
//     try {
//       document.documentElement.style.overflow = "hidden";
//       document.body.style.overflow = "hidden";
//       if (containerRef.current) {
//         containerRef.current.style.paddingBottom = "120px";
//         containerRef.current.style.paddingTop = "100px";
//         containerRef.current.style.overflow = "visible";
//       }
//       noExportEls.forEach(el => { el.style.display = "none"; });
//       if (chartArea) chartArea.style.paddingBottom = "80px";
//       if (containerRef.current) {
//         const rect = containerRef.current.getBoundingClientRect();
//         window.scrollTo({ top: 0, behavior: "instant" }); await new Promise(r => setTimeout(r, 100)); containerRef.current.scrollIntoView({ behavior: "instant", block: "center" });
//       } else {
//         window.scrollTo({ top: 0, behavior: "instant" });
//       }
//       await new Promise((r) => setTimeout(r, 300)); console.log("Container bounds:", containerRef.current.getBoundingClientRect());
//       await fn();
//     } finally {
//       document.documentElement.style.overflow = prevDocOverflow;
//       document.body.style.overflow = prevBodyOverflow;
//       if (containerRef.current) {
//         containerRef.current.style.paddingBottom = prevContainerPad || "";
//         containerRef.current.style.paddingTop = prevContainerPadTop || "";
//         containerRef.current.style.overflow = prevContainerOverflow || "";
//       }
//       noExportEls.forEach((el, i) => { el.style.display = prevDisplay[i] || ""; });
//       if (chartArea) chartArea.style.paddingBottom = prevChartPad || "";
//       window.scrollTo({ top: prevScrollTop, behavior: "instant" });
//     }
//   }

//   async function exportPNG() {
//     if (!containerRef.current) return;
//     try {
//       await withHiddenScrollbars(async () => {
//         const canvas = await html2canvas(containerRef.current, { scale: 2, useCORS: true, allowTaint: true, scrollX: 0, scrollY: 0, windowWidth: window.innerWidth, windowHeight: window.innerHeight });
//         const url = canvas.toDataURL("image/png");
//         const a = document.createElement("a");
//         a.href = url;
//         a.download = `${currentSlide?.kpi?.name || "kpi"}-presentation.png`;
//         a.click();
//       });
//     } catch (err) {
//       console.error("Export PNG failed", err);
//       alert("Export PNG failed");
//     }
//   }

//   async function exportPDF() {
//     if (!containerRef.current) return;
//     try {
//       await withHiddenScrollbars(async () => {
//         const canvas = await html2canvas(containerRef.current, { scale: 2, useCORS: true, allowTaint: true, scrollX: 0, scrollY: 0, windowWidth: window.innerWidth, windowHeight: window.innerHeight });
//         const imgData = canvas.toDataURL("image/png");
//         const pdf = new jsPDF({ orientation: "landscape" });
//         const pageW = pdf.internal.pageSize.getWidth();
//         const pageH = pdf.internal.pageSize.getHeight();
//         const img = new Image();
//         img.src = imgData;
//         await new Promise((res) => (img.onload = res));
//         const imgW = img.width;
//         const imgH = img.height;
//         const ratio = Math.min(pageW / imgW, pageH / imgH);
//         const drawW = imgW * ratio;
//         const drawH = imgH * ratio;
//         const x = (pageW - drawW) / 2;
//         const y = (pageH - drawH) / 2;
//         pdf.addImage(imgData, "PNG", x, y, drawW, drawH);
//         pdf.save(`${currentSlide?.kpi?.name || "kpi"}-presentation.pdf`);
//       });
//     } catch (err) {
//       console.error("Export PDF failed", err);
//       alert("Export PDF failed");
//     }
//   }

//   /* ---------- compute per-slide KPI metrics (memoized) ---------- */
//   const slideMetrics = useMemo(() => {
//     if (!currentSlide) return null;
//     const cfg = getSlideConfig(currentSlide);
//     // Use global date range
//     const from = globalDateRange.dateFrom || cfg.dateFrom || "";
//     const to = globalDateRange.dateTo || cfg.dateTo || "";

//     const slideObj = {
//       kpi: currentSlide.kpi,
//       headers: (currentSlide.parsed && Array.isArray(currentSlide.parsed.headers)) ? currentSlide.parsed.headers : [],
//       rows: (currentSlide.parsed && Array.isArray(currentSlide.parsed.rows)) ? currentSlide.parsed.rows : []
//     };

//     const metrics = computeKpiMetrics(
//       slideObj,
//       from ? parseDateLenient(from) : null,
//       to ? parseDateLenient(to) : null
//     );

//     return metrics;
//   }, [currentSlide, globalDateRange, selectedIdx]);

//   if (loading) {
//     return (
//       <div className="p-6 max-w-6xl mx-auto">
//         <div className="text-lg font-semibold">Loading presentation...</div>
//       </div>
//     );
//   }

//   /* ---------- helper to decide per-point whether it meets target ---------- */
//   function pointMeetsTarget(kpi, value, payload) {
//     if (value == null || kpi == null) return false;
//     // payload.xDate (ms) might be present for date-based x
//     const date = payload && payload.xDate ? new Date(payload.xDate) : null;
//     const perDayTarget = getTargetAtDate(kpi, date);
//     const action = (kpi.action === "sustain" ? "maintain" : (kpi.action || "maintain"));
//     const v = Number(value);
//     if (!Number.isFinite(v)) return false;

//     if (action === "increase" || action === "maximize") {
//       if (perDayTarget != null) return v >= Number(perDayTarget);
//       // fallback to top-level target
//       const t = computeTargetsForKpi(kpi);
//       return t.target != null ? v >= Number(t.target) : false;
//     } else if (action === "decrease" || action === "minimize") {
//       if (perDayTarget != null) return v <= Number(perDayTarget);
//       const t = computeTargetsForKpi(kpi);
//       return t.target != null ? v <= Number(t.target) : false;
//     } else { // maintain
//       const t = computeTargetsForKpi(kpi);
//       if (t.lower != null && t.upper != null) {
//         return v >= Number(t.lower) && v <= Number(t.upper);
//       }
//       if (perDayTarget != null) {
//         const tol = 1e-6;
//         return Math.abs(v - Number(perDayTarget)) <= tol;
//       }
//       return false;
//     }
//   }

//   /* custom dot renderer: small circle, green if meets target, otherwise light blue */
//   function renderCustomDot(dotProps, kpi) {
//     const { cx, cy, value, payload, index, dataKey } = dotProps;
//     if (cx == null || cy == null) return null;
//     const meets = pointMeetsTarget(kpi, value, payload);
//     const r = 3;
//     const fill = meets ? "#006400" : "#5aa9ff"; // dark green vs lighter blue
//     const stroke = meets ? "#004d00" : "#2b6fb2";
//     const uniqueKey = `dot-${dataKey || 'unknown'}-${index || 0}-${cx}-${cy}-${Date.now()}`;
//     return (
//       <circle key={uniqueKey} cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1} />
//     );
//   }

//   /* active dot renderer: larger radius, green if meets target, else slightly larger blue */
//   function renderActiveDot(dotProps, kpi) {
//     const { cx, cy, value, payload, index, dataKey } = dotProps;
//     if (cx == null || cy == null) return null;
//     const meets = pointMeetsTarget(kpi, value, payload);
//     const r = meets ? 6 : 5;
//     const fill = meets ? "#006400" : "#9ed3ff";
//     const stroke = meets ? "#003300" : "#2b6fb2";
//     const uniqueKey = `active-dot-${dataKey || 'unknown'}-${index || 0}-${cx}-${cy}-${Date.now()}`;
//     return (
//       <circle key={uniqueKey} cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1} />
//     );
//   }

//   return (
//     <div className="p-6 bg-gray-50 min-h-screen">
//       <div className="max-w-7xl mx-auto">
//         <div className="flex items-center justify-between mb-4">
//           <div>
//             <button className="text-sm text-blue-600 mr-4" onClick={() => navigate(-1)}>← Back</button>
//             <h1 className="text-2xl font-bold inline">Presentation — {kpis.length} KPIs</h1>
//             <div className="text-sm text-slate-500 mt-1">Use Next / Prev or keyboard arrows to navigate slides. Save changes will persist date range to the primary chart.</div>
//           </div>

//           <div className="flex items-center gap-2">
//             <select value={selectedIdx} onChange={(e) => goto(Number(e.target.value))} className="p-2 border rounded">
//               {kpis.map((s, i) => <option key={s.kpi.id} value={i}>{s.kpi.name}</option>)}
//             </select>

//             <button onClick={prev} className="px-3 py-1 bg-slate-100 rounded">Prev</button>
//             <button onClick={next} className="px-3 py-1 bg-slate-100 rounded">Next</button>

//             {isFullscreen ? (
//               <button onClick={exitFullscreen} className="px-3 py-1 bg-slate-100 rounded">Exit Fullscreen</button>
//             ) : (
//               <button onClick={enterFullscreen} className="px-3 py-1 bg-slate-100 rounded">Enter Fullscreen</button>
//             )}

//             <button onClick={exportPNG} className="px-3 py-1 bg-emerald-600 text-white rounded">Export PNG</button>
//             <button onClick={exportPDF} className="px-3 py-1 bg-blue-600 text-white rounded">Export PDF</button>
//           </div>
//         </div>

//         <div ref={containerRef} className="bg-white p-4 rounded shadow-sm" style={{ minHeight: "75vh", paddingTop: "40px", paddingBottom: "40px" }}>
//           {!currentSlide ? (
//             <div className="p-6 text-slate-600">No KPI slides available.</div>
//           ) : (
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//               <div className="lg:col-span-2 bg-white rounded border p-3">
//                 {/* Row 1: KPI Title + Date Controls */}
//                 <div className="flex items-start justify-between gap-4 mb-2">
//                   <div className="flex-1">
//                     <h2 className="text-sm font-semibold leading-tight">
//                       {currentSlide.kpi.name}
//                       <span className="ml-2 text-xs">
//                         {(() => {
//                           const a = (currentSlide.kpi.action === "sustain" ? "maintain" : (currentSlide.kpi.action || "maintain"));
//                           if (a === "increase" || a === "maximize") return <span style={{ color: "#006400" }}>↑</span>;
//                           if (a === "decrease" || a === "minimize") return <span style={{ color: "#d64949" }}>↓</span>;
//                           return null;
//                         })()} 
//                       </span>
//                     </h2>
//                     {currentSlide.kpi.description && <div className="text-xs text-slate-600 mt-1">{currentSlide.kpi.description}</div>}
//                   </div>

//                   {/* Date Controls */}
//                   <div className="flex items-center gap-2 flex-shrink-0">
//                     <select 
//                       value={globalDateRange.preset} 
//                       onChange={handlePresetChange}
//                       className="p-1 border rounded text-xs w-16"
//                     >
//                       <option value="">Custom</option>
//                       <option value="3months">3M</option>
//                       <option value="6months">6M</option>
//                       <option value="1year">1Y</option>
//                     </select>
                    
//                     <input
//                       type="date"
//                       value={globalDateRange.dateFrom}
//                       onChange={(e) => setGlobalDateRange(prev => ({ ...prev, preset: '', dateFrom: e.target.value }))}
//                       className="p-1 border rounded text-xs w-20"
//                       placeholder="From"
//                     />
                    
//                     <input
//                       type="date"
//                       value={globalDateRange.dateTo}
//                       onChange={(e) => setGlobalDateRange(prev => ({ ...prev, preset: '', dateTo: e.target.value }))}
//                       className="p-1 border rounded text-xs w-20"
//                       placeholder="To"
//                     />
                    
//                     <button 
//                       onClick={saveDates}
//                       className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
//                       title="Save current date range to all KPI charts"
//                     >
//                       Save
//                     </button>
//                   </div>
//                 </div>

//                 {/* Row 2: Chart Controls - Present and KPI/Attr buttons */}
//                 <div className="flex items-center justify-between gap-2 mb-2">
//                   <div className="flex items-center gap-2">
//                     <label className="flex items-center gap-1 text-xs text-slate-500">
//                       <input type="checkbox" checked={showPresentLine} onChange={(e) => setShowPresentLine(e.target.checked)} />
//                       Present
//                     </label>
//                   </div>

//                   <div className="flex items-center gap-1">
//                     <button 
//                       onClick={() => setChartView('main')} 
//                       className={`px-2 py-1 rounded text-xs ${
//                         chartView === 'main' 
//                           ? 'bg-blue-600 text-white' 
//                           : 'bg-white border hover:bg-gray-50'
//                       }`}
//                       title="KPI Value Chart"
//                     >
//                       KPI
//                     </button>
                    
//                     <button 
//                       onClick={() => setChartView('attributes')} 
//                       className={`px-2 py-1 rounded text-xs ${
//                         chartView === 'attributes' 
//                           ? 'bg-blue-600 text-white' 
//                           : 'bg-white border hover:bg-gray-50'
//                       }`}
//                       title="Attributes Pareto Chart"
//                     >
//                       Attr
//                     </button>
//                   </div>
//                 </div>

//                 {/* chart wrapper */}
//                 <div className="chart-area border rounded p-2" style={{ width: "100%", height: "55vh" }}>
//                   {chartData.length === 0 && chartView === 'main' ? (
//                     <div className="flex items-center justify-center h-full text-slate-500">
//                       <div className="text-center">
//                         <div className="text-lg mb-2">No chart data available for {currentSlide.kpi.name}</div>
//                         <div className="text-sm mb-2">
//                           {!currentSlide.parsed?.rows?.length ? 'No data uploaded for this KPI' : 
//                            globalDateRange.dateFrom || globalDateRange.dateTo ? 'No data in selected date range' :
//                            'Data may not contain valid numeric values'}
//                         </div>
//                         <div className="text-xs text-slate-400">
//                           Headers: {currentSlide.parsed?.headers?.length || 0}, 
//                           Rows: {currentSlide.parsed?.rows?.length || 0}
//                           {globalDateRange.dateFrom && <span>, From: {globalDateRange.dateFrom}</span>}
//                           {globalDateRange.dateTo && <span>, To: {globalDateRange.dateTo}</span>}
//                         </div>
//                         <div className="text-xs text-blue-600 mt-2">
//                           Try adjusting the date range or check if data has been uploaded
//                         </div>
//                       </div>
//                     </div>
//                   ) : (
//                   <ResponsiveContainer width="100%" height="100%">
//                     {chartView === 'main' ? (
//                       // Main KPI Chart
//                       (currentSlide.primaryChart && currentSlide.primaryChart.config && (getSlideConfig(currentSlide).chartType === "bar")) ? (
//                       (() => {
//                         const cfg = getSlideConfig(currentSlide);
//                         const numericVals = (chartData || []).flatMap(r => cfg.yHeaders.map(h => r[h]).filter(v => v != null && Number.isFinite(v)));
//                         const maxVal = numericVals.length ? Math.max(...numericVals) : 10;
//                         const pad = Math.max(1, Math.abs(maxVal) * 0.08);
//                         const top = Math.ceil(maxVal + pad);
//                         const t = slideMetrics && slideMetrics.target != null ? slideMetrics.target : computeTargetsForKpi(currentSlide.kpi).target;
//                         const targets = computeTargetsForKpi(currentSlide.kpi);
//                         const action = (currentSlide.kpi.action === "sustain" ? "maintain" : (currentSlide.kpi.action || "maintain"));

//                         // For bar coloring, color bars green where they meet target (only for first yHeader here)
//                         const firstY = cfg.yHeaders && cfg.yHeaders.length ? cfg.yHeaders[0] : null;

//                         return (
//                           <BarChart data={chartData} margin={{ top: 5, right: 8, left: 5, bottom: 60 }}>
//                             <CartesianGrid strokeDasharray="3 3" />
//                             <XAxis dataKey="x" tick={{ fontSize: 11 }} tickMargin={12} height={48} interval="preserveStartEnd" padding={{ left: 5, right: 5 }}/>
//                             <YAxis />
//                             <Tooltip />
//                             <Legend />

//                             {/* background shading for good area */}
//                             { (action === "increase" || action === "maximize") && t != null && (
//                               <ReferenceArea y1={Number(t)} y2={top} fill="#006400" opacity={0.06} isFront={false} />
//                             ) }
//                             { (action === "decrease" || action === "minimize") && t != null && (
//                               <ReferenceArea y1={0} y2={Number(t)} fill="#006400" opacity={0.06} isFront={false} />
//                             ) }
//                             { action === "maintain" && targets.lower != null && targets.upper != null && (
//                               <ReferenceArea y1={Number(targets.lower)} y2={Number(targets.upper)} fill="#006400" opacity={0.06} isFront={false} />
//                             ) }

//                             {/* present line toggle */}
//                             { showPresentLine && currentSlide.kpi.presentValue != null && (
//                               <ReferenceLine y={Number(currentSlide.kpi.presentValue)} stroke="#111827" strokeDasharray="4 4" label={{ value: `Present: ${currentSlide.kpi.presentValue}`, position: "insideBottomRight", fill: "#111827" }} />
//                             ) }

//                             {/* target line */}
//                             { t != null && <ReferenceLine y={Number(t)} stroke="#006400" strokeDasharray="4 4" label={{ value: `Target: ${t}`, position: "insideTopLeft", fill: "#006400" }} /> }

//                             { Array.isArray(cfg.yHeaders) && cfg.yHeaders.map((yh, idx) => {
//                               if (yh === firstY) {
//                                 return (
//                                   <Bar key={`bar-${yh}-${idx}`} dataKey={yh} barSize={40 / Math.max(1, cfg.yHeaders.length)} >
//                                     {chartData.map((entry, i) => {
//                                       const val = entry[yh];
//                                       const meets = pointMeetsTarget(currentSlide.kpi, val, entry);
//                                       return <Cell key={`cell-${yh}-${i}-${entry.x || i}`} fill={meets ? "#006400" : ["#5aa9ff","#ff7f0e","#006400","#d64949","#9467bd"][idx%5]} />;
//                                     })}
//                                   </Bar>
//                                 );
//                               }
//                               return <Bar key={`bar-${yh}-${idx}`} dataKey={yh} barSize={40 / Math.max(1, cfg.yHeaders.length)} fill={["#5aa9ff","#ff7f0e","#006400","#d64949","#9467bd"][idx%5]} />;
//                             }) }
//                           </BarChart>
//                         );
//                       })()
//                     ) : (
//                       (() => {
//                         const cfg = getSlideConfig(currentSlide);
//                         const numericVals = (chartData || []).flatMap(r => cfg.yHeaders.map(h => r[h]).filter(v => v != null && Number.isFinite(v)));
//                         const maxVal = numericVals.length ? Math.max(...numericVals) : 10;
//                         const pad = Math.max(1, Math.abs(maxVal) * 0.08);
//                         const top = Math.ceil(maxVal + pad);
//                         const t = slideMetrics && slideMetrics.target != null ? slideMetrics.target : computeTargetsForKpi(currentSlide.kpi).target;
//                         const targets = computeTargetsForKpi(currentSlide.kpi);
//                         const action = (currentSlide.kpi.action === "sustain" ? "maintain" : (currentSlide.kpi.action || "maintain"));

//                         return (
//                           <LineChart data={chartData} margin={{ top: 5, right: 8, left: 5, bottom: 60 }}>
//                             <CartesianGrid strokeDasharray="3 3" />
//                             <XAxis dataKey="x" tick={{ fontSize: 11 }} tickMargin={12} height={48} />
//                             <YAxis />
//                             <Tooltip />
//                             <Legend />

//                             {/* background shading for good area */}
//                             { (action === "increase" || action === "maximize") && t != null && (
//                               <ReferenceArea y1={Number(t)} y2={top} fill="#006400" opacity={0.06} isFront={false} />
//                             ) }
//                             { (action === "decrease" || action === "minimize") && t != null && (
//                               <ReferenceArea y1={0} y2={Number(t)} fill="#006400" opacity={0.06} isFront={false} />
//                             ) }
//                             { action === "maintain" && targets.lower != null && targets.upper != null && (
//                               <ReferenceArea y1={Number(targets.lower)} y2={Number(targets.upper)} fill="#006400" opacity={0.06} isFront={false} />
//                             ) }

//                             {/* present line toggle */}
//                             { showPresentLine && currentSlide.kpi.presentValue != null && (
//                               <ReferenceLine y={Number(currentSlide.kpi.presentValue)} stroke="#111827" strokeDasharray="4 4" label={{ value: `Present: ${currentSlide.kpi.presentValue}`, position: "insideBottomRight", fill: "#111827" }} />
//                             ) }

//                             {/* target / lower / upper rendering */}
//                             { slideMetrics && slideMetrics.target != null ? (
//                                 <ReferenceLine y={Number(slideMetrics.target)} stroke="#006400" strokeDasharray="4 4" label={{ value: `Target: ${slideMetrics.target}`, position: "insideTopLeft", fill: "#006400" }} />
//                               ) : (() => {
//                                 if (targets.lower != null || targets.upper != null) {
//                                   return (
//                                     <>
//                                       {targets.lower != null && <ReferenceLine y={Number(targets.lower)} stroke="#006400" strokeDasharray="4 4" label={{ value: `Lower: ${targets.lower}`, position: "insideTopLeft", fill: "#006400" }} />}
//                                       {targets.upper != null && <ReferenceLine y={Number(targets.upper)} stroke="#006400" strokeDasharray="4 4" label={{ value: `Upper: ${targets.upper}`, position: "insideTopLeft", fill: "#006400" }} />}
//                                     </>
//                                   );
//                                 }
//                                 return null;
//                               })()
//                             }

//                             { Array.isArray(cfg.yHeaders) && cfg.yHeaders.map((yh, idx) =>
//                               <Line
//                                 key={`line-${yh}-${idx}`}
//                                 type="monotone"
//                                 dataKey={yh}
//                                 stroke={["#5aa9ff","#ff7f0e","#006400","#d64949","#9467bd"][idx%5]}
//                                 dot={(dotProps) => renderCustomDot({...dotProps, dataKey: yh}, currentSlide.kpi)}
//                                 activeDot={(dotProps) => renderActiveDot({...dotProps, dataKey: yh}, currentSlide.kpi)}
//                                 dotCount={false}
//                                 connectNulls
//                               />
//                             )}                          </LineChart>
//                         );
//                       })()
//                     )
//                     ) : (
//                       // Attributes Pareto Chart
//                       (() => {
//                         const sortedAttributes = Array.isArray(currentSlide.kpi.attributes) 
//                           ? [...currentSlide.kpi.attributes].sort((a, b) => (b.count || 0) - (a.count || 0))
//                           : [];
                        
//                         if (sortedAttributes.length === 0) {
//                           return (
//                             <div className="flex items-center justify-center h-full text-slate-500">
//                               No attributes available for Pareto analysis
//                             </div>
//                           );
//                         }
                        
//                         const totalCount = sortedAttributes.reduce((sum, attr) => sum + (attr.count || 0), 0);
//                         let cumulativeCount = 0;
                        
//                         const paretoData = sortedAttributes.map(attr => {
//                           cumulativeCount += (attr.count || 0);
//                           return {
//                             name: attr.name,
//                             count: attr.count || 0,
//                             cumulative: totalCount > 0 ? (cumulativeCount / totalCount) * 100 : 0
//                           };
//                         });
                        
//                         return (
//                           <ComposedChart data={paretoData} margin={{ top: 10, right: 15, left: 10, bottom: 70 }}>
//                             <CartesianGrid strokeDasharray="3 3" />
//                             <XAxis 
//                               dataKey="name" 
//                               angle={-45} 
//                               textAnchor="end" 
//                               height={80}
//                               tick={{ fontSize: 9 }}
//                             />
//                             <YAxis yAxisId="left" orientation="left" />
//                             <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
//                             <Tooltip 
//                               formatter={(value, name, props) => {
//                                 // name is the dataKey ('count' or 'cumulative')
//                                 if (name === 'count') {
//                                   return [value, 'Frequency'];
//                                 } else if (name === 'cumulative') {
//                                   return [`${Number(value).toFixed(2)}%`, 'Cumulative %'];
//                                 }
//                                 return [value, name];
//                               }}
//                               labelFormatter={(label) => `Attribute: ${label}`}
//                             />
//                             <Legend />
//                             <Bar yAxisId="left" dataKey="count" fill="#5aa9ff" name="Frequency" />
//                             <Line 
//                               key="cumulative-line-pareto"
//                               yAxisId="right" 
//                               type="monotone" 
//                               dataKey="cumulative" 
//                               stroke="#ff7f0e" 
//                               strokeWidth={3}
//                               name="Cumulative %"
//                               dot={{ fill: '#ff7f0e', r: 4 }}
//                             />
//                             <ReferenceLine yAxisId="right" y={80} stroke="#d64949" strokeDasharray="4 4" label={{ value: "80%", position: "insideTopRight" }} />
//                           </ComposedChart>
//                         );
//                       })()
//                     )}
//                   </ResponsiveContainer>
//                   )}                </div>

//                 {/* Target Revisions below chart */}
//                 <div className="mt-2 pt-2 border-t">
//                   <h4 className="text-sm font-medium mb-2">Target Revisions ({Array.isArray(currentSlide.kpi.targetRevisions) ? currentSlide.kpi.targetRevisions.length : 0})</h4>
//                   <div className="overflow-auto text-sm max-h-32">
//                     <table className="min-w-full">
//                       <thead className="bg-slate-50 sticky top-0">
//                         <tr>
//                           <th className="px-2 py-1 text-left text-xs">#</th>
//                           <th className="px-2 py-1 text-left text-xs">Target Value</th>
//                           <th className="px-2 py-1 text-left text-xs">Revision Date</th>
//                           <th className="px-2 py-1 text-left text-xs">Created</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {Array.isArray(currentSlide.kpi.targetRevisions) && currentSlide.kpi.targetRevisions.length > 0 ? (
//                           [...currentSlide.kpi.targetRevisions].slice().sort((a,b) => {
//                             const da = parseDateLenient(a.revisionDate) || new Date(a.createdAt || 0);
//                             const db = parseDateLenient(b.revisionDate) || new Date(b.createdAt || 0);
//                             return db - da; // Most recent first
//                           }).map((rev, idx) => (
//                             <tr key={rev.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
//                               <td className="px-2 py-1 text-xs">{idx + 1}</td>
//                               <td className="px-2 py-1 text-xs font-medium">{rev.targetValue}</td>
//                               <td className="px-2 py-1 text-xs">{rev.revisionDate ? formatDateDisplay(rev.revisionDate) : "—"}</td>
//                               <td className="px-2 py-1 text-xs">{rev.createdAt ? formatDateDisplay(rev.createdAt) : "—"}</td>
//                             </tr>
//                           ))
//                         ) : (
//                           <tr>
//                             <td colSpan={4} className="px-2 py-3 text-center text-slate-500">No target revisions yet.</td>
//                           </tr>
//                         )}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//               </div>

//               <div className="bg-white p-4 rounded border">
//                 <h3 className="font-semibold mb-3">KPI Summary</h3>

//                 {currentSlide.kpi && (
//                   <div className="space-y-3">
//                     <div className="flex items-start justify-between gap-3">
//                       <div>
//                         <div className="text-sm text-slate-600">Value (avg)</div>
//                         <div className="text-3xl font-bold text-slate-900">{slideMetrics && slideMetrics.avgValue != null ? (Number.isInteger(slideMetrics.avgValue) ? slideMetrics.avgValue : Number(slideMetrics.avgValue.toFixed(2))) : "—"}</div>
//                       </div>

//                       <div className="text-right">
//                         <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-100`}>
//                           {slideMetrics ? `${Number(slideMetrics.percentAchieved ?? 0).toFixed(1)}%` : "—"}
//                         </div>
//                         <div className="text-xs text-slate-400 mt-2">target: <span className="font-medium text-slate-700">{slideMetrics && slideMetrics.target != null ? slideMetrics.target : "—"}</span></div>
//                       </div>
//                     </div>

//                     <div className="flex gap-4 text-sm text-slate-600">
//                       <div>Days Achieved: <span className="font-medium text-slate-800">{slideMetrics ? slideMetrics.daysAchieved : 0}</span></div>
//                       <div>Days Filled: <span className="font-medium text-slate-800">{slideMetrics ? slideMetrics.daysFilled : 0}</span></div>
//                     </div>

//                     {/* Action Plans */}
//                     <div className="pt-2 border-t">
//                       <h4 className="text-sm font-medium mb-2">Action Plans ({Array.isArray(currentSlide.kpi.actions) ? currentSlide.kpi.actions.length : 0})</h4>
//                       {Array.isArray(currentSlide.kpi.actions) && currentSlide.kpi.actions.length > 0 ? (
//                         <div className="space-y-2 max-h-32 overflow-y-auto">
//                           {currentSlide.kpi.actions.slice(0, 5).map((action, idx) => (
//                             <div key={action.id || idx} className="text-sm p-2 bg-slate-50 rounded">
//                               <div className="font-medium">{action.description}</div>
//                               <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
//                                 <span>Responsibility: {action.responsibility || "—"}</span>
//                                 <span>•</span>
//                                 <span>Status: <span className={`px-1 rounded ${
//                                   action.currentStatus === "Completed" ? "bg-green-100 text-green-800" :
//                                   action.currentStatus === "In Progress" ? "bg-blue-100 text-blue-800" :
//                                   action.currentStatus === "Delay" ? "bg-red-100 text-red-800" :
//                                   "bg-gray-100 text-gray-800"
//                                 }`}>{action.currentStatus || action.status || "Planned"}</span></span>
//                                 {(action.plannedCompletionDate || action.deadline) && (
//                                   <span>• Deadline: {formatDateDisplay(action.plannedCompletionDate || action.deadline)}</span>
//                                 )}
//                               </div>
//                             </div>
//                           ))}
//                         </div>
//                       ) : (
//                         <div className="text-sm text-slate-500">No action plans yet.</div>
//                       )}
//                     </div>

//                     {/* Top 5 Attributes */}
//                     <div className="mt-4">
//                       <h4 className="text-sm font-medium mb-2">Top 5 Attributes (by count in period)</h4>
//                       {(() => {
//                         // Get date range from global date range
//                         const cfg = getSlideConfig(currentSlide);
//                         const fromD = globalDateRange.dateFrom || cfg.dateFrom || "";
//                         const toD = globalDateRange.dateTo || cfg.dateTo || "";
                        
//                         // For now, show all attributes sorted by count since period-based filtering would require data analysis
//                         const sortedAttributes = Array.isArray(currentSlide.kpi.attributes) 
//                           ? [...currentSlide.kpi.attributes].sort((a, b) => (b.count || 0) - (a.count || 0))
//                           : [];
                        
//                         return sortedAttributes.length > 0 ? (
//                           <div className="space-y-1">
//                             {sortedAttributes.slice(0, 5).map((attr, idx) => (
//                               <div key={attr.id || idx} className="text-sm flex justify-between items-center">
//                                 <span className="font-medium">{attr.name}</span>
//                                 <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
//                                   {attr.count || 0}
//                                 </span>
//                               </div>
//                             ))}
//                             {sortedAttributes.length > 5 && (
//                               <div className="text-xs text-slate-400 mt-2">+{sortedAttributes.length - 5} more attributes</div>
//                             )}
//                             {(fromD || toD) && (
//                               <div className="text-xs text-slate-400 mt-2">
//                                 Period: {fromD || "Start"} to {toD || "End"}
//                               </div>
//                             )}
//                           </div>
//                         ) : (
//                           <div className="text-sm text-slate-500">No attributes defined.</div>
//                         );
//                       })()} 
//                     </div>

//                     {/* KPI Details below Pareto Chart option */}
//                     <div className="mt-4 pt-4 border-t">
//                       <h4 className="text-xs font-medium mb-2">KPI Details</h4>
//                       <div className="space-y-1 text-xs">
//                         <div><strong>Owner:</strong> {currentSlide.kpi.owner || "—"}</div>
//                         <div><strong>Unit:</strong> {currentSlide.kpi.unit || "—"}</div>
//                         <div><strong>Created:</strong> {currentSlide.kpi.createdAt ? new Date(currentSlide.kpi.createdAt).toLocaleDateString() : "—"}</div>
//                         <div><strong>Total Attributes:</strong> {Array.isArray(currentSlide.kpi.attributes) ? currentSlide.kpi.attributes.length : 0}</div>
//                       </div>
//                     </div>

//                   </div>
//                 )}
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }






// client/src/pages/PresentationDeck.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  BarChart,
  Bar,
  Cell,
  ComposedChart,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* --------- helpers: lenient date parsing & formatting --------- */
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
  return null;
}
function formatDateLabel(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return String(d);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function formatDateDisplay(value) {
  if (!value) return "—";
  const d = parseDateLenient(value);
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* --------- column detection helpers --------- */
function detectNumericColumns(headers = [], rows = []) {
  const candidates = [];
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
    if (samples === 0) {
      if (/target|value|actual|produced|qty|quantity|count|pieces|loss|snf|fat|kpi/i.test(String(headers[i] || ""))) candidates.push(i);
    } else if (numeric >= Math.ceil(samples / 2)) {
      candidates.push(i);
    }
  }
  return candidates;
}
function findDateIndex(headers = []) {
  const h = (headers || []).map(x => (x || "").toString());
  const patterns = [/^date$/i, /\bdate\b/i, /timestamp/i, /day/i];
  for (const p of patterns) {
    const idx = h.findIndex(s => p && p.test && p.test(s));
    if (idx !== -1) return idx;
  }
  return 0;
}
function findValueIndex(headers = [], rows = []) {
  const h = (headers || []).map(x => (x || "").toString());
  const patterns = [/kpi\s*value/i, /\bvalue\b/i, /actual/i, /produced/i, /qty|quantity/i, /measurement/i];
  for (const p of patterns) {
    const idx = h.findIndex(s => p && p.test && p.test(s));
    if (idx !== -1) return idx;
  }
  const numericCols = detectNumericColumns(headers, rows);
  if (numericCols.length > 0) return numericCols[0];
  if (headers.length > 2) return 2;
  return Math.max(0, headers.length - 1);
}

/* --------- compute target logic (same rules as other pages) --------- */
function computeTargetsForKpi(kpi) {
  if (!kpi) return { target: null, lower: null, upper: null };
  const action = (kpi.action === "sustain" ? "maintain" : (kpi.action || "maintain"));
  const tv = kpi.targetValue !== undefined ? kpi.targetValue : null;
  const tl = kpi.targetLowerValue !== undefined ? kpi.targetLowerValue : null;
  const tu = kpi.targetUpperValue !== undefined ? kpi.targetUpperValue : null;

  if (action === "increase" || action === "decrease") {
    return { target: tv != null ? Number(tv) : null, lower: null, upper: null };
  }
  if (action === "maximize") return { target: tu != null ? Number(tu) : null, lower: null, upper: null };
  if (action === "minimize") return { target: tl != null ? Number(tl) : null, lower: null, upper: null };
  if (action === "maintain") {
    const lower = tl != null ? Number(tl) : null;
    const upper = tu != null ? Number(tu) : null;
    return { target: (lower != null && upper != null) ? (Number(lower) + Number(upper)) / 2 : (tv != null ? Number(tv) : null), lower, upper };
  }
  return { target: tv != null ? Number(tv) : null, lower: null, upper: null };
}

/* --------- pick target revision for a given date --------- */
function getTargetAtDate(kpi, date) {
  if (!kpi) return null;
  if (!Array.isArray(kpi.targetRevisions) || kpi.targetRevisions.length === 0) {
    const t = computeTargetsForKpi(kpi);
    return t.target;
  }

  const d = date instanceof Date ? date : parseDateLenient(date);
  const revs = [...kpi.targetRevisions].filter(Boolean).slice().sort((a, b) => {
    const da = parseDateLenient(a.revisionDate);
    const db = parseDateLenient(b.revisionDate);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });

  if (!d) {
    const last = revs[revs.length - 1];
    if (last && last.targetValue != null) return Number(last.targetValue);
    return computeTargetsForKpi(kpi).target;
  }

  let chosen = null;
  for (const r of revs) {
    const rd = parseDateLenient(r.revisionDate);
    if (!rd) continue;
    if (d >= rd) chosen = r.targetValue;
  }
  if (chosen != null) return Number(chosen);
  if (kpi.targetValue != null) return Number(kpi.targetValue);
  const first = revs[0];
  return first && first.targetValue != null ? Number(first.targetValue) : null;
}

/* --------- compute per-kpi metrics for a given date range --------- */
function computeKpiMetrics({ kpi, headers = [], rows = [] }, dateFrom, dateTo) {
  const fromD = dateFrom ? (dateFrom instanceof Date ? new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate(), 0,0,0,0) : parseDateLenient(dateFrom)) : null;
  const toD = dateTo ? (dateTo instanceof Date ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23,59,59,999) : parseDateLenient(dateTo)) : null;

  const dateIdx = findDateIndex(headers);
  const valueIdx = findValueIndex(headers, rows);

  const dayMap = new Map();
  for (let r = 0; r < rows.length; r++) {
    const row = Array.isArray(rows[r]) ? rows[r] : [];
    const rawDate = row[dateIdx];
    const d = parseDateLenient(rawDate);
    if (!d) continue;
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0,0,0,0);
    if (fromD && dayStart < fromD) continue;
    if (toD && dayStart > toD) continue;

    let rawValue = row[valueIdx];
    if (rawValue === null || rawValue === undefined || String(rawValue).trim() === "") {
      let found = null;
      for (let ci = row.length - 1; ci >= 0; ci--) {
        const cand = row[ci];
        if (cand === null || cand === undefined || String(cand).trim() === "") continue;
        const n = Number(String(cand).replace(/,/g, ""));
        if (!Number.isNaN(n)) { found = n; break; }
      }
      if (found === null) continue;
      rawValue = found;
    }

    const num = Number(String(rawValue).replace(/,/g, "").trim());
    if (Number.isNaN(num)) continue;

    const key = `${dayStart.getFullYear()}-${String(dayStart.getMonth()+1).padStart(2, "0")}-${String(dayStart.getDate()).padStart(2, "0")}`;
    dayMap.set(key, { date: dayStart, value: num });
  }

  const dayEntries = Array.from(dayMap.values()).map(x => x).sort((a,b) => a.date - b.date);
  const dayValues = dayEntries.map(x => x.value);
  const daysFilled = dayValues.length;
  const avgValue = dayValues.length > 0 ? dayValues.reduce((a,b)=>a+b,0)/dayValues.length : null;

  const targets = computeTargetsForKpi(kpi);
  let daysAchieved = 0;
  for (const entry of dayEntries) {
    const perDayTarget = getTargetAtDate(kpi, entry.date);
    const action = (kpi.action === "sustain" ? "maintain" : (kpi.action || "maintain"));
    const v = Number(entry.value);
    if (!Number.isFinite(v)) continue;
    if (perDayTarget == null) {
      if (action === "maintain") {
        const lower = targets.lower, upper = targets.upper;
        if (lower != null && upper != null && v >= lower && v <= upper) daysAchieved++;
      }
      continue;
    }
    if (action === "increase" || action === "maximize") {
      if (v >= Number(perDayTarget)) daysAchieved++;
    } else if (action === "decrease" || action === "minimize") {
      if (v <= Number(perDayTarget)) daysAchieved++;
    } else {
      const lower = targets.lower, upper = targets.upper;
      if (lower != null && upper != null) {
        if (v >= lower && v <= upper) daysAchieved++;
      } else {
        const tol = 1e-6;
        if (Math.abs(v - Number(perDayTarget)) <= tol) daysAchieved++;
      }
    }
  }

  let periodTarget = null;
  if (dayEntries.length > 0) {
    const lastDay = dayEntries[dayEntries.length - 1].date;
    periodTarget = getTargetAtDate(kpi, lastDay);
  } else if (toD) {
    periodTarget = getTargetAtDate(kpi, toD);
  } else {
    periodTarget = computeTargetsForKpi(kpi).target;
  }

  const percentAchieved = (daysFilled > 0) ? (daysAchieved / daysFilled) * 100 : 0;

  return {
    daysFilled,
    daysAchieved,
    avgValue,
    percentAchieved,
    target: periodTarget,
  };
}

/* --------- Presentation Deck (one slide per KPI) --------- */
export default function PresentationDeck() {
  const { plantId } = useParams();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState([]); // array of { kpi, parsed, primaryChart }
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Chart view state: 'main' for KPI value chart, 'attributes' for Pareto chart
  const [chartView, setChartView] = useState('main');

  // toggle for showing present value line on charts
  const [showPresentLine, setShowPresentLine] = useState(false);

  // Y-axis custom values
  const [yAxisMin, setYAxisMin] = useState('');
  const [yAxisMax, setYAxisMax] = useState('');

  // Global date range state with presets
  const [globalDateRange, setGlobalDateRange] = useState({
    preset: '3months', // '', '3months', '6months', '1year'
    dateFrom: '',
    dateTo: ''
  });

  // Calculate initial date range when component mounts
  useEffect(() => {
    const today = new Date();
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    const dateFrom = threeMonthsAgo.toISOString().split('T')[0];
    const dateTo = today.toISOString().split('T')[0];
    
    setGlobalDateRange({
      preset: '3months',
      dateFrom,
      dateTo
    });
  }, []);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const res = await api.get(`/kpis/plant/${encodeURIComponent(plantId)}`);
        const list = Array.isArray(res.data) ? res.data : [];

        const promises = list.map(async (k) => {
          const [kpiRes, pRes, cRes] = await Promise.allSettled([
            api.get(`/kpis/${encodeURIComponent(k.id)}`), // Get full KPI details
            api.get(`/uploads/${encodeURIComponent(k.id)}/preview?limit=999999`),
            api.get(`/kpis/${encodeURIComponent(k.id)}/charts`),
          ]);
          
          // Use the detailed KPI data instead of the basic list data
          const fullKpi = (kpiRes.status === "fulfilled" && kpiRes.value && kpiRes.value.data) ? kpiRes.value.data : k;
          const parsed = (pRes.status === "fulfilled" && pRes.value && pRes.value.data) ? pRes.value.data : { headers: [], rows: [] };
          const charts = (cRes.status === "fulfilled" && Array.isArray(cRes.value.data)) ? cRes.value.data : [];
          const primary = charts.length > 0 ? charts[0] : null;
          
          console.log('Full KPI data for presentation:', fullKpi.id, {
            targetRevisions: fullKpi.targetRevisions,
            actions: fullKpi.actions,
            attributes: fullKpi.attributes
          });
          
          return { kpi: fullKpi, parsed, primaryChart: primary };
        });

        const resolved = await Promise.all(promises);
        setKpis(resolved);
        setSelectedIdx(0);
      } catch (err) {
        console.error("Failed to load presentation content", err);
        setKpis([]);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
    // eslint-disable-next-line
  }, [plantId]);

  useEffect(() => {
    function onFS() {
      const inFs = Boolean(document.fullscreenElement);
      setIsFullscreen(inFs);
      if (inFs) {
        document.documentElement.style.background = "#ffffff";
        document.body.style.background = "#ffffff";
        // Remove padding in fullscreen mode to utilize all available space
        if (containerRef.current) {
          containerRef.current.style.padding = "0";
        }
      } else {
        document.documentElement.style.background = "";
        document.body.style.background = "";
        // Restore padding when exiting fullscreen mode
        if (containerRef.current) {
          containerRef.current.style.padding = "";
        }
      }
    }
    document.addEventListener("fullscreenchange", onFS);
    return () => document.removeEventListener("fullscreenchange", onFS);
  }, []);

  function enterFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }
  function exitFullscreen() {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }

  function goto(idx) {
    if (idx < 0) idx = kpis.length - 1; // Go to last slide when going before first
    if (idx >= kpis.length) idx = 0; // Go to first slide when going after last
    setSelectedIdx(idx);
    // Reset chart view to main KPI chart when navigating
    setChartView('main');
  }
  function next() { goto(selectedIdx + 1); }
  function prev() { goto(selectedIdx - 1); }

  useEffect(() => {
    function onKey(e) {
      const active = document.activeElement;
      const tag = active && active.tagName ? active.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || tag === "select" || active?.isContentEditable) return;
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIdx, kpis.length]);

  function getSlideConfig(slide) {
    const cfg = slide.primaryChart && slide.primaryChart.config ? slide.primaryChart.config : null;
    const headers = slide.parsed?.headers || [];
    return {
      chartType: cfg?.chartType || "line",
      xHeader: cfg?.xHeader || (headers[0] || ""),
      yHeaders: Array.isArray(cfg?.yHeaders) && cfg.yHeaders.length > 0 ? cfg.yHeaders : (headers.length > 1 ? [headers[1]] : (headers[0] ? [headers[0]] : [])),
      dateFrom: globalDateRange.dateFrom || cfg?.dateFrom || "",
      dateTo: globalDateRange.dateTo || cfg?.dateTo || "",
    };
  }

  // Handle preset date range changes
  const handlePresetChange = (e) => {
    const preset = e.target.value;
    const today = new Date();
    let dateFrom = '';
    let dateTo = today.toISOString().split('T')[0];
    
    if (preset === '3months') {
      const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
      dateFrom = threeMonthsAgo.toISOString().split('T')[0];
    } else if (preset === '6months') {
      const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
      dateFrom = sixMonthsAgo.toISOString().split('T')[0];
    } else if (preset === '1year') {
      const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      dateFrom = oneYearAgo.toISOString().split('T')[0];
    }
    
    setGlobalDateRange({
      preset,
      dateFrom,
      dateTo
    });
  };

  const currentSlide = kpis[selectedIdx];

  /* ---------- derived chart data for recharts ---------- */
  const chartData = useMemo(() => {
    if (!currentSlide) {
      console.log('No currentSlide available');
      return [];
    }
    const parsed = currentSlide.parsed || { headers: [], rows: [] };
    const cfg = getSlideConfig(currentSlide);
    const headers = parsed.headers || [];
    const rows = parsed.rows || [];
    
    console.log(`Chart data for ${currentSlide.kpi.name}:`, {
      headers: headers.length,
      rowCount: rows.length,
      dateRange: { from: globalDateRange.dateFrom, to: globalDateRange.dateTo },
      configHeaders: { xHeader: cfg.xHeader, yHeaders: cfg.yHeaders }
    });
    
    if (!cfg.xHeader || !Array.isArray(cfg.yHeaders) || cfg.yHeaders.length === 0) {
      const dateIdx = findDateIndex(headers);
      const valueIdx = findValueIndex(headers, rows);
      if (headers.length === 0) {
        console.log('No headers found, returning empty data');
        return [];
      }
      const xHeader = headers[dateIdx] || headers[0];
      const yHeader = headers[valueIdx] || headers[headers.length - 1];
      cfg.xHeader = xHeader;
      cfg.yHeaders = [yHeader];
      console.log('Auto-detected headers:', { xHeader, yHeader });
    }

    const idxMap = {};
    headers.forEach((h, i) => (idxMap[h] = i));

    const xIdx = idxMap[cfg.xHeader];
    const resolvedXIdx = (xIdx === undefined) ? 0 : xIdx;

    const fromD = globalDateRange.dateFrom ? parseDateLenient(globalDateRange.dateFrom) : (cfg.dateFrom ? parseDateLenient(cfg.dateFrom) : null);
    const toD = globalDateRange.dateTo ? parseDateLenient(globalDateRange.dateTo) : (cfg.dateTo ? parseDateLenient(cfg.dateTo) : null);

    console.log('Date filtering:', { fromD, toD, globalDateRange });

    const out = [];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      const rawX = row[resolvedXIdx];
      const isDateLike = !!parseDateLenient(rawX);
      if (isDateLike) {
        const d = parseDateLenient(rawX);
        if (!d) continue;
        if (fromD && d < fromD) continue;
        if (toD && d > toD) continue;
        const obj = { x: formatDateLabel(d), xDate: d.getTime() };
        let any = false;
        for (const yh of cfg.yHeaders) {
          const yi = idxMap[yh];
          const rawY = yi >= 0 ? row[yi] : null;
          const n = rawY === null || rawY === undefined || rawY === "" ? null : Number(String(rawY).replace(/,/g, ""));
          obj[yh] = Number.isFinite(n) ? n : null;
          if (obj[yh] !== null) any = true;
        }
        if (!any) continue;
        out.push(obj);
      } else {
        const obj = { x: rawX };
        let any = false;
        for (const yh of cfg.yHeaders) {
          const yi = idxMap[yh];
          const rawY = yi >= 0 ? row[yi] : null;
          const n = rawY === null || rawY === undefined || rawY === "" ? null : Number(String(rawY).replace(/,/g, ""));
          obj[yh] = Number.isFinite(n) ? n : null;
          if (obj[yh] !== null) any = true;
        }
        if (!any) continue;
        out.push(obj);
      }
    }
    if (out.length && out[0].xDate !== undefined) out.sort((a,b) => (a.xDate||0) - (b.xDate||0));
    console.log(`Processed chart data for ${currentSlide.kpi.name}:`, { 
      dataPoints: out.length, 
      sampleData: out.length > 0 ? [out[0], out[out.length-1]] : [],
      dateFiltering: { fromD: fromD ? fromD.toISOString().split('T')[0] : null, toD: toD ? toD.toISOString().split('T')[0] : null }
    });
    return out;
  }, [currentSlide, globalDateRange, selectedIdx]);

  // Add a small delay to ensure chart is fully rendered
  useEffect(() => {
    if (chartData.length > 0) {
      // Trigger a re-render after a small delay to ensure charts are fully loaded
      const timer = setTimeout(() => {
        // Force a re-render by updating state
        console.log('Chart data updated, triggering re-render');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [chartData]);

  /* ---------- Save chart config (persist primary chart config) ---------- */
  async function saveDates() {
    if (!globalDateRange.dateFrom && !globalDateRange.dateTo) {
      alert('Please select date range first');
      return;
    }
    
    try {
      // Save global date range to all slides' chart configurations
      const results = [];
      let successCount = 0;
      let errorCount = 0;
      
      for (const slide of kpis) {
        try {
          const kpi = slide.kpi;
          const primary = slide.primaryChart;
          const cfgSaved = primary && primary.config ? { ...primary.config } : {
            chartType: "line",
            xHeader: slide.parsed?.headers?.[0] || "",
            yHeaders: slide.parsed?.headers?.length > 1 ? [slide.parsed.headers[1]] : [slide.parsed?.headers?.[0] || ""]
          };
          cfgSaved.dateFrom = globalDateRange.dateFrom || null;
          cfgSaved.dateTo = globalDateRange.dateTo || null;
          
          let result;
          if (primary && primary.id) {
            result = await api.put(`/kpis/${encodeURIComponent(kpi.id)}/charts/${encodeURIComponent(primary.id)}`, {
              config: cfgSaved,
            });
          } else {
            result = await api.post(`/kpis/${encodeURIComponent(kpi.id)}/charts`, {
              name: `Primary - ${kpi.name}`,
              config: cfgSaved,
            });
          }
          results.push({ success: true, result, slideIndex: kpis.indexOf(slide) });
          successCount++;
        } catch (slideErr) {
          console.error(`Failed to save chart for KPI ${slide.kpi.name}:`, slideErr);
          results.push({ success: false, error: slideErr, slideIndex: kpis.indexOf(slide) });
          errorCount++;
        }
      }
      
      // Update local state with successful saves
      const updatedKpis = [...kpis];
      results.forEach(({ success, result, slideIndex }) => {
        if (success && result && result.data) {
          updatedKpis[slideIndex] = { ...updatedKpis[slideIndex], primaryChart: result.data };
        }
      });
      setKpis(updatedKpis);
      
      if (errorCount === 0) {
        alert(`Successfully saved global date range to all ${successCount} KPI charts`);
      } else {
        alert(`Saved ${successCount} charts successfully, ${errorCount} failed. Check console for details.`);
      }
    } catch (err) {
      console.error('Save operation failed', err);
      alert('Save operation failed. Check console for details.');
    }
  }

  async function saveSlideConfig() {
    if (!currentSlide) return;
    const kpi = currentSlide.kpi;
    const primary = currentSlide.primaryChart;
    const cfgSaved = primary && primary.config ? { ...primary.config } : {};
    cfgSaved.dateFrom = globalDateRange.dateFrom || cfgSaved.dateFrom || null;
    cfgSaved.dateTo = globalDateRange.dateTo || cfgSaved.dateTo || null;
    try {
      if (primary && primary.id) {
        const res = await api.put(`/kpis/${encodeURIComponent(kpi.id)}/charts/${encodeURIComponent(primary.id)}`, {
          config: cfgSaved,
        });
        const updated = res.data;
        const copy = [...kpis];
        copy[selectedIdx] = { ...copy[selectedIdx], primaryChart: updated };
        setKpis(copy);
        alert("Saved changes (updated primary chart)");
      } else {
        const res = await api.post(`/kpis/${encodeURIComponent(kpi.id)}/charts`, {
          name: `Primary - ${kpi.name}`,
          config: cfgSaved,
        });
        const created = res.data;
        const copy = [...kpis];
        copy[selectedIdx] = { ...copy[selectedIdx], primaryChart: created };
        setKpis(copy);
        alert("Saved changes (created primary chart)");
      }
    } catch (err) {
      console.error("Save failed", err);
      alert("Save failed");
    }
  }

  /* ---------- Export helpers (fixed for date controls visibility) ---------- */
  async function withHiddenScrollbars(fn, dateRange) {
    const prevDocOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevContainerPad = containerRef.current ? containerRef.current.style.paddingBottom : "";
    const prevContainerPadTop = containerRef.current ? containerRef.current.style.paddingTop : "";
    const prevContainerOverflow = containerRef.current ? containerRef.current.style.overflow : "";
    const prevContainerPadLeft = containerRef.current ? containerRef.current.style.paddingLeft : "";
    const prevContainerPadRight = containerRef.current ? containerRef.current.style.paddingRight : "";
    const noExportEls = containerRef.current ? Array.from(containerRef.current.querySelectorAll(".no-export")) : [];
    const prevDisplay = noExportEls.map(el => el.style.display);
    const chartArea = containerRef.current ? containerRef.current.querySelector(".chart-area") : null;
    const prevChartPad = chartArea ? chartArea.style.paddingBottom : "";
    const prevScrollTop = window.scrollY || window.pageYOffset || 0;
    // Get date controls element - using the new specific class
    const dateControls = containerRef.current ? containerRef.current.querySelector(".export-date-controls") : null;
    console.log('Date controls element found:', dateControls);
    const prevDateControlsDisplay = dateControls ? dateControls.style.display : "";
    const prevDateControlsPosition = dateControls ? dateControls.style.position : "";
    const prevDateControlsTop = dateControls ? dateControls.style.top : "";
    const prevDateControlsZIndex = dateControls ? dateControls.style.zIndex : "";
    const prevDateControlsBg = dateControls ? dateControls.style.backgroundColor : "";
    const prevDateControlsPadding = dateControls ? dateControls.style.padding : "";
    const prevDateControlsBorderRadius = dateControls ? dateControls.style.borderRadius : "";
    const prevDateControlsBoxShadow = dateControls ? dateControls.style.boxShadow : "";
    const prevDateControlsMarginBottom = dateControls ? dateControls.style.marginBottom : "";
    
    // Create temporary overlay for critical UI elements during export
    let tempOverlay = null;
    
    // Create style element for export styles
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .export-mode .export-date-controls {
        position: relative !important;
        z-index: 10000 !important;
        background-color: white !important;
        padding: 4px !important;
        border-radius: 4px !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
        margin-bottom: 10px !important;
        display: flex !important;
      }
      
      .export-mode {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }
      
      .temp-export-overlay {
        position: absolute !important;
        top: 10px !important;
        left: 10px !important;
        right: 10px !important;
        background-color: white !important;
        padding: 10px !important;
        border-radius: 6px !important;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2) !important;
        font-size: 14px !important;
        z-index: 100000 !important;
        color: #333 !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
      }
      
      .temp-export-overlay .date-info {
        font-weight: bold !important;
      }
      
      .temp-export-overlay .kpi-name {
        font-size: 16px !important;
        font-weight: bold !important;
      }
      
      /* Ensure all critical UI elements have high z-index during export */
      .export-mode .flex.items-center.justify-between.gap-2.mb-2 {
        z-index: 9000 !important;
        position: relative !important;
      }
      
      .export-mode .chart-area {
        z-index: 100 !important;
        position: relative !important;
      }
      
      .export-mode button {
        z-index: 5000 !important;
        position: relative !important;
      }
      
      .export-mode select {
        z-index: 5000 !important;
        position: relative !important;
      }
      
      .export-mode input[type="date"] {
        z-index: 5000 !important;
        position: relative !important;
      }
      
      /* Hide date inputs during export and show static text instead */
      .export-mode .date-input-container {
        position: relative;
      }
      
      .export-mode .date-input-container .date-inputs {
        display: none !important;
      }
      
      .export-mode .date-input-container .static-date-display {
        display: block !important;
        font-weight: bold;
        padding: 4px 8px;
        background-color: #f3f4f6;
        border-radius: 4px;
        margin: 0 4px;
      }
      
      /* Disable all transitions and animations during export */
      .export-mode *, .export-mode *:before, .export-mode *:after {
        transition: none !important;
        animation: none !important;
        transform: none !important;
      }
    `;
    
    try {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      
      // Add export styles to document
      document.head.appendChild(styleEl);
      console.log('Export styles added to document');
      
      if (containerRef.current) {
        containerRef.current.style.paddingBottom = "120px";
        containerRef.current.style.paddingTop = "100px";
        containerRef.current.style.overflow = "visible";
        // Ensure enough padding for date controls visibility
        containerRef.current.style.paddingLeft = "20px";
        containerRef.current.style.paddingRight = "20px";
        // Add export class for specific styling
        containerRef.current.classList.add("export-mode");
        console.log('Export mode class added to container');
        
        // Create temporary overlay with critical information
        tempOverlay = document.createElement('div');
        tempOverlay.className = 'temp-export-overlay';
        
        // Create left side with KPI name
        const kpiNameDiv = document.createElement('div');
        kpiNameDiv.className = 'kpi-name';
        kpiNameDiv.textContent = currentSlide?.kpi?.name || 'KPI';
        
        // Create right side with date range
        const dateInfoDiv = document.createElement('div');
        dateInfoDiv.className = 'date-info';
        const fromDisplay = dateRange.dateFrom ? new Date(dateRange.dateFrom).toLocaleDateString() : 'Start';
        const toDisplay = dateRange.dateTo ? new Date(dateRange.dateTo).toLocaleDateString() : 'End';
        dateInfoDiv.textContent = `Date Range: ${fromDisplay} to ${toDisplay}`;
        
        // Assemble the overlay
        tempOverlay.appendChild(kpiNameDiv);
        tempOverlay.appendChild(dateInfoDiv);
        containerRef.current.appendChild(tempOverlay);
        console.log('Temporary export overlay created');
        
        // Hide dynamic date inputs and show static text
        if (dateControls) {
          // Create static date display elements
          const staticFromDisplay = document.createElement('span');
          staticFromDisplay.className = 'static-date-display';
          staticFromDisplay.textContent = dateRange.dateFrom || 'Start';
          
          const staticToDisplay = document.createElement('span');
          staticToDisplay.className = 'static-date-display';
          staticToDisplay.textContent = dateRange.dateTo || 'End';
          
          // Add static displays to date controls
          dateControls.appendChild(staticFromDisplay);
          dateControls.appendChild(staticToDisplay);
        }
      }
      noExportEls.forEach(el => { el.style.display = "none"; });
      // Ensure date controls are visible and properly positioned during export
      if (dateControls) {
        console.log('Applying styles to date controls');
        dateControls.style.display = "flex";
        dateControls.style.position = "relative";
        dateControls.style.top = "0";
        dateControls.style.zIndex = "1000"; // Ensure date controls are on top
        dateControls.style.backgroundColor = "white"; // Ensure background is white for export
        dateControls.style.padding = "4px"; // Add some padding for better visibility
        dateControls.style.borderRadius = "4px"; // Add rounded corners
        dateControls.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)"; // Add subtle shadow
        dateControls.style.marginBottom = "10px"; // Add margin to ensure visibility
        console.log('Date controls styles applied');
      } else {
        console.log('Date controls element not found, cannot apply styles');
      }
      if (chartArea) chartArea.style.paddingBottom = "80px";
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        window.scrollTo({ top: 0, behavior: "instant" }); await new Promise(r => setTimeout(r, 100)); containerRef.current.scrollIntoView({ behavior: "instant", block: "center" });
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
      // Increased delay to ensure all transitions and animations are complete
      await new Promise((r) => setTimeout(r, 800)); console.log("Container bounds:", containerRef.current.getBoundingClientRect());
      await fn();
    } finally {
      document.documentElement.style.overflow = prevDocOverflow;
      document.body.style.overflow = prevBodyOverflow;
      
      // Remove export styles
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
      
      // Remove temporary overlay
      if (tempOverlay && tempOverlay.parentNode) {
        tempOverlay.parentNode.removeChild(tempOverlay);
      }
      
      // Remove static date displays
      if (dateControls) {
        const staticDisplays = dateControls.querySelectorAll('.static-date-display');
        staticDisplays.forEach(display => {
          if (display.parentNode) {
            display.parentNode.removeChild(display);
          }
        });
      }
      
      if (containerRef.current) {
        containerRef.current.style.paddingBottom = prevContainerPad || "";
        containerRef.current.style.paddingTop = prevContainerPadTop || "";
        containerRef.current.style.overflow = prevContainerOverflow || "";
        containerRef.current.style.paddingLeft = prevContainerPadLeft || "";
        containerRef.current.style.paddingRight = prevContainerPadRight || "";
        // Remove export class
        containerRef.current.classList.remove("export-mode");
      }
      noExportEls.forEach((el, i) => { el.style.display = prevDisplay[i] || ""; });
      // Restore date controls display and positioning
      if (dateControls) {
        dateControls.style.display = prevDateControlsDisplay;
        dateControls.style.position = prevDateControlsPosition;
        dateControls.style.top = prevDateControlsTop;
        dateControls.style.zIndex = prevDateControlsZIndex;
        dateControls.style.backgroundColor = prevDateControlsBg;
        dateControls.style.padding = prevDateControlsPadding;
        dateControls.style.borderRadius = prevDateControlsBorderRadius;
        dateControls.style.boxShadow = prevDateControlsBoxShadow;
        dateControls.style.marginBottom = prevDateControlsMarginBottom;
      }
      if (chartArea) chartArea.style.paddingBottom = prevChartPad || "";
      window.scrollTo({ top: prevScrollTop, behavior: "instant" });
    }
  }

  async function exportPNG() {
    if (!containerRef.current) return;
    
    try {
      // Use the withHiddenScrollbars helper to ensure proper export formatting
      await withHiddenScrollbars(async () => {
        // Add a longer delay to ensure all transitions and animations are complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Disable all transitions and animations temporarily
        const style = document.createElement('style');
        style.innerHTML = `* { transition: none !important; animation: none !important; }`;
        document.head.appendChild(style);
        
        // Wait a bit more for styles to apply
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const canvas = await html2canvas(containerRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          width: containerRef.current.scrollWidth,
          height: containerRef.current.scrollHeight,
          logging: false,
          backgroundColor: '#ffffff',
          // Disable transitions during capture
          ignoreElements: (element) => element.classList && element.classList.contains('no-export')
        });
        
        // Re-enable transitions
        document.head.removeChild(style);
        
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentSlide?.kpi?.name || "kpi"}-presentation.png`;
        a.click();
      }, globalDateRange);
      
      alert("Image downloaded successfully!");
    } catch (err) {
      console.error("Export PNG failed", err);
      alert("Export PNG failed: " + err.message);
    }
  }

  async function exportPDF() {
    if (!containerRef.current) return;
    
    try {
      // Use the withHiddenScrollbars helper to ensure proper export formatting
      await withHiddenScrollbars(async () => {
        // Add a longer delay to ensure all transitions and animations are complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Disable all transitions and animations temporarily
        const style = document.createElement('style');
        style.innerHTML = `* { transition: none !important; animation: none !important; }`;
        document.head.appendChild(style);
        
        // Wait a bit more for styles to apply
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const canvas = await html2canvas(containerRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          scrollX: 0,
          scrollY: 0,
          width: containerRef.current.scrollWidth,
          height: containerRef.current.scrollHeight,
          logging: false,
          backgroundColor: '#ffffff',
          // Disable transitions during capture
          ignoreElements: (element) => element.classList && element.classList.contains('no-export')
        });
        
        // Re-enable transitions
        document.head.removeChild(style);
        
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "landscape" });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const img = new Image();
        img.src = imgData;
        await new Promise((res) => (img.onload = res));
        const imgW = img.width;
        const imgH = img.height;
        const ratio = Math.min(pageW / imgW, pageH / imgH);
        const drawW = imgW * ratio;
        const drawH = imgH * ratio;
        const x = (pageW - drawW) / 2;
        const y = (pageH - drawH) / 2;
        pdf.addImage(imgData, "PNG", x, y, drawW, drawH);
        pdf.save(`${currentSlide?.kpi?.name || "kpi"}-presentation.pdf`);
      }, globalDateRange);
      
      alert("PDF downloaded successfully!");
    } catch (err) {
      console.error("Export PDF failed", err);
      alert("Export PDF failed: " + err.message);
    }
  }

  /* ---------- compute per-slide KPI metrics (memoized) ---------- */
  const slideMetrics = useMemo(() => {
    if (!currentSlide) return null;
    const cfg = getSlideConfig(currentSlide);
    // Use global date range
    const from = globalDateRange.dateFrom || cfg.dateFrom || "";
    const to = globalDateRange.dateTo || cfg.dateTo || "";

    const slideObj = {
      kpi: currentSlide.kpi,
      headers: (currentSlide.parsed && Array.isArray(currentSlide.parsed.headers)) ? currentSlide.parsed.headers : [],
      rows: (currentSlide.parsed && Array.isArray(currentSlide.parsed.rows)) ? currentSlide.parsed.rows : []
    };

    const metrics = computeKpiMetrics(
      slideObj,
      from ? parseDateLenient(from) : null,
      to ? parseDateLenient(to) : null
    );

    return metrics;
  }, [currentSlide, globalDateRange, selectedIdx]);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-lg font-semibold">Loading presentation...</div>
      </div>
    );
  }

  /* ---------- helper to decide per-point whether it meets target ---------- */
  function pointMeetsTarget(kpi, value, payload) {
    if (value == null || kpi == null) return false;
    // payload.xDate (ms) might be present for date-based x
    const date = payload && payload.xDate ? new Date(payload.xDate) : null;
    const perDayTarget = getTargetAtDate(kpi, date);
    const action = (kpi.action === "sustain" ? "maintain" : (kpi.action || "maintain"));
    const v = Number(value);
    if (!Number.isFinite(v)) return false;

    if (action === "increase" || action === "maximize") {
      if (perDayTarget != null) return v >= Number(perDayTarget);
      // fallback to top-level target
      const t = computeTargetsForKpi(kpi);
      return t.target != null ? v >= Number(t.target) : false;
    } else if (action === "decrease" || action === "minimize") {
      if (perDayTarget != null) return v <= Number(perDayTarget);
      const t = computeTargetsForKpi(kpi);
      return t.target != null ? v <= Number(t.target) : false;
    } else { // maintain
      const t = computeTargetsForKpi(kpi);
      if (t.lower != null && t.upper != null) {
        return v >= Number(t.lower) && v <= Number(t.upper);
      }
      if (perDayTarget != null) {
        const tol = 1e-6;
        return Math.abs(v - Number(perDayTarget)) <= tol;
      }
      return false;
    }
  }

  /* custom dot renderer: small circle, green if meets target, otherwise light blue */
  function renderCustomDot(dotProps, kpi) {
    const { cx, cy, value, payload, index, dataKey } = dotProps;
    if (cx == null || cy == null) return null;
    const meets = pointMeetsTarget(kpi, value, payload);
    const r = 3;
    const fill = meets ? "#006400" : "#5aa9ff"; // dark green vs lighter blue
    const stroke = meets ? "#004d00" : "#2b6fb2";
    const uniqueKey = `dot-${dataKey || 'unknown'}-${index || 0}-${cx}-${cy}-${Date.now()}`;
    return (
      <circle key={uniqueKey} cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1} />
    );
  }

  /* active dot renderer: larger radius, green if meets target, else slightly larger blue */
  function renderActiveDot(dotProps, kpi) {
    const { cx, cy, value, payload, index, dataKey } = dotProps;
    if (cx == null || cy == null) return null;
    const meets = pointMeetsTarget(kpi, value, payload);
    const r = meets ? 6 : 5;
    const fill = meets ? "#006400" : "#9ed3ff";
    const stroke = meets ? "#003300" : "#2b6fb2";
    const uniqueKey = `active-dot-${dataKey || 'unknown'}-${index || 0}-${cx}-${cy}-${Date.now()}`;
    return (
      <circle key={uniqueKey} cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1} />
    );
  }

  /* Y-Axis domain calculator based on custom mode */
  function getYAxisDomain() {
    if (!currentSlide || !currentSlide.kpi) {
      return undefined;
    }
    
    const kpi = currentSlide.kpi;
    const target = slideMetrics && slideMetrics.target != null ? slideMetrics.target : computeTargetsForKpi(kpi).target;
    
    if (target === null) {
      return undefined;
    }
    
    // Use custom values if provided, otherwise use default range
    const minVal = yAxisMin !== '' ? Number(yAxisMin) : target - Math.abs(target) * 0.5;
    const maxVal = yAxisMax !== '' ? Number(yAxisMax) : target + Math.abs(target) * 0.5;
    return [minVal, maxVal];
  }

  /* Render Pareto Chart */
  function renderParetoChart() {
    if (!currentSlide || !currentSlide.kpi) {
      return null;
    }
    
    const sortedAttributes = Array.isArray(currentSlide.kpi.attributes) 
      ? [...currentSlide.kpi.attributes].sort((a, b) => (b.count || 0) - (a.count || 0))
      : [];
    
    if (sortedAttributes.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-slate-500">
          No attributes available for Pareto analysis
        </div>
      );
    }
    
    const totalCount = sortedAttributes.reduce((sum, attr) => sum + (attr.count || 0), 0);
    let cumulativeCount = 0;
    
    const paretoData = sortedAttributes.map(attr => {
      cumulativeCount += (attr.count || 0);
      return {
        name: attr.name,
        count: attr.count || 0,
        cumulative: totalCount > 0 ? (cumulativeCount / totalCount) * 100 : 0
      };
    });
    
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={paretoData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70}
            tick={{ fontSize: 10 }}
            interval={0}
          />
          <YAxis 
            yAxisId="left" 
            orientation="left" 
            tick={{ fontSize: 12 }} 
            width={40}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            domain={[0, 100]} 
            tick={{ fontSize: 12 }}
            width={40}
          />
          <Tooltip 
            formatter={(value, name, props) => {
              // name is the dataKey ('count' or 'cumulative')
              if (name === 'count') {
                return [value, 'Frequency'];
              } else if (name === 'cumulative') {
                return [`${Number(value).toFixed(2)}%`, 'Cumulative %'];
              }
              return [value, name];
            }}
            labelFormatter={(label) => `Attribute: ${label}`}
          />
          <Legend 
            verticalAlign="top" 
            height={36}
            align="right"
          />
          <Bar yAxisId="left" dataKey="count" fill="#5aa9ff" name="Frequency" />
          <Line 
            key="cumulative-line-pareto"
            yAxisId="right" 
            type="monotone" 
            dataKey="cumulative" 
            stroke="#ff7f0e" 
            strokeWidth={3}
            name="Cumulative %"
            dot={{ fill: '#ff7f0e', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <ReferenceLine yAxisId="right" y={80} stroke="#d64949" strokeDasharray="4 4" label={{ value: "80%", position: "insideTopRight", fill: '#d64949', fontSize: 12 }} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // Add styles for export mode
  const exportStyles = `
    .export-mode .export-date-controls {
      position: relative !important;
      z-index: 1000 !important;
      background-color: white !important;
      padding: 4px !important;
      border-radius: 4px !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
      margin-bottom: 10px !important;
      display: flex !important;
    }
    
    .export-mode {
      padding-left: 20px !important;
      padding-right: 20px !important;
    }
  `;
  
  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button className="text-sm text-blue-600 dark:text-blue-400 mr-4 hover:underline" onClick={() => navigate(-1)}>← Back</button>
            <h1 className="text-2xl font-bold inline text-slate-800 dark:text-white">Presentation — {kpis.length} KPIs</h1>
            <div className="text-sm text-slate-500 dark:text-gray-400 mt-1">Use Next / Prev or keyboard arrows to navigate slides. Save changes will persist date range to the primary chart.</div>
          </div>

          <div className="flex items-center gap-2">
            <select value={selectedIdx} onChange={(e) => goto(Number(e.target.value))} className="p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white">
              {kpis.map((s, i) => <option key={s.kpi.id} value={i} className="dark:bg-gray-700 dark:text-white">{s.kpi.name}</option>)}
            </select>

            <button onClick={prev} className="px-3 py-1 bg-slate-100 dark:bg-gray-700 rounded text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-gray-600">Prev</button>
            <button onClick={next} className="px-3 py-1 bg-slate-100 dark:bg-gray-700 rounded text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-gray-600">Next</button>

            {isFullscreen ? (
              <button onClick={exitFullscreen} className="px-3 py-1 bg-slate-100 dark:bg-gray-700 rounded text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-gray-600">Exit Fullscreen</button>
            ) : (
              <button onClick={enterFullscreen} className="px-3 py-1 bg-slate-100 dark:bg-gray-700 rounded text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-gray-600">Enter Fullscreen</button>
            )}

            <button onClick={exportPNG} className="px-3 py-1 bg-emerald-600 text-white rounded">Export PNG</button>
            <button onClick={exportPDF} className="px-3 py-1 bg-blue-600 text-white rounded">Export PDF</button>
          </div>
        </div>

        <div ref={containerRef} className="bg-white p-4 rounded shadow-sm" style={{ minHeight: "75vh", paddingTop: "40px", paddingBottom: "40px" }}>
          {!currentSlide ? (
            <div className="p-6 text-slate-600 dark:text-gray-400">No KPI slides available.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-3">
                {/* Main Chart Area - Now takes full width */}
                <div className="mb-2">
                  {/* Row 1: KPI Title + Date Controls */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h2 className="text-base font-semibold leading-tight text-slate-800 dark:text-white">
                        {(() => {
                          const kpi = currentSlide.kpi;
                          const action = kpi.action === "sustain" ? "maintain" : (kpi.action || "maintain");
                          const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
                          const presentValue = kpi.presentValue;
                          const targetValue = kpi.targetValue;
                          const unit = kpi.unit || "";
                          const deadline = kpi.deadline;
                          
                          let formattedName = kpi.name;
                          
                          if (presentValue !== null && targetValue !== null && unit && deadline) {
                            // Format the deadline to Month-Year
                            const deadlineDate = new Date(deadline);
                            const deadlineFormatted = deadlineDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                            
                            formattedName = `${actionLabel} ${kpi.name} ${unit} from ${presentValue} to ${targetValue} by ${deadlineFormatted}`;
                          } else {
                            // Fallback to just the KPI name with action indicator
                            formattedName = kpi.name;
                          }
                          
                          return formattedName;
                        })()}
                      </h2>
                      {currentSlide.kpi.description && <div className="text-xs text-slate-600 dark:text-gray-400 mt-1">{currentSlide.kpi.description}</div>}
                    </div>

                    {/* Date Controls */}
                    <div className="date-input-container flex items-center gap-1 flex-shrink-0 export-date-controls" style={{ zIndex: 100 }}>
                      <div className="date-inputs flex items-center gap-1">
                        <select 
                          value={globalDateRange.preset} 
                          onChange={handlePresetChange}
                          className="p-1 border border-gray-300 dark:border-gray-600 rounded text-xs w-16 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="" className="dark:bg-gray-700 dark:text-white">Custom</option>
                          <option value="3months" className="dark:bg-gray-700 dark:text-white">3M</option>
                          <option value="6months" className="dark:bg-gray-700 dark:text-white">6M</option>
                          <option value="1year" className="dark:bg-gray-700 dark:text-white">1Y</option>
                        </select>
                        
                        <input
                          type="date"
                          value={globalDateRange.dateFrom}
                          onChange={(e) => setGlobalDateRange(prev => ({ ...prev, preset: '', dateFrom: e.target.value }))}
                          className="p-1 border border-gray-300 dark:border-gray-600 rounded text-xs w-20 dark:bg-gray-700 dark:text-white"
                          placeholder="From"
                        />
                        
                        <input
                          type="date"
                          value={globalDateRange.dateTo}
                          onChange={(e) => setGlobalDateRange(prev => ({ ...prev, preset: '', dateTo: e.target.value }))}
                          className="p-1 border border-gray-300 dark:border-gray-600 rounded text-xs w-20 dark:bg-gray-700 dark:text-white"
                          placeholder="To"
                        />
                        
                        <button 
                          onClick={saveDates}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          title="Save current date range to all KPI charts"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Present toggle + Y-Axis Controls */}
                  <div className="flex items-center gap-1" style={{ zIndex: 90 }}>
                    <div className="flex-1"></div> {/* Spacer to push controls to the right */}
                    <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-gray-400">
                      <input type="checkbox" checked={showPresentLine} onChange={(e) => setShowPresentLine(e.target.checked)} className="dark:bg-gray-700" />
                      Present
                    </label>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-2"></div> {/* Separator */}
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-gray-400">
                      <span>Y-Axis:</span>
                      <span>Custom</span>
                      <div className="flex items-center gap-1">
                        <input 
                          type="number" 
                          value={yAxisMin} 
                          onChange={(e) => setYAxisMin(e.target.value)} 
                          placeholder="Min" 
                          className="w-16 p-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                        />
                        <input 
                          type="number" 
                          value={yAxisMax} 
                          onChange={(e) => setYAxisMax(e.target.value)} 
                          placeholder="Max" 
                          className="w-16 p-1 text-xs border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* chart wrapper */}
                <div className="chart-area border border-gray-200 dark:border-gray-700 rounded p-2" style={{ width: "100%", height: "50vh" }}>
                  {chartData.length === 0 && chartView === 'main' ? (
                    <div className="flex items-center justify-center h-full text-slate-500 dark:text-gray-400">
                      <div className="text-center">
                        <div className="text-lg mb-2">No chart data available for {currentSlide.kpi.name}</div>
                        <div className="text-sm mb-2">
                          {!currentSlide.parsed?.rows?.length ? 'No data uploaded for this KPI' : 
                           globalDateRange.dateFrom || globalDateRange.dateTo ? 'No data in selected date range' :
                           'Data may not contain valid numeric values'}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-gray-500">
                          Headers: {currentSlide.parsed?.headers?.length || 0}, 
                          Rows: {currentSlide.parsed?.rows?.length || 0}
                          {globalDateRange.dateFrom && <span>, From: {globalDateRange.dateFrom}</span>}
                          {globalDateRange.dateTo && <span>, To: {globalDateRange.dateTo}</span>}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                          Try adjusting the date range or check if data has been uploaded
                        </div>
                      </div>
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {chartView === 'main' ? (
                      // Main KPI Chart
                      (currentSlide.primaryChart && currentSlide.primaryChart.config && (getSlideConfig(currentSlide).chartType === "bar")) ? (
                      (() => {
                        const cfg = getSlideConfig(currentSlide);
                        const numericVals = (chartData || []).flatMap(r => cfg.yHeaders.map(h => r[h]).filter(v => v != null && Number.isFinite(v)));
                        const maxVal = numericVals.length ? Math.max(...numericVals) : 10;
                        const pad = Math.max(1, Math.abs(maxVal) * 0.08);
                        const top = Math.ceil(maxVal + pad);
                        const t = slideMetrics && slideMetrics.target != null ? slideMetrics.target : computeTargetsForKpi(currentSlide.kpi).target;
                        const targets = computeTargetsForKpi(currentSlide.kpi);
                        const action = (currentSlide.kpi.action === "sustain" ? "maintain" : (currentSlide.kpi.action || "maintain"));

                        // For bar coloring, color bars green where they meet target (only for first yHeader here)
                        const firstY = cfg.yHeaders && cfg.yHeaders.length ? cfg.yHeaders[0] : null;

                        return (
                          <BarChart data={chartData} margin={{ top: 5, right: 8, left: 5, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="x" tick={{ fontSize: 11 }} tickMargin={8} height={30} interval="preserveStartEnd" padding={{ left: 5, right: 5 }}/>
                            <YAxis domain={getYAxisDomain()} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />

                            {/* background shading for good area */}
                            { (action === "increase" || action === "maximize") && t != null && (
                              <ReferenceArea y1={Number(t)} y2={top} fill="#006400" opacity={0.06} isFront={false} />
                            ) }
                            { (action === "decrease" || action === "minimize") && t != null && (
                              <ReferenceArea y1={0} y2={Number(t)} fill="#006400" opacity={0.06} isFront={false} />
                            ) }
                            { action === "maintain" && targets.lower != null && targets.upper != null && (
                              <ReferenceArea y1={Number(targets.lower)} y2={Number(targets.upper)} fill="#006400" opacity={0.06} isFront={false} />
                            ) }

                            {/* present line toggle */}
                            { showPresentLine && currentSlide.kpi.presentValue != null && (
                              <ReferenceLine y={Number(currentSlide.kpi.presentValue)} stroke="#111827" strokeDasharray="4 4" label={{ value: `Present: ${currentSlide.kpi.presentValue}`, position: "insideBottomRight", fill: "#111827" }} />
                            ) }

                            {/* target line */}
                            { t != null && <ReferenceLine y={Number(t)} stroke="#006400" strokeDasharray="4 4" label={{ value: `Target: ${t}`, position: "insideTopLeft", fill: "#006400" }} /> }

                            { Array.isArray(cfg.yHeaders) && cfg.yHeaders.map((yh, idx) => {
                              if (yh === firstY) {
                                return (
                                  <Bar key={`bar-${yh}-${idx}`} dataKey={yh} barSize={40 / Math.max(1, cfg.yHeaders.length)} >
                                    {chartData.map((entry, i) => {
                                      const val = entry[yh];
                                      const meets = pointMeetsTarget(currentSlide.kpi, val, entry);
                                      return <Cell key={`cell-${yh}-${i}-${entry.x || i}`} fill={meets ? "#006400" : ["#5aa9ff","#ff7f0e","#006400","#d64949","#9467bd"][idx%5]} />;
                                    })}
                                  </Bar>
                                );
                              }
                              return <Bar key={`bar-${yh}-${idx}`} dataKey={yh} barSize={40 / Math.max(1, cfg.yHeaders.length)} fill={["#5aa9ff","#ff7f0e","#006400","#d64949","#9467bd"][idx%5]} />;
                            }) }
                          </BarChart>
                        );
                      })()
                    ) : (
                      (() => {
                        const cfg = getSlideConfig(currentSlide);
                        const numericVals = (chartData || []).flatMap(r => cfg.yHeaders.map(h => r[h]).filter(v => v != null && Number.isFinite(v)));
                        const maxVal = numericVals.length ? Math.max(...numericVals) : 10;
                        const pad = Math.max(1, Math.abs(maxVal) * 0.08);
                        const top = Math.ceil(maxVal + pad);
                        const t = slideMetrics && slideMetrics.target != null ? slideMetrics.target : computeTargetsForKpi(currentSlide.kpi).target;
                        const targets = computeTargetsForKpi(currentSlide.kpi);
                        const action = (currentSlide.kpi.action === "sustain" ? "maintain" : (currentSlide.kpi.action || "maintain"));

                        return (
                          <LineChart data={chartData} margin={{ top: 5, right: 8, left: 5, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="x" tick={{ fontSize: 11 }} tickMargin={8} height={30} />
                            <YAxis domain={getYAxisDomain()} tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />

                            {/* background shading for good area */}
                            { (action === "increase" || action === "maximize") && t != null && (
                              <ReferenceArea y1={Number(t)} y2={top} fill="#006400" opacity={0.06} isFront={false} />
                            ) }
                            { (action === "decrease" || action === "minimize") && t != null && (
                              <ReferenceArea y1={0} y2={Number(t)} fill="#006400" opacity={0.06} isFront={false} />
                            ) }
                            { action === "maintain" && targets.lower != null && targets.upper != null && (
                              <ReferenceArea y1={Number(targets.lower)} y2={Number(targets.upper)} fill="#006400" opacity={0.06} isFront={false} />
                            ) }

                            {/* present line toggle */}
                            { showPresentLine && currentSlide.kpi.presentValue != null && (
                              <ReferenceLine y={Number(currentSlide.kpi.presentValue)} stroke="#111827" strokeDasharray="4 4" label={{ value: `Present: ${currentSlide.kpi.presentValue}`, position: "insideBottomRight", fill: "#111827" }} />
                            ) }

                            {/* target / lower / upper rendering */}
                            { slideMetrics && slideMetrics.target != null ? (
                                <ReferenceLine y={Number(slideMetrics.target)} stroke="#006400" strokeDasharray="4 4" label={{ value: `Target: ${slideMetrics.target}`, position: "insideTopLeft", fill: "#006400" }} />
                              ) : (() => {
                                if (targets.lower != null || targets.upper != null) {
                                  return (
                                    <>
                                      {targets.lower != null && <ReferenceLine y={Number(targets.lower)} stroke="#006400" strokeDasharray="4 4" label={{ value: `Lower: ${targets.lower}`, position: "insideTopLeft", fill: "#006400" }} />}
                                      {targets.upper != null && <ReferenceLine y={Number(targets.upper)} stroke="#006400" strokeDasharray="4 4" label={{ value: `Upper: ${targets.upper}`, position: "insideTopLeft", fill: "#006400" }} />}
                                    </>
                                  );
                                }
                                return null;
                              })()
                            }

                            { Array.isArray(cfg.yHeaders) && cfg.yHeaders.map((yh, idx) =>
                              <Line
                                key={`line-${yh}-${idx}`}
                                type="monotone"
                                dataKey={yh}
                                stroke={["#5aa9ff","#ff7f0e","#006400","#d64949","#9467bd"][idx%5]}
                                dot={(dotProps) => renderCustomDot({...dotProps, dataKey: yh}, currentSlide.kpi)}
                                activeDot={(dotProps) => renderActiveDot({...dotProps, dataKey: yh}, currentSlide.kpi)}
                                dotCount={false}
                                connectNulls
                              />
                            )}                          </LineChart>
                        );
                      })()
                    )
                    ) : (
                      // Attributes Pareto Chart
                      renderParetoChart()
                    )}
                  </ResponsiveContainer>
                  )}                </div>

                {/* Restructured layout for KPI Summary and Action Plans */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* KPI Summary */}
                  <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="font-semibold mb-3 text-slate-800 dark:text-white">KPI Summary</h3>
                    {currentSlide.kpi && (
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm text-slate-600 dark:text-gray-400">Value (avg)</div>
                            <div className="text-3xl font-bold text-slate-900 dark:text-white">{slideMetrics && slideMetrics.avgValue != null ? (Number.isInteger(slideMetrics.avgValue) ? slideMetrics.avgValue : Number(slideMetrics.avgValue.toFixed(2))) : "—"}</div>
                          </div>

                          <div className="text-right">
                            <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold text-slate-800 dark:text-white bg-slate-50 dark:bg-gray-700 border border-slate-100 dark:border-gray-600`}>
                              {slideMetrics ? `${Number(slideMetrics.percentAchieved ?? 0).toFixed(1)}%` : "—"}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-gray-500 mt-2">target: <span className="font-medium text-slate-700 dark:text-white">{slideMetrics && slideMetrics.target != null ? slideMetrics.target : "—"}</span></div>
                          </div>
                        </div>

                        <div className="flex gap-4 text-sm text-slate-600 dark:text-gray-400">
                          <div>Days Achieved: <span className="font-medium text-slate-800 dark:text-white">{slideMetrics ? slideMetrics.daysAchieved : 0}</span></div>
                          <div>Days Filled: <span className="font-medium text-slate-800 dark:text-white">{slideMetrics ? slideMetrics.daysFilled : 0}</span></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Plans - increased width */}
                  <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
                    <h4 className="text-sm font-medium mb-2 text-slate-700 dark:text-white">Action Plans ({Array.isArray(currentSlide.kpi.actions) ? currentSlide.kpi.actions.length : 0})</h4>
                    {Array.isArray(currentSlide.kpi.actions) && currentSlide.kpi.actions.length > 0 ? (
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {currentSlide.kpi.actions.slice(0, 5).map((action, idx) => (
                          <div key={action.id || idx} className="text-sm p-3 bg-slate-50 dark:bg-gray-700 rounded border border-slate-200 dark:border-gray-600">
                            <div className="font-medium text-slate-800 dark:text-white mb-2">{action.description}</div>
                            <div className="text-xs text-slate-500 dark:text-gray-400 flex flex-wrap gap-3">
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                                {action.responsibility || "—"}
                              </span>
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  action.currentStatus === "Completed" ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" :
                                  action.currentStatus === "In Progress" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300" :
                                  action.currentStatus === "Delay" ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300" :
                                  "bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300"
                                }`}>
                                  {action.currentStatus || action.status || "Planned"}
                                </span>
                              </span>
                              {(action.plannedCompletionDate || action.deadline) && (
                                <span className="flex items-center">
                                  <svg className="w-4 h-4 mr-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                  </svg>
                                  {formatDateDisplay(action.plannedCompletionDate || action.deadline)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 dark:text-gray-400 py-3">No action plans yet.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right column with Pareto Chart and Target Revisions */}
              <div className="space-y-4">
                {/* Pareto Chart - increased height */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold mb-3 text-slate-800 dark:text-white">Attributes Pareto Chart</h3>
                  <div className="chart-area border border-gray-200 dark:border-gray-700 rounded p-2" style={{ width: "100%", height: "50vh" }}>
                    {renderParetoChart()}
                  </div>
                </div>

                {/* Target Revisions - moved to right side below Pareto chart */}
                <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-4">
                  <h4 className="text-sm font-medium mb-2 text-slate-700 dark:text-white">Target Revisions ({Array.isArray(currentSlide.kpi.targetRevisions) ? currentSlide.kpi.targetRevisions.length : 0})</h4>
                  <div className="overflow-auto text-sm max-h-48">
                    <table className="min-w-full">
                      <thead className="bg-slate-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-left text-xs text-slate-700 dark:text-gray-300">#</th>
                          <th className="px-2 py-1 text-left text-xs text-slate-700 dark:text-gray-300">Target Value</th>
                          <th className="px-2 py-1 text-left text-xs text-slate-700 dark:text-gray-300">Revision Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(currentSlide.kpi.targetRevisions) && currentSlide.kpi.targetRevisions.length > 0 ? (
                          [...currentSlide.kpi.targetRevisions].slice().sort((a,b) => {
                            const da = parseDateLenient(a.revisionDate) || new Date(a.createdAt || 0);
                            const db = parseDateLenient(b.revisionDate) || new Date(b.createdAt || 0);
                            return db - da; // Most recent first
                          }).map((rev, idx) => (
                            <tr key={rev.id} className={idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-slate-50 dark:bg-gray-700"}>
                              <td className="px-2 py-1 text-xs text-slate-800 dark:text-white">{idx + 1}</td>
                              <td className="px-2 py-1 text-xs font-medium text-slate-800 dark:text-white">{rev.targetValue}</td>
                              <td className="px-2 py-1 text-xs text-slate-800 dark:text-white">{rev.revisionDate ? formatDateDisplay(rev.revisionDate) : "—"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-2 py-3 text-center text-slate-500 dark:text-gray-400">No target revisions yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
