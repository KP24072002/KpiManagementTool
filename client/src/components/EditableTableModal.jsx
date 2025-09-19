import React, { useEffect, useRef, useMemo, useState } from "react";

/**
 * EditableTableModal
 *
 * Props:
 *  - open
 *  - onClose
 *  - headers: initial headers array
 *  - rows: initial rows array-of-arrays
 *  - attributes: array of { id, name, count } used for Root Cause selects (ONLY these will be shown)
 *  - onSave(headers, rows)
 */
export default function EditableTableModal({
  open,
  onClose,
  headers: initialHeaders = [],
  rows: initialRows = [],
  attributes = [], // **IMPORTANT**: only these attributes (for the current KPI) are used
  onSave,
}) {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const tableWrapperRef = useRef(null);

  // utility: normalize rows length to headers length
  function normalizeRows(rawRows, hdrs) {
    const len = hdrs.length;
    return (rawRows || []).map((r) => {
      const copy = Array.isArray(r) ? [...r] : [];
      if (copy.length < len) return [...copy, ...Array(len - copy.length).fill("")];
      if (copy.length > len) return copy.slice(0, len);
      return copy;
    });
  }

  // JSON compare helper to prevent unnecessary setState loops
  function sameJSON(a, b) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  // init local headers/rows when modal opens or when inputs change
  useEffect(() => {
    if (!open) return; // only initialize when modal opens
    const hdrs = Array.isArray(initialHeaders) ? [...initialHeaders] : [];
    const normalized = normalizeRows(Array.isArray(initialRows) ? initialRows.map(r => Array.isArray(r) ? [...r] : [] ) : [], hdrs);

    if (!sameJSON(hdrs, headers)) setHeaders(hdrs);
    if (!sameJSON(normalized, rows)) setRows(normalized);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(initialHeaders || []), JSON.stringify(initialRows || [])]);

  // Auto-scroll to end when new column added
  useEffect(() => {
    if (tableWrapperRef.current) {
      setTimeout(() => {
        try {
          tableWrapperRef.current.scrollLeft = tableWrapperRef.current.scrollWidth;
        } catch (e) {}
      }, 50);
    }
  }, [headers.length]);

  // detect root-cause header names
  function isRootCauseHeader(h) {
    if (!h) return false;
    return /^root\s*cause/i.test(String(h).trim());
  }

  // compute dynamic counts from modal rows for attributes passed in (only current KPI attrs)
  const dynamicAttrCounts = useMemo(() => {
    const map = {};
    attributes.forEach((a) => (map[a.id] = 0));
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r] || [];
      for (let ci = 0; ci < headers.length; ci++) {
        if (!isRootCauseHeader(headers[ci])) continue;
        const val = row[ci];
        if (val === undefined || val === null || String(val).trim() === "") continue;
        const s = String(val).trim();
        // if value is an id matching attr.id
        const byId = attributes.find((a) => String(a.id) === s);
        if (byId) {
          map[byId.id] = (map[byId.id] || 0) + 1;
          continue;
        }
        // if value matches name (case-insensitive)
        const byName = attributes.find((a) => String(a.name || "").toLowerCase() === s.toLowerCase());
        if (byName) {
          map[byName.id] = (map[byName.id] || 0) + 1;
        }
      }
    }
    return map;
  }, [rows, headers, attributes]);

  // handlers
  function updateCell(rIdx, cIdx, value) {
    setRows((prev) => {
      const copy = prev.map(row => [...row]);
      if (!copy[rIdx]) copy[rIdx] = Array(headers.length).fill("");
      copy[rIdx][cIdx] = value;
      return copy;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, Array(headers.length).fill("")]);
  }

  function deleteRow(idx) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleHeaderChange(idx, value) {
    setHeaders((prev) => {
      const copy = prev.map((h, i) => (i === idx ? value : h));
      setRows((rPrev) => normalizeRows(rPrev, copy));
      return copy;
    });
  }

  function addColumn(customName) {
    const name = customName ?? `Col ${headers.length + 1}`;
    setHeaders((prev) => {
      const newHeaders = [...prev, name];
      setRows((rPrev) => rPrev.map(r => [...r, ""]));
      return newHeaders;
    });
  }

  function deleteColumn(colIdx) {
    setHeaders((prev) => prev.filter((_, i) => i !== colIdx));
    setRows((prev) => prev.map((r) => r.filter((_, i) => i !== colIdx)));
  }

  function addRootCauseColumn() {
    const prefix = "Root Cause";
    const numbers = headers
      .map((h) => {
        if (!h) return null;
        const m = String(h).trim().match(new RegExp(`^${prefix}(?:\\s*(\\d+))?$`, "i"));
        if (!m) return null;
        return m[1] ? Number(m[1]) : 0;
      })
      .filter((n) => n !== null);
    let next = 1;
    if (numbers.length > 0) {
      const max = Math.max(...numbers);
      next = max + 1;
    }
    addColumn(`${prefix} ${next}`);
  }

  // On Save: convert root-cause values that match attribute name/id to attribute id
  function handleSaveClick() {
    const hdrs = headers.map(h => (typeof h === "string" ? h.trim() : h));
    const normalized = normalizeRows(rows, hdrs);

    for (let ri = 0; ri < normalized.length; ri++) {
      for (let ci = 0; ci < hdrs.length; ci++) {
        if (!isRootCauseHeader(hdrs[ci])) continue;
        const cell = normalized[ri][ci];
        if (!cell || String(cell).trim() === "") {
          normalized[ri][ci] = "";
          continue;
        }
        const s = String(cell).trim();
        // prefer id match
        const findById = attributes.find((a) => String(a.id) === s);
        if (findById) {
          normalized[ri][ci] = findById.id;
          continue;
        }
        // then name match
        const findByName = attributes.find((a) => String(a.name || "").toLowerCase() === s.toLowerCase());
        if (findByName) {
          normalized[ri][ci] = findByName.id;
          continue;
        }
        // leave free-text as-is
        normalized[ri][ci] = s;
      }
    }

    try {
      onSave && onSave(hdrs, normalized);
    } catch (err) {
      console.error("onSave threw", err);
      alert("Save failed");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />

      <div className="relative z-50 bg-white rounded shadow-lg w-[92%] max-w-7xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Edit Rows</h3>
          <div className="flex gap-2">
            <button onClick={() => addColumn()} className="px-3 py-1 bg-slate-100 rounded text-sm">+ Column</button>
            <button onClick={addRow} className="px-3 py-1 bg-slate-100 rounded text-sm">+ Row</button>
            <button onClick={addRootCauseColumn} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-sm">+ Add Root Cause</button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-hidden">
          <div ref={tableWrapperRef} className="overflow-auto border rounded max-h-full pb-6" style={{ WebkitOverflowScrolling: "touch" }}>
            <table className="min-w-max w-full table-auto text-sm">
              <thead>
                <tr>
                  <th className="sticky top-0 bg-white z-20 px-2 py-2 align-top" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>#</th>

                  {headers.map((h, ci) => (
                    <th key={ci} className="sticky top-0 bg-white z-20 px-2 py-2 align-top" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      <div className="flex items-center gap-2">
                        <input
                          title={h || `Col ${ci + 1}`}
                          value={h || ""}
                          onChange={(e) => handleHeaderChange(ci, e.target.value)}
                          className="p-1 border rounded text-sm min-w-[160px] whitespace-nowrap"
                          placeholder={`Col ${ci + 1}`}
                        />
                        <button onClick={() => deleteColumn(ci)} className="text-sm text-red-500 px-1" title="Delete column">✕</button>
                      </div>
                    </th>
                  ))}

                  <th className="sticky top-0 bg-white z-20 px-2 py-2 align-top" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(1, headers.length + 2)} className="px-3 py-3 text-sm text-slate-500">No rows yet.</td>
                  </tr>
                ) : (
                  rows.map((r, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-2 py-2 align-top text-xs text-slate-500">{ri + 1}</td>

                      {headers.map((_, ci) => {
                        const cellVal = rows[ri][ci] ?? "";
                        if (isRootCauseHeader(headers[ci])) {
                          return (
                            <td key={ci} className="px-2 py-2 align-top">
                              <select
                                value={
                                  (function () {
                                    // display the attr.id when stored as id, otherwise blank (we allow free-text)
                                    if (cellVal === undefined || cellVal === null || String(cellVal).trim() === "") return "";
                                    const byId = attributes.find(a => String(a.id) === String(cellVal));
                                    if (byId) return byId.id;
                                    const byName = attributes.find(a => String(a.name || "").toLowerCase() === String(cellVal).toLowerCase());
                                    if (byName) return byName.id;
                                    return "";
                                  })()
                                }
                                onChange={(e) => updateCell(ri, ci, e.target.value)}
                                className="w-full p-1 border rounded text-sm"
                              >
                                <option value="">(select)</option>
                                {attributes.map((attr) => {
                                  // show count clearly: use stored attr.count OR dynamic count seen in current rows (whichever is larger)
                                  const dyn = dynamicAttrCounts[attr.id] || 0;
                                  const stored = (attr.count === undefined || attr.count === null) ? 0 : Number(attr.count);
                                  const showCount = Math.max(stored, dyn);
                                  return <option key={attr.id} value={attr.id}>{attr.name}{showCount ? ` (${showCount})` : ""}</option>;
                                })}
                              </select>
                            </td>
                          );
                        } else {
                          return (
                            <td key={ci} className="px-2 py-2 align-top">
                              <input value={cellVal} onChange={(e) => updateCell(ri, ci, e.target.value)} className="w-full p-1 border rounded text-sm min-w-[160px]" />
                            </td>
                          );
                        }
                      })}

                      <td className="px-2 py-2 align-top">
                        <button onClick={() => deleteRow(ri)} className="text-sm text-red-600">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded">Cancel</button>
          <button onClick={handleSaveClick} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  );
}
