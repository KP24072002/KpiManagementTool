


// client/src/pages/PresentationView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Brush,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ------------------ helpers: date parse/format ------------------ */
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

/* ---------------- PresentationView ---------------- */
export default function PresentationView() {
  const { plantId, kpiId } = useParams();
  const navigate = useNavigate();

  const [kpi, setKpi] = useState(null);
  const [parsed, setParsed] = useState({ headers: [], rows: [] });
  const [savedCharts, setSavedCharts] = useState([]);
  const [selectedChartId, setSelectedChartId] = useState(null);
  const [chartCfg, setChartCfg] = useState({});

  // date range filters (UI only)
  const [fromDateISO, setFromDateISO] = useState("");
  const [toDateISO, setToDateISO] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(false);

  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onFSChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [kRes, pRes] = await Promise.all([
          api.get(`/kpis/${encodeURIComponent(kpiId)}`),
          api.get(`/uploads/${encodeURIComponent(kpiId)}/preview?limit=999999`),
        ]);
        setKpi(kRes.data);
        setParsed(pRes.data || { headers: [], rows: [] });
      } catch (err) {
        console.error("Failed to load KPI or parsed data", err);
        alert("Failed to load KPI or parsed data");
      } finally {
        setLoading(false);
      }
      await loadSavedCharts();
    })();
    // eslint-disable-next-line
  }, [kpiId]);

  async function loadSavedCharts() {
    setLoadingCharts(true);
    try {
      const res = await api.get(`/kpis/${encodeURIComponent(kpiId)}/charts`);
      const list = Array.isArray(res.data) ? res.data : [];
      list.sort((a, b) => {
        const ta = a.updatedAt || a.createdAt || "";
        const tb = b.updatedAt || b.createdAt || "";
        return tb.localeCompare(ta);
      });
      setSavedCharts(list);
      if (list.length > 0) {
        const first = list[0];
        setSelectedChartId(first.id);
        applyChartConfig(first.config || {});
      } else {
        const h0 = parsed.headers && parsed.headers[0] ? parsed.headers[0] : "";
        const h1 = parsed.headers && parsed.headers[1] ? parsed.headers[1] : "";
        applyChartConfig({
          chartType: "line",
          xHeader: h0,
          yHeaders: h1 ? [h1] : [],
          dateFrom: "",
          dateTo: "",
          yMin: null,
          yMax: null,
        });
      }
    } catch (err) {
      console.error("Failed to load saved charts", err);
      setSavedCharts([]);
    } finally {
      setLoadingCharts(false);
    }
  }

  function applyChartConfig(cfg = {}) {
    setChartCfg(cfg || {});
    setFromDateISO(cfg.dateFrom || "");
    setToDateISO(cfg.dateTo || "");
  }

  const xHeader = chartCfg?.xHeader || (parsed.headers[0] || "");
  const yHeaders = Array.isArray(chartCfg?.yHeaders) ? chartCfg.yHeaders : (parsed.headers[1] ? [parsed.headers[1]] : []);
  const chartType = chartCfg?.chartType || "line";
  const yMin = chartCfg?.yMin ?? "";
  const yMax = chartCfg?.yMax ?? "";

  const xIsDateLike = useMemo(() => {
    if (!xHeader) return false;
    const idx = parsed.headers.indexOf(xHeader);
    if (idx === -1) return false;
    const samples = [];
    for (let r = 0; r < parsed.rows.length && samples.length < 12; r++) {
      const v = parsed.rows[r][idx];
      if (v !== undefined && v !== null && String(v).trim() !== "") samples.push(v);
    }
    if (samples.length === 0) return /date/i.test(xHeader);
    let ok = 0;
    for (const s of samples) if (parseDateLenient(s)) ok++;
    return ok >= Math.ceil(samples.length / 2);
  }, [xHeader, parsed]);

  const chartData = useMemo(() => {
    if (!xHeader || !Array.isArray(yHeaders) || yHeaders.length === 0) return [];
    const idxMap = {};
    parsed.headers.forEach((h, i) => (idxMap[h] = i));
    const xIdx = idxMap[xHeader];
    if (xIdx === undefined) return [];
    const fromD = fromDateISO ? parseDateLenient(fromDateISO) : null;
    const toD = toDateISO ? parseDateLenient(toDateISO) : null;

    const out = [];
    for (let r = 0; r < parsed.rows.length; r++) {
      const row = parsed.rows[r];
      const rawX = row[xIdx];
      if (xIsDateLike) {
        const d = parseDateLenient(rawX);
        if (!d) continue;
        if (fromD && d < fromD) continue;
        if (toD && d > toD) continue;
        const obj = { x: formatDateLabel(d), xDate: d.getTime() };
        let any = false;
        for (const yh of yHeaders) {
          const yi = idxMap[yh];
          const rawY = yi >= 0 ? row[yi] : null;
          const n = rawY === null || rawY === undefined || rawY === "" ? null : Number(String(rawY).replace(/,/g, ""));
          obj[yh] = Number.isFinite(n) ? n : null;
          if (obj[yh] !== null) any = true;
        }
        if (!any) continue;
        out.push(obj);
      } else {
        let xVal = rawX;
        const maybeNum = Number(String(rawX).replace(/,/g, ""));
        if (!Number.isNaN(maybeNum)) xVal = maybeNum;
        const obj = { x: xVal };
        let any = false;
        for (const yh of yHeaders) {
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
    if (xIsDateLike) out.sort((a, b) => (a.xDate || 0) - (b.xDate || 0));
    return out;
  }, [xHeader, yHeaders, parsed, xIsDateLike, fromDateISO, toDateISO]);

  const yAxisDomain = useMemo(() => {
    const min = yMin === "" || yMin === null ? undefined : Number(yMin);
    const max = yMax === "" || yMax === null ? undefined : Number(yMax);
    if ((min !== undefined && Number.isNaN(min)) || (max !== undefined && Number.isNaN(max))) return undefined;
    if (min !== undefined && max !== undefined) return [min, max];
    if (min !== undefined) return [min, "dataMax"];
    if (max !== undefined) return ["dataMin", max];
    return undefined;
  }, [yMin, yMax]);

  const refMin = yMin === "" || yMin === null ? null : Number(yMin);
  const refMax = yMax === "" || yMax === null ? null : Number(yMax);
  const showRefMin = refMin !== null && Number.isFinite(refMin);
  const showRefMax = refMax !== null && Number.isFinite(refMax);

  /* ---------- read-only actions list for right column ---------- */
  const [actions, setActions] = useState([]);
  const [loadingActions, setLoadingActions] = useState(false);

  useEffect(() => {
    if (kpi) loadActions();
    // eslint-disable-next-line
  }, [kpi]);

  async function loadActions() {
    setLoadingActions(true);
    try {
      const res = await api.get(`/kpis/${encodeURIComponent(kpiId)}/actions`);
      setActions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load actions", err);
      setActions([]);
    } finally {
      setLoadingActions(false);
    }
  }

  /* ---------- export helpers: hide scrollbars and pad bottom to include brush ---------- */
  async function withHiddenScrollbars(fn) {
    const prevDocOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevContainerPad = containerRef.current ? containerRef.current.style.paddingBottom : "";
    try {
      // hide scrollbars that might overlap canvas
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      // leave extra bottom space so the brush and ticks aren't rendered over text in capture
      if (containerRef.current) containerRef.current.style.paddingBottom = "120px";
      await fn();
    } finally {
      document.documentElement.style.overflow = prevDocOverflow;
      document.body.style.overflow = prevBodyOverflow;
      if (containerRef.current) containerRef.current.style.paddingBottom = prevContainerPad || "";
    }
  }

  async function exportPNG() {
    if (!containerRef.current) return;
    try {
      await withHiddenScrollbars(async () => {
        const canvas = await html2canvas(containerRef.current, { scale: 2, useCORS: true });
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `${kpi?.name || "kpi"}-presentation.png`;
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
        const canvas = await html2canvas(containerRef.current, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "landscape" });
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${kpi?.name || "kpi"}-presentation.pdf`);
      });
    } catch (err) {
      console.error("Export PDF failed", err);
      alert("Export PDF failed");
    }
  }

  /* ---------- fullscreen controls ---------- */
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

  if (loading) {
    return <div className="p-6 max-w-6xl mx-auto">Loading presentation...</div>;
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div ref={containerRef} className="max-w-7xl mx-auto bg-white rounded" style={{ padding: 8 }}>
        {/* Top toolbar */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <button className="text-sm text-blue-600 mb-2" onClick={() => navigate(-1)}>← Back</button>
            <h1 className="text-2xl font-bold">{kpi?.name}</h1>
            {kpi?.description && <div className="text-sm text-slate-600 mt-1">{kpi.description}</div>}
            <div className="text-xs text-slate-400 mt-2">Owner: {kpi?.owner || "—"}</div>
          </div>

          <div className="flex gap-3 items-center">
            <select
              value={selectedChartId || ""}
              onChange={async (e) => {
                const id = e.target.value || null;
                setSelectedChartId(id);
                if (!id) {
                  applyChartConfig({});
                  return;
                }
                let chosen = savedCharts.find(s => s.id === id);
                if (!chosen) {
                  await loadSavedCharts();
                  chosen = savedCharts.find(s => s.id === id);
                }
                if (chosen) {
                  setChartCfg(chosen.config || {});
                  applyChartConfig(chosen.config || {});
                }
              }}
              className="p-2 border rounded"
            >
              <option value="">{loadingCharts ? "Loading charts..." : "Saved charts (choose) —"}</option>
              {savedCharts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {isFullscreen ? (
              <button onClick={exitFullscreen} className="px-3 py-1 bg-slate-100 rounded">Exit Fullscreen</button>
            ) : (
              <button onClick={enterFullscreen} className="px-3 py-1 bg-slate-100 rounded">Enter Fullscreen</button>
            )}

            <button onClick={exportPNG} className="px-3 py-1 bg-emerald-600 text-white rounded">Export PNG</button>
            <button onClick={exportPDF} className="px-3 py-1 bg-blue-600 text-white rounded">Export PDF</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart column */}
          <div className="lg:col-span-2 bg-white p-4 rounded shadow-sm">
            {/* Date pickers placed near chart (always visible when x looks like date) */}
            {xIsDateLike && (
              <div className="mb-3 flex gap-4 items-center">
                <div>
                  <div className="text-xs text-slate-500">From</div>
                  <input type="date" value={fromDateISO} onChange={(e) => setFromDateISO(e.target.value)} className="p-2 border rounded" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">To</div>
                  <input type="date" value={toDateISO} onChange={(e) => setToDateISO(e.target.value)} className="p-2 border rounded" />
                </div>
                <div className="text-sm text-slate-500 ml-3">Date filter uses parsed dates from selected chart.</div>
              </div>
            )}

            <div style={{ width: "100%", height: isFullscreen ? "78vh" : "62vh" }} className="border rounded p-2">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "line" ? (
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 16, left: 8, bottom: 120 }} // plenty of bottom space for brush & labels
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="x"
                      interval="preserveStartEnd"
                      padding={{ left: 20, right: 20 }}
                      tick={{ fontSize: 11 }}
                      tickMargin={12}
                      height={48}
                      label={xHeader ? { value: xHeader, position: "bottom", offset: 56 } : null}
                    />
                    <YAxis domain={yAxisDomain} />
                    <Tooltip />
                    <Legend />
                    {showRefMin && <ReferenceLine y={refMin} stroke="#1f77b4" strokeDasharray="4 4" label={{ value: `Min: ${refMin}`, position: "insideTopLeft", fill: "#1f77b4" }} />}
                    {showRefMax && <ReferenceLine y={refMax} stroke="#d62728" strokeDasharray="4 4" label={{ value: `Max: ${refMax}`, position: "insideTopLeft", fill: "#d62728" }} />}
                    {yHeaders.map((yh, idx) => (
                      <Line key={yh} type="monotone" dataKey={yh} stroke={["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"][idx % 5]} dot={{ r: 2 }} connectNulls />
                    ))}
                    <Brush dataKey="x" height={40} stroke="#8884d8" travellerWidth={10} />
                  </LineChart>
                ) : (
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 16, left: 8, bottom: 120 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="x"
                      interval="preserveStartEnd"
                      padding={{ left: 20, right: 20 }}
                      tick={{ fontSize: 11 }}
                      tickMargin={12}
                      height={48}
                      label={xHeader ? { value: xHeader, position: "bottom", offset: 56 } : null}
                    />
                    <YAxis domain={yAxisDomain} />
                    <Tooltip />
                    <Legend />
                    {showRefMin && <ReferenceLine y={refMin} stroke="#1f77b4" strokeDasharray="4 4" label={{ value: `Min: ${refMin}`, position: "insideTopLeft", fill: "#1f77b4" }} />}
                    {showRefMax && <ReferenceLine y={refMax} stroke="#d62728" strokeDasharray="4 4" label={{ value: `Max: ${refMax}`, position: "insideTopLeft", fill: "#d62728" }} />}
                    {yHeaders.map((yh, idx) => <Bar key={yh} dataKey={yh} fill={["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"][idx % 5]} />)}
                    <Brush dataKey="x" height={40} stroke="#8884d8" travellerWidth={10} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right column: Action plan + metadata - read-only */}
          <div className="bg-white p-4 rounded shadow-sm">
            <h3 className="font-semibold mb-2">Action Taken / Action Plan</h3>
            {loadingActions ? (
              <div className="text-sm text-slate-500">Loading actions...</div>
            ) : (
              <div className="space-y-2">
                {actions.length === 0 ? (
                  <div className="text-sm text-slate-500">No action plan yet.</div>
                ) : (
                  <ol className="list-decimal ml-4 text-sm">
                    {actions.map((a) => (
                      <li key={a.id} className="mb-2">
                        <div className="font-medium">{a.description}</div>
                        <div className="text-xs text-slate-500">Deadline: {a.deadline || "—"} • Responsibility: {a.responsibility || "—"} • Status: {a.status}</div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            <div className="mt-4 border-t pt-3">
              <h4 className="text-sm font-medium mb-2">KPI Details</h4>
              <div className="text-sm"><strong>Owner:</strong> {kpi?.owner || "—"}</div>
              <div className="text-sm"><strong>Created:</strong> {kpi?.createdAt ? new Date(kpi.createdAt).toLocaleString() : "—"}</div>
              <div className="text-sm mt-2"><strong>Attributes:</strong> {Array.isArray(kpi?.attributes) ? kpi.attributes.length : 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
