import React from "react";

/**
 * KpiTile
 * Props:
 *  - name: string
 *  - fullText: string (description)
 *  - value: number | null
 *  - target: number | null
 *  - percent: number | null (0-100)
 *  - color: "green" | "yellow" | "red" | "gray"
 *  - unit: string
 *  - numDaysAchieved: integer
 *  - daysFilled: integer
 */

function clampPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function formatDisplayValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isFinite(num)) {
    return num % 1 === 0 ? String(num) : String(Number(num.toFixed(2)));
  }
  return String(value);
}

export default function KpiTile({
  name = "",
  fullText = "",
  value = null,
  target = null,
  percent = null,
  color = "gray",
  unit = "",
  numDaysAchieved = 0,
  daysFilled = 0
}) {
  const pct = clampPct(percent);

  const barColorClass =
    color === "green" ? "bg-green-600" :
    color === "yellow" ? "bg-yellow-500" :
    color === "red" ? "bg-red-600" :
    color === "blue" ? "bg-blue-600" :
    "bg-slate-400";

  const pctTextColor =
    color === "green" ? "text-green-800 dark:text-green-200" :
    color === "yellow" ? "text-yellow-800 dark:text-yellow-200" :
    color === "red" ? "text-red-800 dark:text-red-200" :
    color === "blue" ? "text-blue-800 dark:text-blue-200 font-bold" :
    "text-slate-700 dark:text-slate-300";

  const displayValue = formatDisplayValue(value);
  const displayTarget = formatDisplayValue(target);
  const percentLabel = percent == null || Number.isNaN(Number(percent)) ? "No target" : `${pct.toFixed(1)}%`;
  const achievedRate = daysFilled > 0 ? (numDaysAchieved / daysFilled * 100).toFixed(1) : "0.0";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 flex flex-col justify-between h-full min-h-[140px] overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-700 dark:text-white truncate">{name}</div>
          {fullText ? (
            <div className="text-xs text-slate-500 dark:text-gray-400 mt-1 max-w-[18rem] truncate">{fullText}</div>
          ) : null}
        </div>
        <div className="flex-shrink-0 ml-2">
          <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${pctTextColor} bg-slate-50 dark:bg-gray-700 border border-slate-100 dark:border-gray-600 whitespace-nowrap`}>
            {percentLabel}
          </div>
        </div>
      </div>

      {/* Main: large number + meta */}
      <div className="mt-2 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-2xl md:text-3xl lg:text-4xl font-extrabold leading-tight text-slate-900 dark:text-white break-words truncate">
            {displayValue}
          </div>
          <div className="text-xs text-slate-500 dark:text-gray-400 mt-1 truncate">{unit || ""}</div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-xs text-slate-400 dark:text-gray-500">target</div>
          <div className="text-sm font-medium text-slate-700 dark:text-white">{displayTarget}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-gray-400">
          <div>Days Achieved: <span className="font-medium text-slate-800 dark:text-white">{numDaysAchieved}</span></div>
          <div>Days Filled: <span className="font-medium text-slate-800 dark:text-white">{daysFilled}</span> ({achievedRate}%)</div>
        </div>
        <div className="mt-2">
          <div className="w-full h-3 bg-slate-100 dark:bg-gray-700 rounded overflow-hidden" aria-hidden>
            <div
              style={{ width: `${pct}%` }}
              className={`${barColorClass} h-full rounded transition-all duration-300`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}