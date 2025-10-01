import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import ActionPlans from "./ActionPlans";
import PreviewTable from "./PreviewTable";
import TargetRevisions from "./TargetRevisions";

function LoadingBox({ text = "Loading..." }) {
  return (
    <div className="p-3 bg-white dark:bg-gray-800 rounded shadow text-center text-slate-500 dark:text-gray-400 text-sm">
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

export default function KpiCard({ kpi, plantId }) {
  const navigate = useNavigate();
  const [preview, setPreview] = useState({ headers: [], rows: [] });
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [kpiData, setKpiData] = useState(null);
  const [actionsCount, setActionsCount] = useState(0);
  const [loadingKpi, setLoadingKpi] = useState(false);

  useEffect(() => {
    if (kpi?.id && plantId) {
      fetchKpiData(kpi.id);
      fetchPreview(kpi.id);
      fetchActionsCount(kpi.id);
    }
  }, [kpi?.id, plantId]);

  async function fetchKpiData(kpiId) {
    setLoadingKpi(true);
    try {
      const res = await api.get(`/kpis/${encodeURIComponent(kpiId)}`);
      setKpiData(res.data || {});
    } catch (err) {
      console.error("Failed to load KPI data", err);
      setKpiData(kpi); // Fallback to prop data
    } finally {
      setLoadingKpi(false);
    }
  }

  async function fetchPreview(kpiId) {
    setLoadingPreview(true);
    try {
      const res = await api.get(`/uploads/${encodeURIComponent(kpiId)}/preview?limit=5`);
      setPreview(res.data || { headers: [], rows: [] });
    } catch (err) {
      console.error("Failed to load preview", err);
      setPreview({ headers: [], rows: [] });
    } finally {
      setLoadingPreview(false);
    }
  }

  async function fetchActionsCount(kpiId) {
    try {
      const res = await api.get(`/kpis/${encodeURIComponent(kpiId)}/actions`);
      setActionsCount(Array.isArray(res.data) ? res.data.length : 0);
    } catch (err) {
      console.error("Failed to load actions count", err);
      setActionsCount(0);
    }
  }

  const displayKpi = kpiData || kpi; // Use fetched data if available, else fallback to prop

  return (
    <div className="p-5 bg-white dark:bg-gray-800 rounded-lg shadow-md space-y-6">
      {/* KPI Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white">{displayKpi?.name || "—"}</h2>
          <span className="px-3 py-1 text-xs bg-slate-100 dark:bg-gray-700 rounded text-slate-800 dark:text-white">
            {normalizeAction(displayKpi?.action).toUpperCase()}
          </span>
        </div>
        <p className="text-slate-600 dark:text-gray-300 mt-1 text-sm">{displayKpi?.description || "No description"}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
          <div>
            <div className="text-slate-500 dark:text-gray-400">Owner</div>
            <div className="font-medium text-slate-800 dark:text-white">{displayKpi?.owner || "—"}</div>
          </div>
          <div>
            <div className="text-slate-500 dark:text-gray-400">Present Value</div>
            <div className="font-medium text-slate-800 dark:text-white">{displayKpi?.presentValue ?? "—"} {displayKpi?.unit || ""}</div>
          </div>
          <div>
            <div className="text-slate-500 dark:text-gray-400">Target</div>
            <div className="font-medium text-slate-800 dark:text-white">
              {displayKpi?.action === "maintain"
                ? `${displayKpi?.targetLowerValue ?? "—"} — ${displayKpi?.targetUpperValue ?? "—"}`
                : displayKpi?.action === "maximize"
                ? displayKpi?.targetUpperValue ?? "—"
                : displayKpi?.action === "minimize"
                ? displayKpi?.targetLowerValue ?? "—"
                : displayKpi?.targetValue ?? "—"}
              {displayKpi?.unit ? ` ${displayKpi.unit}` : ""}
            </div>
          </div>
          <div>
            <div className="text-slate-500 dark:text-gray-400">Deadline</div>
            <div className="font-medium text-slate-800 dark:text-white">{displayKpi?.deadline ? formatDateDisplay(displayKpi.deadline) : "—"}</div>
          </div>
        </div>
      </div>

      {/* Target Revisions Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-700 dark:text-white">Target Revisions</h3>
          <span className="text-xs text-slate-500 dark:text-gray-400">
            Total: {Array.isArray(displayKpi?.targetRevisions) ? displayKpi.targetRevisions.length : 0}
          </span>
        </div>
        {loadingKpi ? (
          <LoadingBox text="Loading KPI data..." />
        ) : (
          <div className="overflow-auto border rounded text-sm border-gray-200 dark:border-gray-700">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left text-slate-700 dark:text-gray-300">Sr. No</th>
                  <th className="px-3 py-2 text-left text-slate-700 dark:text-gray-300">Target Value</th>
                  <th className="px-3 py-2 text-left text-slate-700 dark:text-gray-300">Revision Date</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(displayKpi?.targetRevisions) && displayKpi.targetRevisions.length > 0 ? (
                  displayKpi.targetRevisions.map((rev, idx) => (
                    <tr key={rev.id} className={idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-slate-50 dark:bg-gray-700"}>
                      <td className="px-3 py-2 text-slate-800 dark:text-white">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-800 dark:text-white">
                        {rev.targetValue ?? (rev.targetLowerValue || rev.targetUpperValue ? `${rev.targetLowerValue ?? "—"} — ${rev.targetUpperValue ?? "—"}` : "—")}
                      </td>
                      <td className="px-3 py-2 text-slate-800 dark:text-white">{rev.revisionDate ? formatDateDisplay(rev.revisionDate) : "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-center text-slate-500 dark:text-gray-400">
                      No revisions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Data Preview */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-700 dark:text-white">Recent Data (first 5 rows)</h3>
          <button onClick={() => fetchPreview(kpi.id)} className="text-xs text-blue-600 hover:underline dark:text-blue-400">Refresh</button>
        </div>
        {loadingPreview ? (
          <LoadingBox text="Loading data..." />
        ) : preview && preview.rows.length > 0 ? (
          <PreviewTable headers={preview.headers} rows={preview.rows} />
        ) : (
          <div className="text-sm text-slate-500 dark:text-gray-400">No data uploaded yet.</div>
        )}
      </div>

      {/* Attributes Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-700 dark:text-white">Attributes (Cause Descriptions)</h3>
          <span className="text-xs text-slate-500 dark:text-gray-400">Total: {Array.isArray(displayKpi?.attributes) ? displayKpi.attributes.length : 0}</span>
        </div>
        {loadingKpi ? (
          <LoadingBox text="Loading KPI data..." />
        ) : (
          <div className="overflow-auto border rounded text-sm border-gray-200 dark:border-gray-700">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left text-slate-700 dark:text-gray-300">Sr. No</th>
                  <th className="px-3 py-2 text-left text-slate-700 dark:text-gray-300">Cause</th>
                  <th className="px-3 py-2 text-left text-slate-700 dark:text-gray-300">Count</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(displayKpi?.attributes) && displayKpi.attributes.length > 0 ? (
                  displayKpi.attributes.map((attr, idx) => (
                    <tr key={attr.id} className={idx % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-slate-50 dark:bg-gray-700"}>
                      <td className="px-3 py-2 text-slate-800 dark:text-white">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-800 dark:text-white">{attr.name}</td>
                      <td className="px-3 py-2 text-slate-800 dark:text-white">{attr.count ?? 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-center text-slate-500 dark:text-gray-400">No attributes yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Plans (Preview only) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-700 dark:text-white">Action Plans</h3>
          <span className="text-xs text-slate-500 dark:text-gray-400">Total: {actionsCount}</span>
        </div>
        <ActionPlans kpiId={kpi.id} readOnly={true} />
      </div>
    </div>
  );
}