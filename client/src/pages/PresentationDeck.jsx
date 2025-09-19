

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
//   BarChart,
//   Bar,
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
//   // return { target, lower, upper } where null/undefined means absent
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
//   // date is a Date instance
//   if (!kpi) return null;
//   // if no revisions, return computed target from base fields
//   if (!Array.isArray(kpi.targetRevisions) || kpi.targetRevisions.length === 0) {
//     // fallback to computeTargetsForKpi result
//     const t = computeTargetsForKpi(kpi);
//     return t.target;
//   }

//   // Make sure date is Date
//   const d = date instanceof Date ? date : parseDateLenient(date);
//   // sort revisions by revisionDate ascending (nulls at end)
//   const revs = [...kpi.targetRevisions].filter(Boolean).slice().sort((a, b) => {
//     const da = parseDateLenient(a.revisionDate);
//     const db = parseDateLenient(b.revisionDate);
//     if (!da && !db) return 0;
//     if (!da) return 1;
//     if (!db) return -1;
//     return da - db;
//   });

//   // If no valid revision dates, fall back to last revision's value or kpi.targetValue
//   if (!d) {
//     const last = revs[revs.length - 1];
//     if (last && last.targetValue != null) return Number(last.targetValue);
//     return computeTargetsForKpi(kpi).target;
//   }

//   let chosen = null;
//   for (const r of revs) {
//     const rd = parseDateLenient(r.revisionDate);
//     if (!rd) continue;
//     // If revision date <= date, it applies from that date forward (inclusive)
//     if (d >= rd) {
//       chosen = r.targetValue;
//     }
//   }
//   // if found a revision that applies, return it; else return the earliest revision if date < earliest? we fallback to baseline:
//   if (chosen != null) return Number(chosen);
//   // No revision applies (date earlier than first revision) — use baseline: either kpi.targetValue or first revision?
//   // Choose: if there are revisions but date is before first revision, we assume previous baseline (kpi.targetValue if set) else first revision value
//   if (kpi.targetValue != null) return Number(kpi.targetValue);
//   const first = revs[0];
//   return first && first.targetValue != null ? Number(first.targetValue) : null;
// }

// /* --------- compute per-kpi metrics for a given date range --------- */
// function computeKpiMetrics({ kpi, headers = [], rows = [] }, dateFrom, dateTo) {
//   const fromD = dateFrom ? (dateFrom instanceof Date ? new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate(), 0, 0, 0, 0) : parseDateLenient(dateFrom)) : null;
//   const toD = dateTo ? (dateTo instanceof Date ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59, 999) : parseDateLenient(dateTo)) : null;

//   const dateIdx = findDateIndex(headers);
//   const valueIdx = findValueIndex(headers, rows);

//   const dayMap = new Map();
//   for (let r = 0; r < rows.length; r++) {
//     const row = Array.isArray(rows[r]) ? rows[r] : [];
//     const rawDate = row[dateIdx];
//     const d = parseDateLenient(rawDate);
//     if (!d) continue;
//     const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
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
//     // keep last value seen for the day
//     dayMap.set(key, { date: dayStart, value: num });
//   }

//   const dayEntries = Array.from(dayMap.values()).sort((a,b) => a.date - b.date);
//   const dayValues = dayEntries.map(x => x.value);
//   const daysFilled = dayValues.length;
//   const avgValue = dayValues.length > 0 ? dayValues.reduce((a,b) => a + b, 0)/dayValues.length : null;

//   // compute daysAchieved using per-day target from revisions
//   let daysAchieved = 0;
//   for (const { date, value } of dayEntries) {
//     const targ = getTargetAtDate(kpi, date);
//     if (targ == null) continue;
//     const action = (kpi.action === "sustain" ? "maintain" : (kpi.action || "maintain"));
//     const v = Number(value);
//     if (!Number.isFinite(v)) continue;

//     if (action === "increase") {
//       if (v >= Number(targ)) daysAchieved++;
//     } else if (action === "decrease") {
//       if (v <= Number(targ)) daysAchieved++;
//     } else if (action === "maximize") {
//       // achieved if value >= targ (assuming targ is upper bound)
//       if (v >= Number(targ)) daysAchieved++;
//     } else if (action === "minimize") {
//       if (v <= Number(targ)) daysAchieved++;
//     } else { // maintain
//       // for maintain, prefer targetLowerValue/targetUpperValue if present for that KPI
//       const tl = kpi.targetLowerValue != null ? Number(kpi.targetLowerValue) : null;
//       const tu = kpi.targetUpperValue != null ? Number(kpi.targetUpperValue) : null;
//       if (tl != null && tu != null) {
//         if (v >= tl && v <= tu) daysAchieved++;
//       } else {
//         // fallback: equality to targ (or near)
//         const tol = 1e-6;
//         if (Math.abs(v - Number(targ)) <= tol) daysAchieved++;
//       }
//     }
//   }

//   // choose period's target for summary (use last day in range if present else compute for toD or fallback)
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

//   useEffect(() => {
//     async function loadAll() {
//       setLoading(true);
//       try {
//         const res = await api.get(`/kpis/plant/${encodeURIComponent(plantId)}`);
//         const list = Array.isArray(res.data) ? res.data : [];

//         const promises = list.map(async (k) => {
//           const [pRes, cRes] = await Promise.allSettled([
//             api.get(`/uploads/${encodeURIComponent(k.id)}/preview?limit=999999`),
//             api.get(`/kpis/${encodeURIComponent(k.id)}/charts`),
//           ]);
//           const parsed = (pRes.status === "fulfilled" && pRes.value && pRes.value.data) ? pRes.value.data : { headers: [], rows: [] };
//           const charts = (cRes.status === "fulfilled" && Array.isArray(cRes.value.data)) ? cRes.value.data : [];
//           const primary = charts.length > 0 ? charts[0] : null;
//           return { kpi: k, parsed, primaryChart: primary };
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
//     if (idx < 0) idx = 0;
//     if (idx >= kpis.length) idx = kpis.length - 1;
//     setSelectedIdx(idx);
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
//       dateFrom: cfg?.dateFrom || "",
//       dateTo: cfg?.dateTo || "",
//     };
//   }

//   // local overrides only for dateFrom/dateTo (per-slide)
//   const [localOverrides, setLocalOverrides] = useState({});
//   useEffect(() => {
//     const obj = {};
//     kpis.forEach((s, i) => {
//       const cfg = getSlideConfig(s);
//       obj[i] = {
//         dateFrom: cfg.dateFrom || "",
//         dateTo: cfg.dateTo || "",
//       };
//     });
//     setLocalOverrides(obj);
//     // eslint-disable-next-line
//   }, [kpis.length]);

//   const currentSlide = kpis[selectedIdx];

//   /* ---------- derived chart data for recharts ---------- */
//   const chartData = useMemo(() => {
//     if (!currentSlide) return [];
//     const parsed = currentSlide.parsed || { headers: [], rows: [] };
//     const cfg = getSlideConfig(currentSlide);
//     const headers = parsed.headers || [];
//     const rows = parsed.rows || [];
//     if (!cfg.xHeader || !Array.isArray(cfg.yHeaders) || cfg.yHeaders.length === 0) {
//       const dateIdx = findDateIndex(headers);
//       const valueIdx = findValueIndex(headers, rows);
//       if (headers.length === 0) return [];
//       const xHeader = headers[dateIdx] || headers[0];
//       const yHeader = headers[valueIdx] || headers[headers.length - 1];
//       cfg.xHeader = xHeader;
//       cfg.yHeaders = [yHeader];
//     }

//     const idxMap = {};
//     headers.forEach((h, i) => (idxMap[h] = i));

//     const xIdx = idxMap[cfg.xHeader];
//     const resolvedXIdx = (xIdx === undefined) ? 0 : xIdx;

//     const lo = localOverrides[selectedIdx] || {};
//     const fromD = lo.dateFrom ? parseDateLenient(lo.dateFrom) : (cfg.dateFrom ? parseDateLenient(cfg.dateFrom) : null);
//     const toD = lo.dateTo ? parseDateLenient(lo.dateTo) : (cfg.dateTo ? parseDateLenient(cfg.dateTo) : null);

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
//     return out;
//   }, [currentSlide, localOverrides, selectedIdx]);

//   /* ---------- Save chart config (persist primary chart config) ---------- */
//   async function saveSlideConfig() {
//     if (!currentSlide) return;
//     const kpi = currentSlide.kpi;
//     const primary = currentSlide.primaryChart;
//     const cfgSaved = primary && primary.config ? { ...primary.config } : {};
//     const lo = localOverrides[selectedIdx] || {};
//     cfgSaved.dateFrom = lo.dateFrom || cfgSaved.dateFrom || null;
//     cfgSaved.dateTo = lo.dateTo || cfgSaved.dateTo || null;
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

//   /* ---------- Export helpers (unchanged) ---------- */
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
//         containerRef.current.style.paddingBottom = "56px";
//         containerRef.current.style.paddingTop = "16px";
//         containerRef.current.style.overflow = "visible";
//       }
//       noExportEls.forEach(el => { el.style.display = "none"; });
//       if (chartArea) chartArea.style.paddingBottom = "48px";
//       if (containerRef.current) {
//         const rect = containerRef.current.getBoundingClientRect();
//         window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - 16), behavior: "instant" });
//       } else {
//         window.scrollTo({ top: 0, behavior: "instant" });
//       }
//       await new Promise((r) => setTimeout(r, 100));
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
//         const canvas = await html2canvas(containerRef.current, { scale: 2, useCORS: true, allowTaint: true });
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
//         const canvas = await html2canvas(containerRef.current, { scale: 2, useCORS: true, allowTaint: true });
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
//     const lo = localOverrides[selectedIdx] || {};
//     const from = lo.dateFrom || cfg.dateFrom || "";
//     const to = lo.dateTo || cfg.dateTo || "";

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
//   }, [currentSlide, localOverrides, selectedIdx]);

//   if (loading) {
//     return (
//       <div className="p-6 max-w-6xl mx-auto">
//         <div className="text-lg font-semibold">Loading presentation...</div>
//       </div>
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

//         <div ref={containerRef} className="bg-white p-4 rounded shadow-sm" style={{ minHeight: "65vh" }}>
//           {!currentSlide ? (
//             <div className="p-6 text-slate-600">No KPI slides available.</div>
//           ) : (
//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//               <div className="lg:col-span-2 bg-white rounded border p-4">
//                 <div className="flex items-start justify-between gap-4 mb-3">
//                   <div className="flex-1">
//                     <h2 className="text-lg font-semibold">{currentSlide.kpi.name}</h2>
//                     {currentSlide.kpi.description && <div className="text-sm text-slate-600">{currentSlide.kpi.description}</div>}
//                     <div className="text-xs text-slate-400 mt-1">Owner: {currentSlide.kpi.owner || "—"}</div>
//                   </div>

//                   <div className="flex flex-col items-end gap-2">
//                     <div className="flex flex-wrap gap-3 items-end">
//                       <div>
//                         <div className="text-xs text-slate-500">From</div>
//                         <input
//                           type="date"
//                           value={(localOverrides[selectedIdx] && localOverrides[selectedIdx].dateFrom) || ""}
//                           onChange={(e) => setLocalOverrides(lo => ({ ...lo, [selectedIdx]: { ...(lo[selectedIdx]||{}), dateFrom: e.target.value } }))}
//                           className="p-2 border rounded"
//                         />
//                       </div>

//                       <div>
//                         <div className="text-xs text-slate-500">To</div>
//                         <input
//                           type="date"
//                           value={(localOverrides[selectedIdx] && localOverrides[selectedIdx].dateTo) || ""}
//                           onChange={(e) => setLocalOverrides(lo => ({ ...lo, [selectedIdx]: { ...(lo[selectedIdx]||{}), dateTo: e.target.value } }))}
//                           className="p-2 border rounded"
//                         />
//                       </div>
//                     </div>

//                     {!isFullscreen && (
//                       <div className="mt-3">
//                         <button onClick={saveSlideConfig} className="px-4 py-2 bg-emerald-600 text-white rounded shadow-sm no-export">
//                           Save changes
//                         </button>
//                       </div>
//                     )}
//                   </div>
//                 </div>

//                 {/* chart wrapper */}
//                 <div className="chart-area border rounded p-2" style={{ width: "100%", height: "62vh" }}>
//                   <ResponsiveContainer width="100%" height="100%">
//                     { (currentSlide.primaryChart && currentSlide.primaryChart.config && (getSlideConfig(currentSlide).chartType === "bar")) ? (
//                       <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 70 }}>
//                         <CartesianGrid strokeDasharray="3 3" />
//                         <XAxis dataKey="x" tick={{ fontSize: 11 }} tickMargin={12} height={48}/>
//                         <YAxis />
//                         <Tooltip />
//                         <Legend />
//                         {/* target lines: use period target from slideMetrics */}
//                         {slideMetrics && slideMetrics.target != null && (
//                           <ReferenceLine y={Number(slideMetrics.target)} stroke="#d62728" strokeDasharray="4 4" label={{ value: `Target: ${slideMetrics.target}`, position: "insideTopLeft", fill: "#d62728" }} />
//                         )}
//                         { Array.isArray(getSlideConfig(currentSlide).yHeaders) && getSlideConfig(currentSlide).yHeaders.map((yh, idx) =>
//                           <Bar key={yh} dataKey={yh} barSize={40 / Math.max(1, getSlideConfig(currentSlide).yHeaders.length)} fill={["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd"][idx%5]} />
//                         )}
//                       </BarChart>
//                     ) : (
//                       <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 70 }}>
//                         <CartesianGrid strokeDasharray="3 3" />
//                         <XAxis dataKey="x" tick={{ fontSize: 11 }} tickMargin={12} height={48} />
//                         <YAxis />
//                         <Tooltip />
//                         <Legend />

//                         {/* target / lower / upper rendering (use period target for reference line) */}
//                         {slideMetrics && slideMetrics.target != null ? (
//                           <ReferenceLine y={Number(slideMetrics.target)} stroke="#d62728" strokeDasharray="4 4" label={{ value: `Target: ${slideMetrics.target}`, position: "insideTopLeft", fill: "#d62728" }} />
//                         ) : (() => {
//                           // fallback to static lower/upper if no period target
//                           const t = computeTargetsForKpi(currentSlide.kpi);
//                           if (t.lower != null || t.upper != null) {
//                             return (
//                               <>
//                                 {t.lower != null && <ReferenceLine y={Number(t.lower)} stroke="#2ca02c" strokeDasharray="4 4" label={{ value: `Lower: ${t.lower}`, position: "insideTopLeft", fill: "#2ca02c" }} />}
//                                 {t.upper != null && <ReferenceLine y={Number(t.upper)} stroke="#d62728" strokeDasharray="4 4" label={{ value: `Upper: ${t.upper}`, position: "insideTopLeft", fill: "#d62728" }} />}
//                               </>
//                             );
//                           }
//                           return null;
//                         })()}

//                         { Array.isArray(getSlideConfig(currentSlide).yHeaders) && getSlideConfig(currentSlide).yHeaders.map((yh, idx) =>
//                           <Line key={yh} type="monotone" dataKey={yh} stroke={["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd"][idx%5]} dot={{ r: 2 }} connectNulls />
//                         )}
//                       </LineChart>
//                     )}
//                   </ResponsiveContainer>
//                 </div>

//                 <div className="mt-2 text-sm text-slate-600">
//                   {getSlideConfig(currentSlide).yHeaders.map(h => (
//                     <div key={h} className="inline-block mr-4">• {h}</div>
//                   ))}
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
//                         <div className="text-xs text-slate-400 mt-1">{currentSlide.kpi.unit || ""}</div>
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

//                     <div className="pt-2 border-t">
//                       <h4 className="text-sm font-medium mb-2">Action Taken / Action Plan</h4>
//                       {Array.isArray(currentSlide.kpi.actions) && currentSlide.kpi.actions.length > 0 ? (
//                         <div className="text-sm">
//                           <div className="font-medium">{currentSlide.kpi.actions[0].description}</div>
//                           <div className="text-xs text-slate-500 mt-1">Deadline: {currentSlide.kpi.actions[0].deadline || "—"} • Responsibility: {currentSlide.kpi.actions[0].responsibility || "—"} • Status: {currentSlide.kpi.actions[0].status || "—"}</div>
//                         </div>
//                       ) : (
//                         <div className="text-sm text-slate-500">No action plan yet.</div>
//                       )}

//                       <div className="mt-4">
//                         <h4 className="text-sm font-medium mb-2">KPI Details</h4>
//                         <div className="text-sm"><strong>Owner:</strong> {currentSlide.kpi.owner || "—"}</div>
//                         <div className="text-sm"><strong>Created:</strong> {currentSlide.kpi.createdAt ? new Date(currentSlide.kpi.createdAt).toLocaleString() : "—"}</div>
//                         <div className="text-sm mt-2"><strong>Attributes:</strong> {Array.isArray(currentSlide.kpi.attributes) ? currentSlide.kpi.attributes.length : 0}</div>
//                         {Array.isArray(currentSlide.kpi.attributes) && currentSlide.kpi.attributes.length > 0 && (
//                           <div className="text-xs text-slate-500 mt-2">
//                             {currentSlide.kpi.attributes.slice(0,6).map(a => a.name).join(", ")}{currentSlide.kpi.attributes.length > 6 ? `, +${currentSlide.kpi.attributes.length - 6} more` : ""}
//                           </div>
//                         )}
//                       </div>
//                     </div>

//                     {/* Target Revisions table */}
//                     <div className="pt-4 border-t">
//                       <h4 className="text-sm font-medium mb-2">Target Revisions</h4>
//                       <div className="overflow-auto text-sm">
//                         <table className="min-w-full">
//                           <thead className="bg-slate-50">
//                             <tr>
//                               <th className="px-3 py-2 text-left text-xs">#</th>
//                               <th className="px-3 py-2 text-left text-xs">Target Value</th>
//                               <th className="px-3 py-2 text-left text-xs">Revision Date</th>
//                               <th className="px-3 py-2 text-left text-xs">Created</th>
//                             </tr>
//                           </thead>
//                           <tbody>
//                             {Array.isArray(currentSlide.kpi.targetRevisions) && currentSlide.kpi.targetRevisions.length > 0 ? (
//                               [...currentSlide.kpi.targetRevisions].slice().sort((a,b) => {
//                                 const da = parseDateLenient(a.revisionDate) || new Date(a.createdAt || 0);
//                                 const db = parseDateLenient(b.revisionDate) || new Date(b.createdAt || 0);
//                                 return da - db;
//                               }).map((rev, idx) => (
//                                 <tr key={rev.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
//                                   <td className="px-3 py-2 text-xs">{idx + 1}</td>
//                                   <td className="px-3 py-2 text-xs">{rev.targetValue}</td>
//                                   <td className="px-3 py-2 text-xs">{rev.revisionDate ? formatDateDisplay(rev.revisionDate) : "—"}</td>
//                                   <td className="px-3 py-2 text-xs">{rev.createdAt ? formatDateDisplay(rev.createdAt) : "—"}</td>
//                                 </tr>
//                               ))
//                             ) : (
//                               <tr>
//                                 <td colSpan={4} className="px-3 py-3 text-center text-slate-500">No revisions yet.</td>
//                               </tr>
//                             )}
//                           </tbody>
//                         </table>
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

  const percentAchieved = (periodTarget != null && periodTarget !== 0 && avgValue != null) ? (avgValue / periodTarget) * 100 : 0;

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

  // toggle for showing present value line on charts
  const [showPresentLine, setShowPresentLine] = useState(true);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const res = await api.get(`/kpis/plant/${encodeURIComponent(plantId)}`);
        const list = Array.isArray(res.data) ? res.data : [];

        const promises = list.map(async (k) => {
          const [pRes, cRes] = await Promise.allSettled([
            api.get(`/uploads/${encodeURIComponent(k.id)}/preview?limit=999999`),
            api.get(`/kpis/${encodeURIComponent(k.id)}/charts`),
          ]);
          const parsed = (pRes.status === "fulfilled" && pRes.value && pRes.value.data) ? pRes.value.data : { headers: [], rows: [] };
          const charts = (cRes.status === "fulfilled" && Array.isArray(cRes.value.data)) ? cRes.value.data : [];
          const primary = charts.length > 0 ? charts[0] : null;
          return { kpi: k, parsed, primaryChart: primary };
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
      } else {
        document.documentElement.style.background = "";
        document.body.style.background = "";
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
    if (idx < 0) idx = 0;
    if (idx >= kpis.length) idx = kpis.length - 1;
    setSelectedIdx(idx);
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
      dateFrom: cfg?.dateFrom || "",
      dateTo: cfg?.dateTo || "",
    };
  }

  // local overrides only for dateFrom/dateTo (per-slide)
  const [localOverrides, setLocalOverrides] = useState({});
  useEffect(() => {
    const obj = {};
    kpis.forEach((s, i) => {
      const cfg = getSlideConfig(s);
      obj[i] = {
        dateFrom: cfg.dateFrom || "",
        dateTo: cfg.dateTo || "",
      };
    });
    setLocalOverrides(obj);
    // eslint-disable-next-line
  }, [kpis.length]);

  const currentSlide = kpis[selectedIdx];

  /* ---------- derived chart data for recharts ---------- */
  const chartData = useMemo(() => {
    if (!currentSlide) return [];
    const parsed = currentSlide.parsed || { headers: [], rows: [] };
    const cfg = getSlideConfig(currentSlide);
    const headers = parsed.headers || [];
    const rows = parsed.rows || [];
    if (!cfg.xHeader || !Array.isArray(cfg.yHeaders) || cfg.yHeaders.length === 0) {
      const dateIdx = findDateIndex(headers);
      const valueIdx = findValueIndex(headers, rows);
      if (headers.length === 0) return [];
      const xHeader = headers[dateIdx] || headers[0];
      const yHeader = headers[valueIdx] || headers[headers.length - 1];
      cfg.xHeader = xHeader;
      cfg.yHeaders = [yHeader];
    }

    const idxMap = {};
    headers.forEach((h, i) => (idxMap[h] = i));

    const xIdx = idxMap[cfg.xHeader];
    const resolvedXIdx = (xIdx === undefined) ? 0 : xIdx;

    const lo = localOverrides[selectedIdx] || {};
    const fromD = lo.dateFrom ? parseDateLenient(lo.dateFrom) : (cfg.dateFrom ? parseDateLenient(cfg.dateFrom) : null);
    const toD = lo.dateTo ? parseDateLenient(lo.dateTo) : (cfg.dateTo ? parseDateLenient(cfg.dateTo) : null);

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
    return out;
  }, [currentSlide, localOverrides, selectedIdx]);

  /* ---------- Save chart config (persist primary chart config) ---------- */
  async function saveSlideConfig() {
    if (!currentSlide) return;
    const kpi = currentSlide.kpi;
    const primary = currentSlide.primaryChart;
    const cfgSaved = primary && primary.config ? { ...primary.config } : {};
    const lo = localOverrides[selectedIdx] || {};
    cfgSaved.dateFrom = lo.dateFrom || cfgSaved.dateFrom || null;
    cfgSaved.dateTo = lo.dateTo || cfgSaved.dateTo || null;
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

  /* ---------- Export helpers (unchanged) ---------- */
  async function withHiddenScrollbars(fn) {
    const prevDocOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevContainerPad = containerRef.current ? containerRef.current.style.paddingBottom : "";
    const prevContainerPadTop = containerRef.current ? containerRef.current.style.paddingTop : "";
    const prevContainerOverflow = containerRef.current ? containerRef.current.style.overflow : "";
    const noExportEls = containerRef.current ? Array.from(containerRef.current.querySelectorAll(".no-export")) : [];
    const prevDisplay = noExportEls.map(el => el.style.display);
    const chartArea = containerRef.current ? containerRef.current.querySelector(".chart-area") : null;
    const prevChartPad = chartArea ? chartArea.style.paddingBottom : "";
    const prevScrollTop = window.scrollY || window.pageYOffset || 0;
    try {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      if (containerRef.current) {
        containerRef.current.style.paddingBottom = "56px";
        containerRef.current.style.paddingTop = "16px";
        containerRef.current.style.overflow = "visible";
      }
      noExportEls.forEach(el => { el.style.display = "none"; });
      if (chartArea) chartArea.style.paddingBottom = "48px";
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - 16), behavior: "instant" });
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
      await new Promise((r) => setTimeout(r, 100));
      await fn();
    } finally {
      document.documentElement.style.overflow = prevDocOverflow;
      document.body.style.overflow = prevBodyOverflow;
      if (containerRef.current) {
        containerRef.current.style.paddingBottom = prevContainerPad || "";
        containerRef.current.style.paddingTop = prevContainerPadTop || "";
        containerRef.current.style.overflow = prevContainerOverflow || "";
      }
      noExportEls.forEach((el, i) => { el.style.display = prevDisplay[i] || ""; });
      if (chartArea) chartArea.style.paddingBottom = prevChartPad || "";
      window.scrollTo({ top: prevScrollTop, behavior: "instant" });
    }
  }

  async function exportPNG() {
    if (!containerRef.current) return;
    try {
      await withHiddenScrollbars(async () => {
        const canvas = await html2canvas(containerRef.current, { scale: 2, useCORS: true, allowTaint: true });
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentSlide?.kpi?.name || "kpi"}-presentation.png`;
        a.click();
      });
    } catch (err) {
      console.error("Export PNG failed", err);
      alert("Export PNG failed");
    }
  }

  async function exportPDF() {
    if (!containerRef.current) return;
    try {
      await withHiddenScrollbars(async () => {
        const canvas = await html2canvas(containerRef.current, { scale: 2, useCORS: true, allowTaint: true });
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
      });
    } catch (err) {
      console.error("Export PDF failed", err);
      alert("Export PDF failed");
    }
  }

  /* ---------- compute per-slide KPI metrics (memoized) ---------- */
  const slideMetrics = useMemo(() => {
    if (!currentSlide) return null;
    const cfg = getSlideConfig(currentSlide);
    const lo = localOverrides[selectedIdx] || {};
    const from = lo.dateFrom || cfg.dateFrom || "";
    const to = lo.dateTo || cfg.dateTo || "";

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
  }, [currentSlide, localOverrides, selectedIdx]);

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
    const { cx, cy, value, payload } = dotProps;
    if (cx == null || cy == null) return null;
    const meets = pointMeetsTarget(kpi, value, payload);
    const r = 3;
    const fill = meets ? "#006400" : "#5aa9ff"; // dark green vs lighter blue
    const stroke = meets ? "#004d00" : "#2b6fb2";
    return (
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1} />
    );
  }

  /* active dot renderer: larger radius, green if meets target, else slightly larger blue */
  function renderActiveDot(dotProps, kpi) {
    const { cx, cy, value, payload } = dotProps;
    if (cx == null || cy == null) return null;
    const meets = pointMeetsTarget(kpi, value, payload);
    const r = meets ? 6 : 5;
    const fill = meets ? "#006400" : "#9ed3ff";
    const stroke = meets ? "#003300" : "#2b6fb2";
    return (
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1} />
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <button className="text-sm text-blue-600 mr-4" onClick={() => navigate(-1)}>← Back</button>
            <h1 className="text-2xl font-bold inline">Presentation — {kpis.length} KPIs</h1>
            <div className="text-sm text-slate-500 mt-1">Use Next / Prev or keyboard arrows to navigate slides. Save changes will persist date range to the primary chart.</div>
          </div>

          <div className="flex items-center gap-2">
            <select value={selectedIdx} onChange={(e) => goto(Number(e.target.value))} className="p-2 border rounded">
              {kpis.map((s, i) => <option key={s.kpi.id} value={i}>{s.kpi.name}</option>)}
            </select>

            <button onClick={prev} className="px-3 py-1 bg-slate-100 rounded">Prev</button>
            <button onClick={next} className="px-3 py-1 bg-slate-100 rounded">Next</button>

            {isFullscreen ? (
              <button onClick={exitFullscreen} className="px-3 py-1 bg-slate-100 rounded">Exit Fullscreen</button>
            ) : (
              <button onClick={enterFullscreen} className="px-3 py-1 bg-slate-100 rounded">Enter Fullscreen</button>
            )}

            <button onClick={exportPNG} className="px-3 py-1 bg-emerald-600 text-white rounded">Export PNG</button>
            <button onClick={exportPDF} className="px-3 py-1 bg-blue-600 text-white rounded">Export PDF</button>
          </div>
        </div>

        <div ref={containerRef} className="bg-white p-4 rounded shadow-sm" style={{ minHeight: "65vh" }}>
          {!currentSlide ? (
            <div className="p-6 text-slate-600">No KPI slides available.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white rounded border p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">
                      {currentSlide.kpi.name}
                      <span className="ml-2 text-sm">
                        {(() => {
                          const a = (currentSlide.kpi.action === "sustain" ? "maintain" : (currentSlide.kpi.action || "maintain"));
                          if (a === "increase" || a === "maximize") return <span style={{ color: "#006400" }}>↑</span>;
                          if (a === "decrease" || a === "minimize") return <span style={{ color: "#d64949" }}>↓</span>;
                          return null;
                        })()}
                      </span>
                    </h2>
                    {currentSlide.kpi.description && <div className="text-sm text-slate-600">{currentSlide.kpi.description}</div>}
                    <div className="text-xs text-slate-400 mt-1">Owner: {currentSlide.kpi.owner || "—"}</div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap gap-3 items-end">
                      <div>
                        <div className="text-xs text-slate-500">From</div>
                        <input
                          type="date"
                          value={(localOverrides[selectedIdx] && localOverrides[selectedIdx].dateFrom) || ""}
                          onChange={(e) => setLocalOverrides(lo => ({ ...lo, [selectedIdx]: { ...(lo[selectedIdx]||{}), dateFrom: e.target.value } }))}
                          className="p-2 border rounded"
                        />
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">To</div>
                        <input
                          type="date"
                          value={(localOverrides[selectedIdx] && localOverrides[selectedIdx].dateTo) || ""}
                          onChange={(e) => setLocalOverrides(lo => ({ ...lo, [selectedIdx]: { ...(lo[selectedIdx]||{}), dateTo: e.target.value } }))}
                          className="p-2 border rounded"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-xs text-slate-500">
                          <input type="checkbox" checked={showPresentLine} onChange={(e) => setShowPresentLine(e.target.checked)} />
                          Show present value
                        </label>
                      </div>
                    </div>

                    {!isFullscreen && (
                      <div className="mt-3">
                        <button onClick={saveSlideConfig} className="px-4 py-2 bg-emerald-600 text-white rounded shadow-sm no-export">
                          Save changes
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* chart wrapper */}
                <div className="chart-area border rounded p-2" style={{ width: "100%", height: "62vh" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    { (currentSlide.primaryChart && currentSlide.primaryChart.config && (getSlideConfig(currentSlide).chartType === "bar")) ? (
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
                          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 70 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="x" tick={{ fontSize: 11 }} tickMargin={12} height={48}/>
                            <YAxis />
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
                                  <Bar key={yh} dataKey={yh} barSize={40 / Math.max(1, cfg.yHeaders.length)} >
                                    {chartData.map((entry, i) => {
                                      const val = entry[yh];
                                      const meets = pointMeetsTarget(currentSlide.kpi, val, entry);
                                      return <Cell key={`cell-${i}`} fill={meets ? "#006400" : ["#5aa9ff","#ff7f0e","#006400","#d64949","#9467bd"][idx%5]} />;
                                    })}
                                  </Bar>
                                );
                              }
                              return <Bar key={yh} dataKey={yh} barSize={40 / Math.max(1, cfg.yHeaders.length)} fill={["#5aa9ff","#ff7f0e","#006400","#d64949","#9467bd"][idx%5]} />;
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
                          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 70 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="x" tick={{ fontSize: 11 }} tickMargin={12} height={48} />
                            <YAxis />
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
                                key={yh}
                                type="monotone"
                                dataKey={yh}
                                stroke={["#5aa9ff","#ff7f0e","#006400","#d64949","#9467bd"][idx%5]}
                                dot={(dotProps) => renderCustomDot(dotProps, currentSlide.kpi)}
                                activeDot={(dotProps) => renderActiveDot(dotProps, currentSlide.kpi)}
                                dotCount={false}
                                connectNulls
                              />
                            )}
                          </LineChart>
                        );
                      })()
                    )}
                  </ResponsiveContainer>
                </div>

                <div className="mt-2 text-sm text-slate-600">
                  {getSlideConfig(currentSlide).yHeaders.map(h => (
                    <div key={h} className="inline-block mr-4">• {h}</div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-4 rounded border">
                <h3 className="font-semibold mb-3">KPI Summary</h3>

                {currentSlide.kpi && (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-slate-600">Value (avg)</div>
                        <div className="text-3xl font-bold text-slate-900">{slideMetrics && slideMetrics.avgValue != null ? (Number.isInteger(slideMetrics.avgValue) ? slideMetrics.avgValue : Number(slideMetrics.avgValue.toFixed(2))) : "—"}</div>
                        <div className="text-xs text-slate-400 mt-1">{currentSlide.kpi.unit || ""}</div>
                      </div>

                      <div className="text-right">
                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-100`}>
                          {slideMetrics ? `${Number(slideMetrics.percentAchieved ?? 0).toFixed(1)}%` : "—"}
                        </div>
                        <div className="text-xs text-slate-400 mt-2">target: <span className="font-medium text-slate-700">{slideMetrics && slideMetrics.target != null ? slideMetrics.target : "—"}</span></div>
                      </div>
                    </div>

                    <div className="flex gap-4 text-sm text-slate-600">
                      <div>Days Achieved: <span className="font-medium text-slate-800">{slideMetrics ? slideMetrics.daysAchieved : 0}</span></div>
                      <div>Days Filled: <span className="font-medium text-slate-800">{slideMetrics ? slideMetrics.daysFilled : 0}</span></div>
                    </div>

                    <div className="pt-2 border-t">
                      <h4 className="text-sm font-medium mb-2">Action Taken / Action Plan</h4>
                      {Array.isArray(currentSlide.kpi.actions) && currentSlide.kpi.actions.length > 0 ? (
                        <div className="text-sm">
                          <div className="font-medium">{currentSlide.kpi.actions[0].description}</div>
                          <div className="text-xs text-slate-500 mt-1">Deadline: {currentSlide.kpi.actions[0].deadline || "—"} • Responsibility: {currentSlide.kpi.actions[0].responsibility || "—"} • Status: {currentSlide.kpi.actions[0].status || "—"}</div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">No action plan yet.</div>
                      )}

                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">KPI Details</h4>
                        <div className="text-sm"><strong>Owner:</strong> {currentSlide.kpi.owner || "—"}</div>
                        <div className="text-sm"><strong>Created:</strong> {currentSlide.kpi.createdAt ? new Date(currentSlide.kpi.createdAt).toLocaleString() : "—"}</div>
                        <div className="text-sm mt-2"><strong>Attributes:</strong> {Array.isArray(currentSlide.kpi.attributes) ? currentSlide.kpi.attributes.length : 0}</div>
                        {Array.isArray(currentSlide.kpi.attributes) && currentSlide.kpi.attributes.length > 0 && (
                          <div className="text-xs text-slate-500 mt-2">
                            {currentSlide.kpi.attributes.slice(0,6).map(a => a.name).join(", ")}{currentSlide.kpi.attributes.length > 6 ? `, +${currentSlide.kpi.attributes.length - 6} more` : ""}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Target Revisions table */}
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Target Revisions</h4>
                      <div className="overflow-auto text-sm">
                        <table className="min-w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs">#</th>
                              <th className="px-3 py-2 text-left text-xs">Target Value</th>
                              <th className="px-3 py-2 text-left text-xs">Revision Date</th>
                              <th className="px-3 py-2 text-left text-xs">Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(currentSlide.kpi.targetRevisions) && currentSlide.kpi.targetRevisions.length > 0 ? (
                              [...currentSlide.kpi.targetRevisions].slice().sort((a,b) => {
                                const da = parseDateLenient(a.revisionDate) || new Date(a.createdAt || 0);
                                const db = parseDateLenient(b.revisionDate) || new Date(b.createdAt || 0);
                                return da - db;
                              }).map((rev, idx) => (
                                <tr key={rev.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                  <td className="px-3 py-2 text-xs">{idx + 1}</td>
                                  <td className="px-3 py-2 text-xs">{rev.targetValue}</td>
                                  <td className="px-3 py-2 text-xs">{rev.revisionDate ? formatDateDisplay(rev.revisionDate) : "—"}</td>
                                  <td className="px-3 py-2 text-xs">{rev.createdAt ? formatDateDisplay(rev.createdAt) : "—"}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="px-3 py-3 text-center text-slate-500">No revisions yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
