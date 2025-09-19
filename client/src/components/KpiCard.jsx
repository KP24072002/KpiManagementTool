

// import React, { useEffect, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import api from "../utils/api";
// import ActionPlans from "./ActionPlans";
// import PreviewTable from "./PreviewTable";

// function LoadingBox({ text = "Loading..." }) {
//   return (
//     <div className="p-3 bg-white rounded shadow-sm text-sm text-slate-500">
//       {text}
//     </div>
//   );
// }

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

//   let dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
//   if (dmy) {
//     let day = Number(dmy[1]), mon = Number(dmy[2]), year = Number(dmy[3]);
//     if (year < 100) year += 2000;
//     if (mon > 12 && day <= 12) [day, mon] = [mon, day];
//     const date = new Date(year, mon - 1, day);
//     if (isFinite(date.getTime())) return date;
//   }

//   const fallback = new Date(s);
//   return isFinite(fallback.getTime()) ? fallback : null;
// }

// function formatDateDisplay(value) {
//   const d = parseDateLenient(value);
//   if (!d) return "";
//   const opts = { year: "numeric", month: "long", day: "numeric" };
//   return d.toLocaleDateString(undefined, opts);
// }

// function formatDateIso(d) {
//   if (!(d instanceof Date) || isNaN(d.getTime())) return "";
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, "0");
//   const day = String(d.getDate()).padStart(2, "0");
//   return `${y}-${m}-${day}`;
// }

// /**
//  * Normalize action value coming from backend (support legacy 'sustain').
//  */
// function normalizeAction(act) {
//   if (act === null || act === undefined) return "maintain";
//   if (String(act) === "sustain") return "maintain";
//   return String(act);
// }

// export default function KpiCard({ kpi, onUploadSuccess, onSaved }) {
//   const navigate = useNavigate();
//   const { plantId } = useParams();

//   const [preview, setPreview] = useState(null);
//   const [loadingPreview, setLoadingPreview] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [fullPreview, setFullPreview] = useState({ headers: [], rows: [] });
//   const [loadingFullPreview, setLoadingFullPreview] = useState(false);
//   const [attributes, setAttributes] = useState(Array.isArray(kpi.attributes) ? [...kpi.attributes] : []);
//   const [newAttributeName, setNewAttributeName] = useState("");
//   const [newAttributeCount, setNewAttributeCount] = useState(0);
//   const [addingAttr, setAddingAttr] = useState(false);
//   const [breakdownCount, setBreakdownCount] = useState(
//     typeof kpi.breakdownCount === "number" ? kpi.breakdownCount : kpi.breakdownCount ? Number(kpi.breakdownCount) : 0
//   );
//   const [savingBreakdown, setSavingBreakdown] = useState(false);
//   const [actionsCount, setActionsCount] = useState(0);
//   const [selectedMonth, setSelectedMonth] = useState(() => {
//     const now = new Date();
//     return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
//   });
//   const [dynamicCounts, setDynamicCounts] = useState({});
//   const [isEditing, setIsEditing] = useState(false);
//   const [metaSaving, setMetaSaving] = useState(false);
//   const [editingMap, setEditingMap] = useState({});
//   const [meta, setMeta] = useState({
//     name: kpi.name || "",
//     action: normalizeAction(kpi.action || "maintain"),
//     description: kpi.description || "",
//     presentValue: kpi.presentValue !== undefined && kpi.presentValue !== null ? String(kpi.presentValue) : "",
//     targetValue: kpi.targetValue !== undefined && kpi.targetValue !== null ? String(kpi.targetValue) : "",
//     targetLowerValue: kpi.targetLowerValue !== undefined && kpi.targetLowerValue !== null ? String(kpi.targetLowerValue) : "",
//     targetUpperValue: kpi.targetUpperValue !== undefined && kpi.targetUpperValue !== null ? String(kpi.targetUpperValue) : "",
//     unit: kpi.unit || "",
//     deadline: kpi.deadline || "",
//     targetRevisionDate: kpi.targetRevisionDate || "",
//     owner: kpi.owner || "",
//   });

//   useEffect(() => {
//     setMeta({
//       name: kpi.name || "",
//       action: normalizeAction(kpi.action || "maintain"),
//       description: kpi.description || "",
//       presentValue: kpi.presentValue !== undefined && kpi.presentValue !== null ? String(kpi.presentValue) : "",
//       targetValue: kpi.targetValue !== undefined && kpi.targetValue !== null ? String(kpi.targetValue) : "",
//       targetLowerValue: kpi.targetLowerValue !== undefined && kpi.targetLowerValue !== null ? String(kpi.targetLowerValue) : "",
//       targetUpperValue: kpi.targetUpperValue !== undefined && kpi.targetUpperValue !== null ? String(kpi.targetUpperValue) : "",
//       unit: kpi.unit || "",
//       deadline: kpi.deadline || "",
//       targetRevisionDate: kpi.targetRevisionDate || "",
//       owner: kpi.owner || "",
//     });
//     setAttributes(Array.isArray(kpi.attributes) ? [...kpi.attributes] : []);
//     setBreakdownCount(
//       typeof kpi.breakdownCount === "number" ? kpi.breakdownCount : kpi.breakdownCount ? Number(kpi.breakdownCount) : 0
//     );

//     fetchData();
//     fetchActionsCount();
//     // eslint-disable-next-line
//   }, [kpi.id]);

//   async function fetchActionsCount() {
//     try {
//       const res = await api.get(`/kpis/${encodeURIComponent(kpi.id)}/actions`);
//       setActionsCount(Array.isArray(res.data) ? res.data.length : 0);
//     } catch {
//       setActionsCount(0);
//     }
//   }

//   async function fetchData() {
//     setLoadingPreview(true);
//     setLoadingFullPreview(true);
//     try {
//       const res = await api.get(`/uploads/${encodeURIComponent(kpi.id)}/preview?limit=999999`);
//       const data = res.data || { headers: [], rows: [] };
//       const originalRows = Array.isArray(data.rows) ? data.rows : [];
//       const idToName = {};
//       (Array.isArray(attributes) ? attributes : []).forEach((a) => {
//         if (a && a.id) idToName[a.id] = a.name ?? a.id;
//       });
//       const transformedRows = originalRows.map((row) => {
//         if (!Array.isArray(row)) return row;
//         return row.map((cell) => {
//           if (cell === null || cell === undefined) return cell;
//           if (typeof cell === "string" && idToName[cell]) return idToName[cell];
//           return cell;
//         });
//       });
//       setFullPreview({ headers: data.headers, rows: originalRows });
//       setPreview({ headers: data.headers, rows: transformedRows.slice(-5) });
//     } catch (err) {
//       console.error("Failed to load data", err);
//       setPreview(null);
//       setFullPreview({ headers: [], rows: [] });
//     } finally {
//       setLoadingPreview(false);
//       setLoadingFullPreview(false);
//     }
//   }

//   async function handleFile(e) {
//     const file = e.target.files[0];
//     if (!file) return;
//     setUploading(true);
//     try {
//       const form = new FormData();
//       form.append("file", file);
//       const res = await api.post(`/uploads/${encodeURIComponent(kpi.id)}/upload`, form, { headers: { "Content-Type": "multipart/form-data" } });
//       await fetchData();
//       if (onUploadSuccess) onUploadSuccess(kpi.id);
//       alert(`Uploaded. Rows: ${res.data.parsed?.rowCount ?? "unknown"}`);
//     } catch (err) {
//       console.error("Upload failed", err);
//       alert(err?.response?.data?.error || err?.message || "Upload failed");
//     } finally {
//       setUploading(false);
//       if (e.target) e.target.value = "";
//     }
//   }

//   async function handleAddAttribute() {
//     const name = (newAttributeName || "").trim();
//     if (!name) return alert("Enter attribute name");
//     const cnt = Number(newAttributeCount);
//     if (!Number.isInteger(cnt) || cnt < 0) return alert("count must be a non-negative integer");

//     setAddingAttr(true);
//     try {
//       const res = await api.post(`/kpis/${encodeURIComponent(kpi.id)}/attributes`, { name, count: cnt });
//       setAttributes((prev) => [...prev, res.data]);
//       setNewAttributeName("");
//       setNewAttributeCount(0);
//       await fetchData();
//       if (onSaved) onSaved(kpi.id);
//     } catch (err) {
//       console.error("Add attribute failed", err);
//       alert(err?.response?.data?.error || err?.message || "Add attribute failed");
//     } finally {
//       setAddingAttr(false);
//     }
//   }

//   function startEdit(attr) {
//     setEditingMap((prev) => ({ ...prev, [attr.id]: { name: attr.name, count: attr.count ?? 0, saving: false } }));
//   }

//   function cancelEdit(attrId) {
//     setEditingMap((prev) => {
//       const copy = { ...prev };
//       delete copy[attrId];
//       return copy;
//     });
//   }

//   async function saveAttribute(attrId) {
//     const state = editingMap[attrId];
//     if (!state) return;
//     const name = (state.name || "").trim();
//     const cnt = Number(state.count);
//     if (!name) return alert("Attribute name required");
//     if (!Number.isInteger(cnt) || cnt < 0) return alert("count must be a non-negative integer");

//     setEditingMap((prev) => ({ ...prev, [attrId]: { ...prev[attrId], saving: true } }));
//     try {
//       const res = await api.put(`/kpis/${encodeURIComponent(kpi.id)}/attributes/${encodeURIComponent(attrId)}`, { name, count: cnt });
//       setAttributes((prev) => prev.map((a) => (a.id === attrId ? res.data : a)));
//       cancelEdit(attrId);
//       await fetchData();
//       if (onSaved) onSaved(kpi.id);
//     } catch (err) {
//       console.error("Save attribute failed", err);
//       alert(err?.response?.data?.error || err?.message || "Save failed");
//       setEditingMap((prev) => ({ ...prev, [attrId]: { ...prev[attrId], saving: false } }));
//     }
//   }

//   async function handleDeleteAttribute(attrId) {
//     if (!window.confirm("Delete attribute?")) return;
//     try {
//       await api.delete(`/kpis/${encodeURIComponent(kpi.id)}/attributes/${encodeURIComponent(attrId)}`);
//       setAttributes((prev) => prev.filter((a) => a.id !== attrId));
//       await fetchData();
//       if (onSaved) onSaved(kpi.id);
//     } catch (err) {
//       console.error("Delete attribute failed", err);
//       alert(err?.response?.data?.error || err?.message || "Delete attribute failed");
//     }
//   }

//   async function handleSaveBreakdown() {
//     const bc = Number(breakdownCount);
//     if (!Number.isInteger(bc) || bc < 0) return alert("breakdownCount must be a non-negative integer");
//     setSavingBreakdown(true);
//     try {
//       const res = await api.put(`/kpis/${encodeURIComponent(kpi.id)}`, { breakdownCount: bc });
//       setBreakdownCount(res.data.breakdownCount ?? bc);
//       if (onSaved) onSaved(kpi.id);
//       alert("Saved breakdown count");
//     } catch (err) {
//       console.error("Save breakdown failed", err);
//       alert(err?.response?.data?.error || err?.message || "Save failed");
//     } finally {
//       setSavingBreakdown(false);
//     }
//   }

//   function computeDynamicCounts(monthISO, fullPrev = fullPreview, attrs = attributes) {
//     const map = {};
//     (Array.isArray(attrs) ? attrs : []).forEach((a) => {
//       if (a && a.id) map[a.id] = 0;
//     });

//     if (!monthISO || !fullPrev || !Array.isArray(fullPrev.rows) || fullPrev.rows.length === 0) {
//       setDynamicCounts(map);
//       return;
//     }

//     const headers = fullPrev.headers || [];
//     const rows = fullPrev.rows || [];

//     let dateIdx = headers.findIndex((h) => /date/i.test(String(h || "")));
//     if (dateIdx === -1) dateIdx = 0;

//     const rootIdxs = headers
//       .map((h, i) => ({ h, i }))
//       .filter((x) => /^root\s*cause/i.test(String(x.h || "")) || /root[_\s-]?cause/i.test(String(x.h || "")))
//       .map((x) => x.i);

//     const scanIdxs = rootIdxs.length > 0 ? rootIdxs : headers.map((_, i) => i);

//     const [y, m] = String(monthISO).split("-");
//     if (!y || !m) {
//       setDynamicCounts(map);
//       return;
//     }
//     const start = new Date(Number(y), Number(m) - 1, 1);
//     const end = new Date(Number(y), Number(m), 1);

//     for (let r = 0; r < rows.length; r++) {
//       const row = rows[r];
//       const rawDate = row[dateIdx];
//       const d = parseDateLenient(rawDate);
//       if (!d) continue;
//       if (d < start || d >= end) continue;

//       for (const ci of scanIdxs) {
//         const cell = row[ci];
//         if (cell === undefined || cell === null || String(cell).trim() === "") continue;
//         const s = String(cell).trim();
//         let found = attrs.find((a) => a.id === s);
//         if (found) {
//           map[found.id] = (map[found.id] || 0) + 1;
//           continue;
//         }
//         found = attrs.find((a) => String(a.name || "").toLowerCase() === s.toLowerCase());
//         if (found) {
//           map[found.id] = (map[found.id] || 0) + 1;
//           continue;
//         }
//       }
//     }

//     setDynamicCounts(map);
//   }

//   useEffect(() => {
//     computeDynamicCounts(selectedMonth, fullPreview, attributes);
//     // eslint-disable-next-line
//   }, [selectedMonth, fullPreview, attributes]);

//   function detectDateIndex(headers = []) {
//     let idx = headers.findIndex((h) => /date/i.test(String(h || "")));
//     if (idx === -1) idx = 0;
//     return idx;
//   }

//   function detectNumericColumns(headers = [], rows = []) {
//     const candidates = [];
//     for (let i = 0; i < headers.length; i++) {
//       let samples = 0;
//       let numeric = 0;
//       for (let r = 0; r < Math.min(12, rows.length); r++) {
//         const v = rows[r][i];
//         if (v === null || v === undefined || String(v).trim() === "") continue;
//         samples++;
//         const n = Number(String(v).replace(/,/g, ""));
//         if (!Number.isNaN(n)) numeric++;
//       }
//       if (samples === 0) {
//         if (/target|value|actual|produced|qty|quantity|count|pieces|loss|snf|fat/i.test(String(headers[i] || ""))) candidates.push(i);
//       } else if (numeric >= Math.ceil(samples / 2)) {
//         candidates.push(i);
//       }
//     }
//     return candidates;
//   }

//   function findRootCauseIndexes(headers = []) {
//     return headers
//       .map((h, i) => ({ h, i }))
//       .filter((x) => /^root\s*cause/i.test(String(x.h || "")) || /root[_\s-]?cause/i.test(String(x.h || "")))
//       .map((x) => x.i);
//   }

//   const todayIso = formatDateIso(new Date());
//   const [quickDate, setQuickDate] = useState(todayIso);
//   const [quickValue, setQuickValue] = useState("");
//   const [quickTarget, setQuickTarget] = useState("");
//   const [quickRootAttrId, setQuickRootAttrId] = useState("");
//   const [quickValueCol, setQuickValueCol] = useState(null);
//   const [quickTargetCol, setQuickTargetCol] = useState(null);
//   const [addingRow, setAddingRow] = useState(false);

//   useEffect(() => {
//     const headers = Array.isArray(fullPreview.headers) ? fullPreview.headers : [];
//     const rows = Array.isArray(fullPreview.rows) ? fullPreview.rows : [];
//     const numericCols = detectNumericColumns(headers, rows);

//     if (numericCols.length > 0) {
//       setQuickValueCol((prev) => (prev === null ? numericCols[0] : prev));
//       setQuickTargetCol((prev) => (prev === null ? (numericCols[1] ?? numericCols[0]) : prev));
//     } else {
//       const dIdx = detectDateIndex(headers);
//       const fallback = headers.map((_, i) => i).find((i) => i !== dIdx);
//       setQuickValueCol((prev) => (prev === null ? (fallback ?? 0) : prev));
//       setQuickTargetCol((prev) => (prev === null ? (fallback ?? 0) : prev));
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [fullPreview.headers, fullPreview.rows]);

//   async function handleQuickAdd() {
//     if (!quickDate) return alert("Please pick a date");
//     if (quickValue === "" || quickValue === null) return alert("Please enter value");
//     setAddingRow(true);
//     try {
//       let baseline = fullPreview;
//       if (!baseline || !Array.isArray(baseline.headers) || baseline.headers.length === 0) {
//         const res = await api.get(`/uploads/${encodeURIComponent(kpi.id)}/preview?limit=999999`);
//         baseline = res.data || { headers: [], rows: [] };
//       }
//       const headersArr = Array.isArray(baseline.headers) ? [...baseline.headers] : [];
//       let rowsArr = Array.isArray(baseline.rows) ? baseline.rows.map((r) => Array.isArray(r) ? [...r] : []) : [];

//       const dateIdx = detectDateIndex(headersArr);
//       const rootIdxs = findRootCauseIndexes(headersArr);
//       const rootIdx = rootIdxs.length > 0 ? rootIdxs[0] : -1;

//       if (rootIdx === -1 && quickRootAttrId) {
//         alert("No 'Root Cause' column found in the data. Please add a Root Cause column in Edit Rows first.");
//         setAddingRow(false);
//         return;
//       }

//       const len = headersArr.length;
//       rowsArr = rowsArr.map((r) => {
//         const copy = Array.isArray(r) ? [...r] : [];
//         if (copy.length < len) return [...copy, ...Array(len - copy.length).fill("")];
//         if (copy.length > len) return copy.slice(0, len);
//         return copy;
//       });

//       const newRow = Array(len).fill("");
//       newRow[dateIdx] = quickDate;

//       const vCol = quickValueCol !== null ? quickValueCol : null;
//       if (vCol === null || vCol < 0 || vCol >= len) {
//         alert("Value column not selected or invalid.");
//         setAddingRow(false);
//         return;
//       }
//       newRow[vCol] = quickValue;

//       if (quickTarget !== "" && quickTarget !== null) {
//         const tCol = quickTargetCol !== null ? quickTargetCol : null;
//         if (tCol === null || tCol < 0 || tCol >= len) {
//           alert("Target column not selected or invalid.");
//           setAddingRow(false);
//           return;
//         }
//         newRow[tCol] = quickTarget;
//       }

//       if (quickRootAttrId) {
//         newRow[rootIdx] = quickRootAttrId;
//       }

//       rowsArr.push(newRow);

//       await api.put(`/kpis/${encodeURIComponent(kpi.id)}/data`, { headers: headersArr, rows: rowsArr });

//       await fetchData();
//       if (onSaved) onSaved(kpi.id);

//       setQuickValue("");
//       setQuickTarget("");
//       setQuickRootAttrId("");
//       alert("Row added");
//     } catch (err) {
//       console.error("Quick add failed", err);
//       alert(err?.response?.data?.error || err?.message || "Add row failed");
//     } finally {
//       setAddingRow(false);
//     }
//   }

//   async function handleSaveMeta() {
//     if (!meta.name || !meta.name.trim()) return alert("KPI name required");
//     // client-side validation according to action rules
//     const act = normalizeAction(meta.action);
//     const pv = meta.presentValue === "" ? null : Number(String(meta.presentValue));
//     const tv = meta.targetValue === "" ? null : Number(String(meta.targetValue));
//     const tl = meta.targetLowerValue === "" ? null : Number(String(meta.targetLowerValue));
//     const tu = meta.targetUpperValue === "" ? null : Number(String(meta.targetUpperValue));

//     if (meta.presentValue !== "" && Number.isNaN(pv)) return alert("Present value must be numeric or left empty.");
//     if (meta.targetValue !== "" && Number.isNaN(tv)) return alert("Target value must be numeric or left empty.");
//     if (meta.targetLowerValue !== "" && Number.isNaN(tl)) return alert("Lower target must be numeric or left empty.");
//     if (meta.targetUpperValue !== "" && Number.isNaN(tu)) return alert("Upper target must be numeric or left empty.");

//     if ((act === "increase" || act === "decrease") && (tv === null || tv === undefined)) {
//       return alert("Please provide targetValue for increase/decrease.");
//     }
//     if (act === "maintain" && (tl === null || tu === null)) {
//       return alert("Please provide both targetLowerValue and targetUpperValue for maintain.");
//     }
//     if (act === "maximize" && (tu === null || tu === undefined)) {
//       return alert("Please provide targetUpperValue for maximize.");
//     }
//     if (act === "minimize" && (tl === null || tl === undefined)) {
//       return alert("Please provide targetLowerValue for minimize.");
//     }

//     setMetaSaving(true);
//     try {
//       const payload = {
//         name: String(meta.name).trim(),
//         description: meta.description ? String(meta.description).trim() : "",
//         owner: meta.owner ? String(meta.owner).trim() : "",
//         action: act,
//         presentValue: pv === null ? null : pv,
//         targetValue: tv === null ? null : tv,
//         targetLowerValue: tl === null ? null : tl,
//         targetUpperValue: tu === null ? null : tu,
//         unit: meta.unit ? String(meta.unit).trim() : "",
//         deadline: meta.deadline ? String(meta.deadline) : null,
//         targetRevisionDate: meta.targetRevisionDate ? String(meta.targetRevisionDate) : null,
//       };

//       const res = await api.put(`/kpis/${encodeURIComponent(kpi.id)}`, payload);
//       if (res.data) {
//         setMeta((prev) => ({
//           ...prev,
//           ...{
//             name: res.data.name ?? prev.name,
//             description: res.data.description ?? prev.description,
//             owner: res.data.owner ?? prev.owner,
//             action: normalizeAction(res.data.action ?? prev.action),
//             presentValue: res.data.presentValue !== undefined && res.data.presentValue !== null ? String(res.data.presentValue) : prev.presentValue,
//             targetValue: res.data.targetValue !== undefined && res.data.targetValue !== null ? String(res.data.targetValue) : prev.targetValue,
//             targetLowerValue: res.data.targetLowerValue !== undefined && res.data.targetLowerValue !== null ? String(res.data.targetLowerValue) : prev.targetLowerValue,
//             targetUpperValue: res.data.targetUpperValue !== undefined && res.data.targetUpperValue !== null ? String(res.data.targetUpperValue) : prev.targetUpperValue,
//             unit: res.data.unit ?? prev.unit,
//             deadline: res.data.deadline ?? prev.deadline,
//             targetRevisionDate: res.data.targetRevisionDate ?? prev.targetRevisionDate,
//           },
//         }));
//       }
//       setIsEditing(false);
//       await fetchData();
//       if (onSaved) onSaved(kpi.id);
//       alert("Saved");
//     } catch (err) {
//       console.error("Save meta failed", err);
//       alert(err?.response?.data?.error || err?.message || "Save failed");
//     } finally {
//       setMetaSaving(false);
//     }
//   }

//   function buildFullSentence(m = meta) {
//     if (!m) return "";
//     const act = normalizeAction(m.action);
//     let actionText;
//     switch (act) {
//       case "increase":
//         actionText = "Increase";
//         break;
//       case "decrease":
//         actionText = "Decrease";
//         break;
//       case "maintain":
//         actionText = "Maintain";
//         break;
//       case "maximize":
//         actionText = "Maximize";
//         break;
//       case "minimize":
//         actionText = "Minimize";
//         break;
//       default:
//         actionText = "Manage";
//     }

//     const desc = m.description ? String(m.description).trim() : "";
//     const present = m.presentValue !== "" && m.presentValue !== null ? String(m.presentValue).trim() : "";
//     const tv = m.targetValue !== "" && m.targetValue !== null ? String(m.targetValue).trim() : "";
//     const tl = m.targetLowerValue !== "" && m.targetLowerValue !== null ? String(m.targetLowerValue).trim() : "";
//     const tu = m.targetUpperValue !== "" && m.targetUpperValue !== null ? String(m.targetUpperValue).trim() : "";
//     const unitRaw = m.unit ? String(m.unit).trim() : "";
//     const isMeasurement = unitRaw && unitRaw.length <= 5 && /^[A-Za-z%]+$/.test(unitRaw);
//     const measurement = isMeasurement ? unitRaw : "";
//     const location = !isMeasurement ? unitRaw : "";

//     const parts = [];
//     if (desc) {
//       parts.push(`${actionText} ${desc}`);
//     } else {
//       parts.push(`${actionText} this KPI`);
//     }

//     if (act === "maintain") {
//       if (tl && tu) {
//         parts.push(`to maintain between ${tl}${measurement ? " " + measurement : ""} and ${tu}${measurement ? " " + measurement : ""}`);
//       } else if (tl) {
//         parts.push(`to maintain above ${tl}${measurement ? " " + measurement : ""}`);
//       } else if (tu) {
//         parts.push(`to maintain below ${tu}${measurement ? " " + measurement : ""}`);
//       }
//     } else if (act === "maximize") {
//       if (tu) parts.push(`to maximize (target ≥ ${tu}${measurement ? " " + measurement : ""})`);
//     } else if (act === "minimize") {
//       if (tl) parts.push(`to minimize (target ≤ ${tl}${measurement ? " " + measurement : ""})`);
//     } else {
//       // increase / decrease / general
//       if (present) parts.push(`from ${present}${measurement ? " " + measurement : ""}`);
//       if (tv) parts.push(`${present ? "to" : "to reach"} ${tv}${measurement ? " " + measurement : ""}`);
//     }

//     if (location) {
//       parts.push(`at ${location}`);
//     }
//     if (m.deadline) {
//       const pretty = formatDateDisplay(m.deadline);
//       if (pretty) parts.push(`by ${pretty}`);
//     }
//     if (m.owner) {
//       parts.push(`Owner: ${m.owner}`);
//     }

//     const sentence = parts.join(" ").replace(/\s+/g, " ").trim();
//     // Ensure readable punctuation
//     return sentence;
//   }

//   const fullSentence = buildFullSentence();

//   return (
//     <div className="p-4 bg-white rounded shadow-sm">
//       {/* 1. Details */}
//       <div className="flex items-start justify-between gap-4">
//         <div className="flex-1">
//           <div className="flex items-center gap-3">
//             {!isEditing ? (
//               <>
//                 <div className="text-lg font-semibold">{meta.name || "—"}</div>
//                 <div className="text-xs text-slate-400">• {meta.owner || "—"}</div>
//                 <div className="text-xs text-slate-400">• Created: {kpi.createdAt ? new Date(kpi.createdAt).toLocaleString() : "—"}</div>
//                 <div className="ml-3 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">Actions: {actionsCount}</div>
//               </>
//             ) : (
//               <input
//                 value={meta.name}
//                 onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
//                 placeholder="KPI name"
//                 className="p-2 border rounded w-full text-lg font-semibold"
//               />
//             )}
//           </div>
//           {!isEditing && fullSentence && (
//             <div className="text-sm text-slate-700 mt-1">{fullSentence}</div>
//           )}
//           <div className="mt-2">
//             {!isEditing ? (
//               <div className="text-sm text-slate-600">{meta.description}</div>
//             ) : (
//               <textarea value={meta.description} onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))} className="mt-1 block w-full p-2 border rounded h-20" />
//             )}
//           </div>
//           <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
//             <div>
//               <div className="text-xs text-slate-500">Action</div>
//               {!isEditing ? <div className="mt-1">{(meta.action || "maintain").toUpperCase()}</div> : (
//                 <select value={meta.action} onChange={(e) => setMeta((m) => ({ ...m, action: e.target.value }))} className="mt-1 p-2 border rounded w-full">
//                   <option value="increase">Increase</option>
//                   <option value="decrease">Decrease</option>
//                   <option value="maintain">Maintain (range)</option>
//                   <option value="maximize">Maximize</option>
//                   <option value="minimize">Minimize</option>
//                 </select>
//               )}
//             </div>

//             <div>
//               <div className="text-xs text-slate-500">Present value</div>
//               {!isEditing ? <div className="mt-1">{meta.presentValue ?? "—"}</div> : (
//                 <input type="number" value={meta.presentValue} onChange={(e) => setMeta((m) => ({ ...m, presentValue: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
//               )}
//             </div>

//             {/* Target fields: show according to action */}
//             <div>
//               <div className="text-xs text-slate-500">
//                 {!isEditing
//                   ? (meta.action === "increase" ? "Upper (target) value" : meta.action === "decrease" ? "Lower (target) value" : meta.action === "maintain" ? "Target range" : meta.action === "maximize" ? "Upper target" : meta.action === "minimize" ? "Lower target" : "Target value")
//                   : (meta.action === "increase" ? "Upper (target) value" : meta.action === "decrease" ? "Lower (target) value" : meta.action === "maintain" ? "Lower / Upper target" : meta.action === "maximize" ? "Upper target" : meta.action === "minimize" ? "Lower target" : "Target value")
//                 }
//               </div>

//               {!isEditing ? (
//                 <div className="mt-1">
//                   {meta.action === "maintain" ? (
//                     (meta.targetLowerValue || meta.targetUpperValue)
//                       ? `${meta.targetLowerValue || "—"} — ${meta.targetUpperValue || "—"}`
//                       : "—"
//                   ) : meta.action === "increase" || meta.action === "decrease" ? (
//                     meta.targetValue ?? "—"
//                   ) : meta.action === "maximize" ? (
//                     meta.targetUpperValue ?? "—"
//                   ) : meta.action === "minimize" ? (
//                     meta.targetLowerValue ?? "—"
//                   ) : (
//                     meta.targetValue ?? "—"
//                   )}
//                 </div>
//               ) : (
//                 <>
//                   {meta.action === "increase" || meta.action === "decrease" ? (
//                     <input type="number" value={meta.targetValue} onChange={(e) => setMeta((m) => ({ ...m, targetValue: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
//                   ) : null}

//                   {meta.action === "maintain" ? (
//                     <div className="flex gap-2">
//                       <input type="number" value={meta.targetLowerValue} onChange={(e) => setMeta((m) => ({ ...m, targetLowerValue: e.target.value }))} placeholder="Lower" className="mt-1 p-2 border rounded w-1/2" />
//                       <input type="number" value={meta.targetUpperValue} onChange={(e) => setMeta((m) => ({ ...m, targetUpperValue: e.target.value }))} placeholder="Upper" className="mt-1 p-2 border rounded w-1/2" />
//                     </div>
//                   ) : null}

//                   {meta.action === "maximize" ? (
//                     <input type="number" value={meta.targetUpperValue} onChange={(e) => setMeta((m) => ({ ...m, targetUpperValue: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
//                   ) : null}

//                   {meta.action === "minimize" ? (
//                     <input type="number" value={meta.targetLowerValue} onChange={(e) => setMeta((m) => ({ ...m, targetLowerValue: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
//                   ) : null}
//                 </>
//               )}
//             </div>

//             <div>
//               <div className="text-xs text-slate-500">Unit / Location</div>
//               {!isEditing ? <div className="mt-1">{meta.unit || "—"}</div> : (
//                 <input value={meta.unit} onChange={(e) => setMeta((m) => ({ ...m, unit: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
//               )}
//             </div>

//             <div>
//               <div className="text-xs text-slate-500">Deadline</div>
//               {!isEditing ? <div className="mt-1">{meta.deadline ? formatDateDisplay(meta.deadline) : "—"}</div> : (
//                 <input type="date" value={meta.deadline} onChange={(e) => setMeta((m) => ({ ...m, deadline: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
//               )}
//             </div>

//             <div>
//               <div className="text-xs text-slate-500">Target revision date</div>
//               {!isEditing ? <div className="mt-1">{meta.targetRevisionDate ? formatDateDisplay(meta.targetRevisionDate) : "—"}</div> : (
//                 <input type="date" value={meta.targetRevisionDate} onChange={(e) => setMeta((m) => ({ ...m, targetRevisionDate: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
//               )}
//             </div>

//             <div className="md:col-span-3">
//               <div className="text-xs text-slate-500">Owner</div>
//               {!isEditing ? <div className="mt-1">{meta.owner || "—"}</div> : (
//                 <input value={meta.owner} onChange={(e) => setMeta((m) => ({ ...m, owner: e.target.value }))} className="mt-1 p-2 border rounded w-full" />
//               )}
//             </div>
//           </div>
//         </div>

//         <div className="flex flex-col items-end gap-2">
//           <label className="px-3 py-1 bg-slate-100 rounded text-sm cursor-pointer">
//             {uploading ? "Uploading..." : "Upload File"}
//             <input type="file" accept=".csv,.xls,.xlsx" onChange={handleFile} className="hidden" />
//           </label>
//           <button onClick={() => navigator.clipboard?.writeText(kpi.id)} className="text-xs text-slate-500">Copy ID</button>
//           {!isEditing ? (
//             <div className="flex gap-2">
//               <button onClick={() => setIsEditing(true)} className="px-3 py-1 bg-slate-100 rounded text-sm">Edit</button>
//             </div>
//           ) : (
//             <div className="flex gap-2">
//               <button onClick={handleSaveMeta} disabled={metaSaving} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">{metaSaving ? "Saving..." : "Save"}</button>
//               <button
//                 onClick={() => {
//                   setIsEditing(false);
//                   setMeta({
//                     name: kpi.name || "",
//                     action: normalizeAction(kpi.action || "maintain"),
//                     description: kpi.description || "",
//                     presentValue: kpi.presentValue !== undefined && kpi.presentValue !== null ? String(kpi.presentValue) : "",
//                     targetValue: kpi.targetValue !== undefined && kpi.targetValue !== null ? String(kpi.targetValue) : "",
//                     targetLowerValue: kpi.targetLowerValue !== undefined && kpi.targetLowerValue !== null ? String(kpi.targetLowerValue) : "",
//                     targetUpperValue: kpi.targetUpperValue !== undefined && kpi.targetUpperValue !== null ? String(kpi.targetUpperValue) : "",
//                     unit: kpi.unit || "",
//                     deadline: kpi.deadline || "",
//                     targetRevisionDate: kpi.targetRevisionDate || "",
//                     owner: kpi.owner || "",
//                   });
//                 }}
//                 className="px-3 py-1 bg-slate-100 rounded text-sm"
//               >
//                 Cancel
//               </button>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* 2. Preview */}
//       <div className="mt-4">
//         <div className="flex items-center justify-between mb-2">
//           <strong className="text-sm">Preview (last 5 rows)</strong>
//           <div className="flex items-center gap-2">
//             <button onClick={fetchData} className="text-sm text-blue-600">Refresh</button>
//           </div>
//         </div>
//         {loadingPreview ? (
//           <LoadingBox text="Loading preview..." />
//         ) : preview ? (
//           <PreviewTable headers={preview.headers} rows={preview.rows} />
//         ) : (
//           <div className="text-sm text-slate-500">No data uploaded yet.</div>
//         )}
//       </div>

//       {/* 3. Quick-add row */}
//       <div className="mt-4 border rounded p-4 bg-white">
//         <div className="flex items-center justify-between mb-2">
//           <strong>Quick add row</strong>
//           <div className="text-xs text-slate-500">Add a single row (date, value, optional target, root cause)</div>
//         </div>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
//           <div>
//             <label className="block text-xs text-slate-500">Date</label>
//             <input type="date" value={quickDate} onChange={(e) => setQuickDate(e.target.value)} className="mt-1 p-2 border rounded w-full" />
//           </div>
//           <div>
//             <label className="block text-xs text-slate-500">Value</label>
//             <input type="number" value={quickValue} onChange={(e) => setQuickValue(e.target.value)} className="mt-1 p-2 border rounded w-full" />
//           </div>
//           <div>
//             <label className="block text-xs text-slate-500">Target (optional)</label>
//             <input type="number" value={quickTarget} onChange={(e) => setQuickTarget(e.target.value)} className="mt-1 p-2 border rounded w-full" />
//           </div>
//         </div>
//         <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
//           <div>
//             <label className="block text-xs text-slate-500">Root cause (optional)</label>
//             <select value={quickRootAttrId} onChange={(e) => setQuickRootAttrId(e.target.value)} className="mt-1 p-2 border rounded w-full">
//               <option value="">(none)</option>
//               {attributes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
//             </select>
//           </div>
//           <div>
//             <label className="block text-xs text-slate-500">Value column</label>
//             <select value={quickValueCol ?? ""} onChange={(e) => setQuickValueCol(e.target.value === "" ? null : Number(e.target.value))} className="mt-1 p-2 border rounded w-full">
//               {fullPreview.headers.map((h, i) => <option key={i} value={i}>{h || `(col ${i})`}</option>)}
//             </select>
//           </div>
//           <div>
//             <label className="block text-xs text-slate-500">Target column</label>
//             <select value={quickTargetCol ?? ""} onChange={(e) => setQuickTargetCol(e.target.value === "" ? null : Number(e.target.value))} className="mt-1 p-2 border rounded w-full">
//               <option value="">(none)</option>
//               {fullPreview.headers.map((h, i) => <option key={i} value={i}>{h || `(col ${i})`}</option>)}
//             </select>
//           </div>
//         </div>
//         <div className="mt-3 flex gap-2 justify-end">
//           <button onClick={() => { setQuickDate(formatDateIso(new Date())); setQuickValue(""); setQuickTarget(""); setQuickRootAttrId(""); }} className="px-3 py-1 bg-slate-100 rounded text-sm">Reset</button>
//           <button onClick={handleQuickAdd} disabled={addingRow} className="px-3 py-1 bg-emerald-600 text-white rounded text-sm">{addingRow ? "Adding..." : "Add row"}</button>
//         </div>
//       </div>

//       {/* 4. Attributes */}
//       <div className="mt-4">
//         <div className="flex items-center justify-between mb-2">
//           <strong>Attributes (Cause Description)</strong>
//           <span className="text-xs text-slate-400">Total: {attributes.length}</span>
//         </div>
//         <div className="mb-3 flex items-center gap-3">
//           <label className="text-sm text-slate-600">Month</label>
//           <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-2 border rounded" />
//           <div className="text-sm text-slate-500 ml-2">Counts show occurrences in this month (based on date column).</div>
//           <button onClick={fetchData} className="ml-auto px-3 py-1 bg-slate-100 rounded text-sm">Refresh counts</button>
//         </div>
//         <div className="overflow-auto border rounded text-sm">
//           <table className="min-w-full">
//             <thead className="bg-slate-50">
//               <tr>
//                 <th className="px-3 py-2 text-left">Sr.no</th>
//                 <th className="px-3 py-2 text-left">Cause Description</th>
//                 <th className="px-3 py-2 text-left">No. of breakdown</th>
//                 <th className="px-3 py-2 text-left">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {attributes.map((attr, idx) => {
//                 const editing = editingMap[attr.id];
//                 const dyn = dynamicCounts[attr.id] || 0;
//                 const stored = (attr.count === undefined || attr.count === null) ? 0 : Number(attr.count);
//                 const displayCount = dyn > 0 ? dyn : stored;
//                 return (
//                   <tr key={attr.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
//                     <td className="px-3 py-2 align-top">{idx + 1}</td>
//                     <td className="px-3 py-2 align-top">
//                       {editing ? (
//                         <input value={editing.name} onChange={(e) => setEditingMap((prev) => ({ ...prev, [attr.id]: { ...prev[attr.id], name: e.target.value } }))} className="p-1 border rounded w-full" />
//                       ) : (
//                         <div>{attr.name}</div>
//                       )}
//                     </td>
//                     <td className="px-3 py-2 align-top w-36">
//                       {editing ? (
//                         <input type="number" min={0} value={editing.count} onChange={(e) => setEditingMap((prev) => ({ ...prev, [attr.id]: { ...prev[attr.id], count: e.target.value } }))} className="p-1 border rounded w-full" />
//                       ) : (
//                         <div>{displayCount ?? 0}</div>
//                       )}
//                     </td>
//                     <td className="px-3 py-2 align-top">
//                       {editing ? (
//                         <div className="flex gap-2">
//                           <button onClick={() => saveAttribute(attr.id)} disabled={editing.saving} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">{editing.saving ? "Saving..." : "Save"}</button>
//                           <button onClick={() => cancelEdit(attr.id)} className="px-2 py-1 bg-slate-100 rounded text-sm">Cancel</button>
//                         </div>
//                       ) : (
//                         <div className="flex gap-2">
//                           <button onClick={() => startEdit(attr)} className="px-2 py-1 bg-slate-100 rounded text-sm">Edit</button>
//                           <button onClick={() => handleDeleteAttribute(attr.id)} className="px-2 py-1 bg-red-100 text-red-600 rounded text-sm">Delete</button>
//                         </div>
//                       )}
//                     </td>
//                   </tr>
//                 );
//               })}
//               {attributes.length === 0 && (
//                 <tr>
//                   <td colSpan={4} className="px-3 py-3 text-sm text-slate-500">No attributes yet.</td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//         <div className="mt-3 flex gap-2 items-center">
//           <input placeholder="Cause description" value={newAttributeName} onChange={(e) => setNewAttributeName(e.target.value)} className="p-2 border rounded text-sm flex-1" />
//           <input type="number" min={0} value={newAttributeCount} onChange={(e) => setNewAttributeCount(e.target.value)} className="p-2 border rounded w-36 text-sm" />
//           <button onClick={handleAddAttribute} disabled={addingAttr} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">{addingAttr ? "Adding..." : "Add Attribute"}</button>
//         </div>
//       </div>

//       {/* 5. Action Plans */}
//       <div className="mt-5">
//         <ActionPlans
//           kpiId={kpi.id}
//           onChange={() => {
//             fetchActionsCount();
//             if (onSaved) onSaved(kpi.id);
//           }}
//         />
//       </div>

//       {/* Footer */}
//       <div className="mt-3 flex gap-2">
//         <button className="px-3 py-1 bg-slate-100 rounded text-sm" onClick={() => window.dispatchEvent(new CustomEvent("openEdit", { detail: { kpiId: kpi.id } }))}>Edit Rows</button>
//         <button className="px-3 py-1 bg-slate-100 rounded text-sm" onClick={() => window.dispatchEvent(new CustomEvent("openChart", { detail: { kpiId: kpi.id } }))}>Create Chart</button>
//       </div>
//     </div>
//   );
// }

// client/src/components/KpiCard.jsx
import React, { useEffect, useState } from "react";
import api from "../utils/api";
import ActionPlans from "./ActionPlans";
import PreviewTable from "./PreviewTable";
import TargetRevisions from "./TargetRevisions";

function LoadingBox({ text = "Loading..." }) {
  return (
    <div className="p-3 bg-white rounded shadow text-center text-slate-500 text-sm">
      {text}
    </div>
  );
}

function formatDateDisplay(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function normalizeAction(act) {
  if (!act) return "maintain";
  if (act === "sustain") return "maintain";
  return act;
}

export default function KpiCard({ kpi }) {
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [attributes, setAttributes] = useState([]);
  const [actionsCount, setActionsCount] = useState(0);

  useEffect(() => {
    if (kpi?.id) {
      setAttributes(Array.isArray(kpi.attributes) ? [...kpi.attributes] : []);
      fetchPreview();
      fetchActionsCount();
    }
  }, [kpi?.id]);

  async function fetchPreview() {
    setLoadingPreview(true);
    try {
      const res = await api.get(`/uploads/${encodeURIComponent(kpi.id)}/preview?limit=5`);
      setPreview(res.data || { headers: [], rows: [] });
    } catch (err) {
      console.error("Failed to load preview", err);
      setPreview({ headers: [], rows: [] });
    } finally {
      setLoadingPreview(false);
    }
  }

  async function fetchActionsCount() {
    try {
      const res = await api.get(`/kpis/${encodeURIComponent(kpi.id)}/actions`);
      setActionsCount(Array.isArray(res.data) ? res.data.length : 0);
    } catch {
      setActionsCount(0);
    }
  }

  return (
    <div className="p-5 bg-white rounded-lg shadow-md space-y-6">
      {/* KPI Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">{kpi.name}</h2>
          <span className="px-3 py-1 text-xs bg-slate-100 rounded">
            {normalizeAction(kpi.action).toUpperCase()}
          </span>
        </div>
        <p className="text-slate-600 mt-1 text-sm">{kpi.description}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
          <div>
            <div className="text-slate-500">Owner</div>
            <div className="font-medium">{kpi.owner || "—"}</div>
          </div>
          <div>
            <div className="text-slate-500">Present Value</div>
            <div className="font-medium">{kpi.presentValue ?? "—"} {kpi.unit || ""}</div>
          </div>
          <div>
            <div className="text-slate-500">Target</div>
            <div className="font-medium">
              {kpi.action === "maintain"
                ? `${kpi.targetLowerValue ?? "—"} — ${kpi.targetUpperValue ?? "—"}`
                : kpi.action === "maximize"
                ? kpi.targetUpperValue ?? "—"
                : kpi.action === "minimize"
                ? kpi.targetLowerValue ?? "—"
                : kpi.targetValue ?? "—"}
              {kpi.unit ? ` ${kpi.unit}` : ""}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Deadline</div>
            <div className="font-medium">{kpi.deadline ? formatDateDisplay(kpi.deadline) : "—"}</div>
          </div>
        </div>
      </div>

      
      {/* Target Revisions Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-700">Target Revisions</h3>
          <span className="text-xs text-slate-500">
            Total: {Array.isArray(kpi.targetRevisions) ? kpi.targetRevisions.length : 0}
          </span>
        </div>
        <div className="overflow-auto border rounded text-sm">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Sr. No</th>
                <th className="px-3 py-2 text-left">Target Value</th>
                <th className="px-3 py-2 text-left">Revision Date</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(kpi.targetRevisions) && kpi.targetRevisions.length > 0 ? (
                kpi.targetRevisions.map((rev, idx) => (
                  <tr key={rev.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">{rev.targetValue}</td>
                    <td className="px-3 py-2">{rev.revisionDate ? formatDateDisplay(rev.revisionDate) : "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-center text-slate-500">
                    No revisions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Preview */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-700">Recent Data (last 5 rows)</h3>
          <button onClick={fetchPreview} className="text-xs text-blue-600 hover:underline">Refresh</button>
        </div>
        {loadingPreview ? (
          <LoadingBox text="Loading data..." />
        ) : preview && preview.rows.length > 0 ? (
          <PreviewTable headers={preview.headers} rows={preview.rows} />
        ) : (
          <div className="text-sm text-slate-500">No data uploaded yet.</div>
        )}
      </div>

      {/* Attributes Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-700">Attributes (Cause Descriptions)</h3>
          <span className="text-xs text-slate-500">Total: {attributes.length}</span>
        </div>
        <div className="overflow-auto border rounded text-sm">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Sr. No</th>
                <th className="px-3 py-2 text-left">Cause</th>
                <th className="px-3 py-2 text-left">Count</th>
              </tr>
            </thead>
            <tbody>
              {attributes.length > 0 ? (
                attributes.map((attr, idx) => (
                  <tr key={attr.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-3 py-2">{idx + 1}</td>
                    <td className="px-3 py-2">{attr.name}</td>
                    <td className="px-3 py-2">{attr.count ?? 0}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-center text-slate-500">No attributes yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Plans (Preview only) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-700">Action Plans</h3>
          <span className="text-xs text-slate-500">Total: {actionsCount}</span>
        </div>
        <ActionPlans kpiId={kpi.id} readOnly={true} />
      </div>
    </div>
  );
}
