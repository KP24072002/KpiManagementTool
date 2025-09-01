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
    return <p className="text-sm text-slate-600">No plants yet. Create one below.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {plants.map((p) => (
        <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded shadow-sm">
          <div>
            <div className="font-semibold">{p.name}</div>
            {p.code && <div className="text-xs text-slate-500">{p.code}</div>}
            {p.location && <div className="text-xs text-slate-500 mt-1">{p.location}</div>}
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => onSelect(p)}
              className={`px-3 py-1 rounded text-sm ${selectedId === p.id ? "bg-green-600 text-white" : "bg-slate-100"}`}
            >
              {selectedId === p.id ? "Selected" : "Open"}
            </button>
            <div className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
