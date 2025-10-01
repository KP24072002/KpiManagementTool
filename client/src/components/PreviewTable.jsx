// client/src/components/PreviewTable.jsx
import React from "react";

export default function PreviewTable({ headers = [], rows = [] }) {
  if (!headers || headers.length === 0) return <div className="text-sm text-slate-500 dark:text-gray-400">No headers</div>;
  if (!rows || rows.length === 0) return <div className="text-sm text-slate-500 dark:text-gray-400">No rows</div>;

  return (
    <div className="overflow-auto border rounded border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 dark:bg-gray-700">
          <tr>
            {headers.map((h, idx) => (
              <th key={idx} className="px-3 py-2 text-left font-medium text-slate-600 dark:text-gray-300">{h || `Col ${idx + 1}`}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-slate-50 dark:bg-gray-700"}>
              {headers.map((_, ci) => (
                <td key={ci} className="px-3 py-2 align-top text-slate-800 dark:text-white">
                  {r[ci] === null || r[ci] === undefined ? "" : String(r[ci])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}