import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import KpiCard from "../components/KpiCard";
import EditableTableModal from "../components/EditableTableModal";
import ChartBuilderModal from "../components/ChartBuilderModal";

function LoadingBox({ text = "Loading..." }) {
  return <div className="p-4 bg-white dark:bg-gray-800 rounded shadow-sm text-sm text-slate-500 dark:text-gray-400">{text}</div>;
}

// A single line (row) that expands inline to show the full KpiCard
function KpiRow({ kpi, open, onToggle, onAfterChange, plantId }) { // Added plantId prop
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
      {/* Row header (clickable) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggle(kpi.id)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onToggle(kpi.id); }}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-gray-700 rounded-t-lg cursor-pointer"
        aria-expanded={open}
      >
        <span
          className={`inline-block transition-transform duration-200 text-slate-500 dark:text-gray-400 ${open ? "rotate-90" : ""}`}
          aria-hidden
        >
          ▶
        </span>

        <div className="flex-1">
          <div className="font-semibold text-slate-800 dark:text-white">{kpi.name}</div>
          <div className="text-xs text-slate-500 dark:text-gray-400">
            Owner: {kpi.owner || "—"} • {kpi.createdAt ? new Date(kpi.createdAt).toLocaleString() : "—"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-gray-500">ID</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(kpi.id);
            }}
            className="px-2 py-1 text-sm bg-blue-600 text-white rounded"
            aria-pressed={open}
          >
            {open ? "Close" : "Open"}
          </button>
        </div>
      </div>

      {/* Expanded area */}
      {open && (
        <div className="px-4 pb-4">
          <KpiCard
            kpi={kpi}
            plantId={plantId} // Pass plantId to KpiCard
            onUploadSuccess={() => onAfterChange?.(kpi.id)}
            onSaved={() => onAfterChange?.(kpi.id)}
          />
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { plantId } = useParams();
  const navigate = useNavigate();

  const [plantName, setPlantName] = useState("");
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);

  // track which KPI row is expanded (allow only one open at a time)
  const [openKpiId, setOpenKpiId] = useState(null);

  // modals (triggered by KpiCard "Edit Rows" / "Create Chart")
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [activeKpiId, setActiveKpiId] = useState(null);
  const [activeHeaders, setActiveHeaders] = useState([]);
  const [activeRows, setActiveRows] = useState([]);

  useEffect(() => {
    fetchKpis();

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
      // Fetch basic KPIs
      const res = await api.get(`/kpis/plant/${encodeURIComponent(plantId)}`);
      const basicKpis = res.data || [];

      // Fetch full details for each KPI (parallel)
      const fullKpisPromises = basicKpis.map(kpi => 
        api.get(`/kpis/${encodeURIComponent(kpi.id)}`).then(r => ({ ...r.data, ...kpi }))
      );
      const fullKpis = await Promise.all(fullKpisPromises);
      setKpis(fullKpis);

      // If currently open KPI was removed, collapse
      if (openKpiId && !fullKpis.find((k) => k.id === openKpiId)) {
        setOpenKpiId(null);
      }

      // fetch plant name for header
      const pRes = await api.get("/plants");
      const found = (pRes.data || []).find((p) => p.id === plantId);
      setPlantName(found ? found.name : "");
    } catch (err) {
      console.error("Failed to load KPIs", err);
      setKpis([]);
    } finally {
      setLoading(false);
    }
  }

  // load full parsed data via existing preview API
  async function loadFullData(kpiId) {
    try {
      const res = await api.get(`/uploads/${encodeURIComponent(kpiId)}/preview?limit=999999`);
      return res.data; // { headers, rows, totalRows }
    } catch (err) {
      console.error("Failed to load full data", err);
      return null;
    }
  }

  // open edit modal for KPI (set active id first)
  async function openEditForKpi(kpiId) {
    setActiveKpiId(kpiId);
    const parsed = await loadFullData(kpiId);

    if (!parsed) {
      setActiveKpiId(null);
      return alert("No uploaded data found for editing");
    }
    setActiveHeaders(parsed.headers || []);
    setActiveRows(parsed.rows || []);
    setEditModalOpen(true);
  }

  // open chart modal for KPI (set active id first so modal can fetch/save)
  async function openChartForKpi(kpiId) {
    setActiveKpiId(kpiId);
    const parsed = await loadFullData(kpiId);
    if (!parsed) {
      setActiveKpiId(null);
      return alert("No uploaded data found for charting");
    }
    setActiveHeaders(parsed.headers || []);
    setActiveRows(parsed.rows || []);
    setChartModalOpen(true);
  }

  async function handleSaveEditedData(kpiId, headers, rows) {
    try {
      await api.put(`/kpis/${encodeURIComponent(kpiId)}/data`, { headers, rows });
      alert("Saved successfully");
      setEditModalOpen(false);
      fetchKpis(); // refresh KPI list / previews
    } catch (err) {
      console.error("Save failed", err);
      alert(err?.response?.data?.error || err.message || "Save failed");
    }
  }

  const handleBackClick = () => {
    const confirmLogout = window.confirm(
      "You are currently logged in. Do you want to logout and go to the home page?"
    );
    
    if (confirmLogout) {
      // User confirmed - logout and go to home
      localStorage.removeItem(`kpi-auth-${plantId}`);
      localStorage.removeItem("kpi-current-plant");
      
      // Notify other components of login state change
      window.dispatchEvent(new CustomEvent('loginStateChanged'));
      
      window.location.href = "/";
    }
    // If user cancels, do nothing - stay on current page
  };

  function toggleRow(id) {
    setOpenKpiId((cur) => (cur === id ? null : id));
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <button onClick={handleBackClick} className="text-sm text-blue-600 dark:text-blue-400 mr-3">
            ← Back
          </button>
        </div>

        <div className="flex gap-3">
          {/* Daily Entry */}
          <button
            onClick={() => navigate(`/plant/${encodeURIComponent(plantId)}/daily-entry`)}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Daily Entry
          </button>

          {/* KPI Edit - opens KPI editor workspace/page */}
          <button
            onClick={() => navigate(`/plant/${encodeURIComponent(plantId)}/kpi-edit`)}
            className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            title="Open KPI editor (attributes, actions, preview, charts)"
          >
            Manage KPI
          </button>

          {/* Presentation Deck button */}
          <button
            onClick={() => navigate(`/plant/${encodeURIComponent(plantId)}/presentation-overview`)}
            className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Presentation
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">KPIs — {plantName || "Plant"}</h1>
      <p className="text-sm text-slate-600 dark:text-gray-400 mb-4">
        All KPIs are listed line-wise. Click a row to open its full actions inline.
      </p>

      {loading ? (
        <LoadingBox />
      ) : kpis.length === 0 ? (
        <div className="p-4 bg-white dark:bg-gray-800 rounded shadow-sm text-slate-500 dark:text-gray-400">No KPIs yet. Create one to begin.</div>
      ) : (
        <div className="space-y-3">
          {kpis.map((kpi) => (
            <KpiRow
              key={kpi.id}
              kpi={kpi}
              plantId={plantId} // Pass plantId to KpiRow
              open={openKpiId === kpi.id}
              onToggle={toggleRow}
              onAfterChange={() => fetchKpis()}
            />
          ))}
        </div>
      )}

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
        kpiId={activeKpiId}
        headers={activeHeaders}
        rows={activeRows}
        onSaved={() => {
          fetchKpis();
          setChartModalOpen(false);
        }}
      />
    </div>
  );
}