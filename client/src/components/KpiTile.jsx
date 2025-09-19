

// // client/src/components/KpiTile.jsx
// import React from "react";

// /**
//  * KpiTile
//  * Props:
//  *  - name: string
//  *  - fullText: string (description)
//  *  - value: number | null
//  *  - target: number | null
//  *  - percent: number (0-100)
//  *  - color: "green" | "yellow" | "red" | "gray"
//  *  - unit: string
//  *  - numDaysAchieved: integer
//  *  - daysFilled: integer
//  */

// function clampPct(v) {
//   const n = Number(v);
//   if (!Number.isFinite(n)) return 0;
//   return Math.max(0, Math.min(100, n));
// }

// function formatDisplayValue(value) {
//   if (value === null || value === undefined || value === "") return "—";
//   const num = Number(value);
//   if (Number.isFinite(num)) {
//     return num % 1 === 0 ? String(num) : String(Number(num.toFixed(2)));
//   }
//   return String(value);
// }

// export default function KpiTile({
//   name = "",
//   fullText = "",
//   value = null,
//   target = null,
//   percent = null,
//   color = "gray",
//   unit = "",
//   numDaysAchieved = 0,
//   daysFilled = 0
// }) {
//   const pct = clampPct(percent);

//   const barColorClass =
//     color === "green" ? "bg-green-600" :
//     color === "yellow" ? "bg-amber-400" :
//     color === "red" ? "bg-red-600" :
//     "bg-slate-400";

//   const pctTextColor =
//     color === "green" ? "text-green-800" :
//     color === "yellow" ? "text-amber-800" :
//     color === "red" ? "text-red-800" :
//     "text-slate-700";

//   const displayValue = formatDisplayValue(value);
//   const percentLabel = (percent === null || percent === undefined || Number.isNaN(Number(percent))) ? "No target" : `${pct.toFixed(1)}%`;

//   return (
//     <div className="bg-white rounded-lg shadow p-3 flex flex-col justify-between h-full min-h-[140px] overflow-hidden">
//       {/* Header */}
//       <div className="flex items-start justify-between gap-3">
//         <div className="min-w-0">
//           <div className="text-sm font-semibold text-slate-700 truncate">{name}</div>
//           {fullText ? (
//             <div className="text-xs text-slate-500 mt-1 max-w-[18rem] truncate">{fullText}</div>
//           ) : null}
//         </div>

//         <div className="flex-shrink-0 ml-2">
//           <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${pctTextColor} bg-slate-50 border border-slate-100 whitespace-nowrap`}>
//             {percentLabel}
//           </div>
//         </div>
//       </div>

//       {/* Main: large number + meta */}
//       <div className="mt-2 flex items-start justify-between gap-4">
//         <div className="min-w-0">
//           <div className="text-2xl md:text-3xl lg:text-4xl font-extrabold leading-tight text-slate-900 break-words truncate">
//             {displayValue}
//           </div>
//           <div className="text-xs text-slate-500 mt-1 truncate">{unit || ""}</div>
//         </div>

//         <div className="flex-shrink-0 text-right">
//           <div className="text-xs text-slate-400">target</div>
//           <div className="text-sm font-medium text-slate-700">{target == null ? "—" : target}</div>
//         </div>
//       </div>

//       {/* Footer */}
//       <div className="mt-3">
//         <div className="flex items-center justify-between text-xs text-slate-600">
//           <div>Days Achieved: <span className="font-medium text-slate-800">{numDaysAchieved}</span></div>
//           <div>Days Filled: <span className="font-medium text-slate-800">{daysFilled}</span></div>
//         </div>

//         <div className="mt-2">
//           <div className="w-full h-3 bg-slate-100 rounded overflow-hidden" aria-hidden>
//             <div
//               style={{ width: `${pct}%` }}
//               className={`${barColorClass} h-full rounded transition-all duration-300`}
//             />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }



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
    color === "yellow" ? "bg-amber-400" :
    color === "red" ? "bg-red-600" :
    "bg-slate-400";

  const pctTextColor =
    color === "green" ? "text-green-800" :
    color === "yellow" ? "text-amber-800" :
    color === "red" ? "text-red-800" :
    "text-slate-700";

  const displayValue = formatDisplayValue(value);
  const displayTarget = formatDisplayValue(target);
  const percentLabel = percent == null || Number.isNaN(Number(percent)) ? "No target" : `${pct.toFixed(1)}%`;
  const achievedRate = daysFilled > 0 ? (numDaysAchieved / daysFilled * 100).toFixed(1) : "0.0";

  return (
    <div className="bg-white rounded-lg shadow p-3 flex flex-col justify-between h-full min-h-[140px] overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-700 truncate">{name}</div>
          {fullText ? (
            <div className="text-xs text-slate-500 mt-1 max-w-[18rem] truncate">{fullText}</div>
          ) : null}
        </div>
        <div className="flex-shrink-0 ml-2">
          <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${pctTextColor} bg-slate-50 border border-slate-100 whitespace-nowrap`}>
            {percentLabel}
          </div>
        </div>
      </div>

      {/* Main: large number + meta */}
      <div className="mt-2 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-2xl md:text-3xl lg:text-4xl font-extrabold leading-tight text-slate-900 break-words truncate">
            {displayValue}
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate">{unit || ""}</div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-xs text-slate-400">target</div>
          <div className="text-sm font-medium text-slate-700">{displayTarget}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <div>Days Achieved: <span className="font-medium text-slate-800">{numDaysAchieved}</span></div>
          <div>Days Filled: <span className="font-medium text-slate-800">{daysFilled}</span> ({achievedRate}%)</div>
        </div>
        <div className="mt-2">
          <div className="w-full h-3 bg-slate-100 rounded overflow-hidden" aria-hidden>
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