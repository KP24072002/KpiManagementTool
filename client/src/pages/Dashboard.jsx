
// // client/src/pages/Dashboard.jsx
// import React, { useEffect, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import api from "../utils/api";
// import KpiCard from "../components/KpiCard";
// import EditableTableModal from "../components/EditableTableModal";
// import ChartBuilderModal from "../components/ChartBuilderModal";

// function LoadingBox({ text = "Loading..." }) {
//   return <div className="p-4 bg-white rounded shadow-sm text-sm text-slate-500">{text}</div>;
// }

// // A single line (row) that expands inline to show the full KpiCard
// function KpiRow({ kpi, open, onToggle, onAfterChange }) {
//   // Important: do NOT use <button> as the outer clickable wrapper because we have
//   // an inner <button> (Open). Using a div[role="button"] prevents nested-button HTML errors.
//   return (
//     <div className="bg-white rounded-lg shadow-sm border">
//       {/* Row header (clickable) */}
//       <div
//         role="button"
//         tabIndex={0}
//         onClick={() => onToggle(kpi.id)}
//         onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onToggle(kpi.id); }}
//         className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 rounded-t-lg cursor-pointer"
//         aria-expanded={open}
//       >
//         <span
//           className={`inline-block transition-transform duration-200 text-slate-500 ${open ? "rotate-90" : ""}`}
//           aria-hidden
//         >
//           ▶
//         </span>

//         <div className="flex-1">
//           <div className="font-semibold">{kpi.name}</div>
//           <div className="text-xs text-slate-500">
//             Owner: {kpi.owner || "—"} • {kpi.createdAt ? new Date(kpi.createdAt).toLocaleString() : "—"}
//           </div>
//         </div>

//         <div className="flex items-center gap-2">
//           <span className="text-xs text-slate-400">ID</span>
//           {/* This is an actual button inside the header - allowed now because outer is not a <button> */}
//           <button
//             onClick={(e) => {
//               e.stopPropagation();
//               onToggle(kpi.id);
//             }}
//             className="px-2 py-1 text-sm bg-blue-600 text-white rounded"
//             aria-pressed={open}
//           >
//             {open ? "Close" : "Open"}
//           </button>
//         </div>
//       </div>

//       {/* Expanded area */}
//       {open && (
//         <div className="px-4 pb-4">
//           <KpiCard
//             kpi={kpi}
//             onUploadSuccess={() => onAfterChange?.(kpi.id)}
//             onSaved={() => onAfterChange?.(kpi.id)}
//           />
//         </div>
//       )}
//     </div>
//   );
// }

// export default function Dashboard() {
//   const { plantId } = useParams();
//   const navigate = useNavigate();

//   const [plantName, setPlantName] = useState("");
//   const [kpis, setKpis] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // track which KPI row is expanded (allow only one open at a time)
//   const [openKpiId, setOpenKpiId] = useState(null);

//   // modals (triggered by KpiCard "Edit Rows" / "Create Chart")
//   const [editModalOpen, setEditModalOpen] = useState(false);
//   const [chartModalOpen, setChartModalOpen] = useState(false);
//   const [activeKpiId, setActiveKpiId] = useState(null);
//   const [activeHeaders, setActiveHeaders] = useState([]);
//   const [activeRows, setActiveRows] = useState([]);

//   useEffect(() => {
//     fetchKpis();

//     function openEditHandler(e) {
//       openEditForKpi(e.detail.kpiId);
//     }
//     function openChartHandler(e) {
//       openChartForKpi(e.detail.kpiId);
//     }
//     window.addEventListener("openEdit", openEditHandler);
//     window.addEventListener("openChart", openChartHandler);
//     return () => {
//       window.removeEventListener("openEdit", openEditHandler);
//       window.removeEventListener("openChart", openChartHandler);
//     };
//     // eslint-disable-next-line
//   }, [plantId]);

//   async function fetchKpis() {
//     setLoading(true);
//     try {
//       const res = await api.get(`/kpis/plant/${encodeURIComponent(plantId)}`);
//       const list = res.data || [];
//       setKpis(list);

//       // If currently open KPI was removed, collapse
//       if (openKpiId && !list.find((k) => k.id === openKpiId)) {
//         setOpenKpiId(null);
//       }

//       // fetch plant name for header
//       const pRes = await api.get("/plants");
//       const found = (pRes.data || []).find((p) => p.id === plantId);
//       setPlantName(found ? found.name : "");
//     } catch (err) {
//       console.error("Failed to load KPIs", err);
//       setKpis([]);
//     } finally {
//       setLoading(false);
//     }
//   }

//   // load full parsed data via existing preview API
//   async function loadFullData(kpiId) {
//     try {
//       const res = await api.get(`/uploads/${encodeURIComponent(kpiId)}/preview?limit=999999`);
//       return res.data; // { headers, rows, totalRows }
//     } catch (err) {
//       console.error("Failed to load full data", err);
//       return null;
//     }
//   }

//   // open edit modal for KPI (set active id first)
//   async function openEditForKpi(kpiId) {
//     setActiveKpiId(kpiId);
//     const parsed = await loadFullData(kpiId);

//     if (!parsed) {
//       setActiveKpiId(null);
//       return alert("No uploaded data found for editing");
//     }
//     setActiveHeaders(parsed.headers || []);
//     setActiveRows(parsed.rows || []);
//     setEditModalOpen(true);
//   }

//   // open chart modal for KPI (set active id first so modal can fetch/save)
//   async function openChartForKpi(kpiId) {
//     setActiveKpiId(kpiId); // important: pass KPI id to modal before opening
//     const parsed = await loadFullData(kpiId);
//     if (!parsed) {
//       setActiveKpiId(null);
//       return alert("No uploaded data found for charting");
//     }
//     setActiveHeaders(parsed.headers || []);
//     setActiveRows(parsed.rows || []);
//     setChartModalOpen(true);
//   }

//   async function handleSaveEditedData(kpiId, headers, rows) {
//     try {
//       await api.put(`/kpis/${encodeURIComponent(kpiId)}/data`, { headers, rows });
//       alert("Saved successfully");
//       setEditModalOpen(false);
//       fetchKpis(); // refresh KPI list / previews
//     } catch (err) {
//       console.error("Save failed", err);
//       alert(err?.response?.data?.error || err.message || "Save failed");
//     }
//   }

//   function toggleRow(id) {
//     setOpenKpiId((cur) => (cur === id ? null : id));
//   }

//   return (
//     <div className="p-6 max-w-5xl mx-auto">
//       <div className="flex items-center justify-between mb-5">
//         <div>
//           <button onClick={() => navigate(-1)} className="text-sm text-blue-600 mr-3">
//             ← Back
//           </button>
//         </div>

//         <div className="flex gap-3">
//           <button
//             onClick={() => navigate(`/plant/${encodeURIComponent(plantId)}/kpi-create`)}
//             className="px-3 py-2 bg-green-600 text-white rounded"
//           >
//             Create KPI
//           </button>

//           {/* Daily Entry - NEW */}
//           <button
//             onClick={() => navigate(`/plant/${encodeURIComponent(plantId)}/daily-entry`)}
//             className="px-3 py-2 bg-blue-600 text-white rounded"
//           >
//             Daily Entry
//           </button>

//           {/* Presentation Deck button: navigates to the deck route for this plant */}
//           <button
//             onClick={() =>  navigate(`/plant/${encodeURIComponent(plantId)}/presentation-overview`)}
//             className="px-3 py-2 bg-indigo-600 text-white rounded"
//           >
//             Presentation
//           </button>
//         </div>
//       </div>

//       <h1 className="text-2xl font-bold mb-2">KPIs — {plantName || "Plant"}</h1>
//       <p className="text-sm text-slate-600 mb-4">
//         All KPIs are listed line-wise. Click a row to open its full actions inline.
//       </p>

//       {loading ? (
//         <LoadingBox />
//       ) : kpis.length === 0 ? (
//         <div className="p-4 bg-white rounded shadow-sm">No KPIs yet. Create one to begin.</div>
//       ) : (
//         <div className="space-y-3">
//           {kpis.map((kpi) => (
//             <KpiRow
//               key={kpi.id}
//               kpi={kpi}
//               open={openKpiId === kpi.id}
//               onToggle={toggleRow}
//               onAfterChange={() => fetchKpis()}
//             />
//           ))}
//         </div>
//       )}

//       {/* Edit modal */}
//       <EditableTableModal
//         open={editModalOpen}
//         onClose={() => setEditModalOpen(false)}
//         headers={activeHeaders}
//         rows={activeRows}
//         onSave={(h, r) => handleSaveEditedData(activeKpiId, h, r)}
//       />

//       {/* Chart modal - pass kpiId so modal can load/save configs for that KPI */}
//       <ChartBuilderModal
//         open={chartModalOpen}
//         onClose={() => setChartModalOpen(false)}
//         kpiId={activeKpiId}
//         headers={activeHeaders}
//         rows={activeRows}
//         onSaved={() => {
//           // refresh kpi list and close modal (feel free to keep open if you prefer)
//           fetchKpis();
//           // optionally close modal after save:
//           setChartModalOpen(false);
//         }}
//       />
//     </div>
//   );
// }


// client/src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import KpiCard from "../components/KpiCard";
import EditableTableModal from "../components/EditableTableModal";
import ChartBuilderModal from "../components/ChartBuilderModal";

function LoadingBox({ text = "Loading..." }) {
  return <div className="p-4 bg-white rounded shadow-sm text-sm text-slate-500">{text}</div>;
}

// A single line (row) that expands inline to show the full KpiCard
function KpiRow({ kpi, open, onToggle, onAfterChange }) {
  // Important: do NOT use <button> as the outer clickable wrapper because we have
  // an inner <button> (Open). Using a div[role="button"] prevents nested-button HTML errors.
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Row header (clickable) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggle(kpi.id)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onToggle(kpi.id); }}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 rounded-t-lg cursor-pointer"
        aria-expanded={open}
      >
        <span
          className={`inline-block transition-transform duration-200 text-slate-500 ${open ? "rotate-90" : ""}`}
          aria-hidden
        >
          ▶
        </span>

        <div className="flex-1">
          <div className="font-semibold">{kpi.name}</div>
          <div className="text-xs text-slate-500">
            Owner: {kpi.owner || "—"} • {kpi.createdAt ? new Date(kpi.createdAt).toLocaleString() : "—"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">ID</span>
          {/* This is an actual button inside the header - allowed now because outer is not a <button> */}
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
      const res = await api.get(`/kpis/plant/${encodeURIComponent(plantId)}`);
      const list = res.data || [];
      setKpis(list);

      // If currently open KPI was removed, collapse
      if (openKpiId && !list.find((k) => k.id === openKpiId)) {
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
    setActiveKpiId(kpiId); // important: pass KPI id to modal before opening
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

  function toggleRow(id) {
    setOpenKpiId((cur) => (cur === id ? null : id));
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600 mr-3">
            ← Back
          </button>
        </div>

        <div className="flex gap-3">
          {/* <button
            onClick={() => navigate(`/plant/${encodeURIComponent(plantId)}/kpi-create`)}
            className="px-3 py-2 bg-green-600 text-white rounded"
          >
            Create KPI
          </button> */}
            


             {/* Daily Entry */}
            <button
            onClick={() => navigate(`/plant/${encodeURIComponent(plantId)}/daily-entry`)}
            className="px-3 py-2 bg-blue-600 text-white rounded"
          >
            Daily Entry
          </button>

          {/* KPI Edit - NEW: opens KPI editor workspace/page */}
          <button
            onClick={() => navigate(`/plant/${encodeURIComponent(plantId)}/kpi-edit`)}
            className="px-3 py-2 bg-yellow-600 text-white rounded"
            title="Open KPI editor (attributes, actions, preview, charts)"
          >
            Manage KPI
          </button>

         
         

          {/* Presentation Deck button: navigates to the deck route for this plant */}
          <button
            onClick={() =>  navigate(`/plant/${encodeURIComponent(plantId)}/presentation-overview`)}
            className="px-3 py-2 bg-indigo-600 text-white rounded"
          >
            Presentation
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-2">KPIs — {plantName || "Plant"}</h1>
      <p className="text-sm text-slate-600 mb-4">
        All KPIs are listed line-wise. Click a row to open its full actions inline.
      </p>

      {loading ? (
        <LoadingBox />
      ) : kpis.length === 0 ? (
        <div className="p-4 bg-white rounded shadow-sm">No KPIs yet. Create one to begin.</div>
      ) : (
        <div className="space-y-3">
          {kpis.map((kpi) => (
            <KpiRow
              key={kpi.id}
              kpi={kpi}
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

      {/* Chart modal - pass kpiId so modal can load/save configs for that KPI */}
      <ChartBuilderModal
        open={chartModalOpen}
        onClose={() => setChartModalOpen(false)}
        kpiId={activeKpiId}
        headers={activeHeaders}
        rows={activeRows}
        onSaved={() => {
          // refresh kpi list and close modal (feel free to keep open if you prefer)
          fetchKpis();
          // optionally close modal after save:
          setChartModalOpen(false);
        }}
      />
    </div>
  );
}
