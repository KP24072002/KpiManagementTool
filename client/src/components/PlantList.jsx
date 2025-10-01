// client/src/components/PlantList.jsx
import React from "react";

/**
 * Props:
 *  - plants: Array of plant objects
 *  - onSelect: function(plant) called when a plant is selected
 *  - selectedId: id of currently selected plant (optional)
 */
export default function PlantList({ plants = [], onSelect, selectedId }) {
  if (!plants || plants.length === 0) {
    return <p className="text-sm text-slate-600 dark:text-gray-400">No plants yet. Create one below.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {plants.map((p) => (
        <div key={p.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded shadow-sm">
          <div>
            <div className="font-semibold text-slate-800 dark:text-white">{p.name}</div>
            {p.code && <div className="text-xs text-slate-500 dark:text-gray-400">{p.code}</div>}
            {p.location && <div className="text-xs text-slate-500 dark:text-gray-400 mt-1">{p.location}</div>}
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => onSelect(p)}
              className={`px-3 py-1 rounded text-sm ${selectedId === p.id ? "bg-green-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700"}`}
            >
              {selectedId === p.id ? "Selected" : "Access"}
            </button>
            <div className="text-xs text-slate-400 dark:text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}