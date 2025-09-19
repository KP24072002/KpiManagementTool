// // client/src/components/ActionPlans.jsx
// import React, { useEffect, useState } from "react";
// import api from "../utils/api";

// const STATUS_OPTIONS = ["Planned", "In Progress", "Completed", "Delay"];

// export default function ActionPlans({ kpiId, onChange }) {
//   const [actions, setActions] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // add/edit form state
//   const initialForm = { id: null, description: "", deadline: "", responsibility: "", status: "Planned" };
//   const [form, setForm] = useState(initialForm);
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     if (!kpiId) return;
//     fetchActions();
//   }, [kpiId]);

//   async function fetchActions() {
//     setLoading(true);
//     try {
//       const res = await api.get(`/kpis/${encodeURIComponent(kpiId)}/actions`);
//       setActions(res.data || []);
//     } catch (err) {
//       console.error("Failed to fetch actions", err);
//       setActions([]);
//     } finally {
//       setLoading(false);
//     }
//   }

//   function startEdit(action) {
//     setForm({
//       id: action.id,
//       description: action.description || "",
//       deadline: action.deadline || "",
//       responsibility: action.responsibility || "",
//       status: action.status || "Planned"
//     });
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   }

//   function resetForm() {
//     setForm(initialForm);
//   }

//   async function handleSave(e) {
//     e.preventDefault();
//     if (!form.description.trim()) return alert("Description required");
//     setSaving(true);
//     try {
//       if (form.id) {
//         const res = await api.put(`/kpis/${encodeURIComponent(kpiId)}/actions/${encodeURIComponent(form.id)}`, form);
//         // update locally
//         setActions(prev => prev.map(a => a.id === res.data.id ? res.data : a));
//       } else {
//         const res = await api.post(`/kpis/${encodeURIComponent(kpiId)}/actions`, form);
//         setActions(prev => [...prev, res.data]);
//       }
//       resetForm();
//       if (onChange) onChange();
//     } catch (err) {
//       console.error("Save action failed", err);
//       alert(err?.response?.data?.error || err.message || "Save failed");
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function handleDelete(actionId) {
//     if (!confirm("Delete this action?")) return;
//     try {
//       await api.delete(`/kpis/${encodeURIComponent(kpiId)}/actions/${encodeURIComponent(actionId)}`);
//       setActions(prev => prev.filter(a => a.id !== actionId));
//       if (onChange) onChange();
//     } catch (err) {
//       console.error("Delete failed", err);
//       alert("Delete failed");
//     }
//   }

//   return (
//     <div className="mt-4">
//       <div className="flex items-center justify-between mb-2">
//         <h4 className="text-sm font-semibold">Action plan (Sub Action plan)</h4>
//         <div className="text-xs text-slate-400">Total: {actions.length}</div>
//       </div>

//       <div className="overflow-auto border rounded">
//         <table className="min-w-full text-sm">
//           <thead className="bg-slate-50">
//             <tr>
//               <th className="px-3 py-2 text-left">Sr.no</th>
//               <th className="px-3 py-2 text-left">Action plan (Sub Action plan)</th>
//               <th className="px-3 py-2 text-left">Deadline</th>
//               <th className="px-3 py-2 text-left">Responsibility</th>
//               <th className="px-3 py-2 text-left">Status</th>
//               <th className="px-3 py-2 text-left">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {loading ? (
//               <tr><td colSpan={6} className="p-4 text-sm text-slate-500">Loading...</td></tr>
//             ) : actions.length === 0 ? (
//               <tr><td colSpan={6} className="p-4 text-sm text-slate-500">No action plans yet.</td></tr>
//             ) : (
//               actions.map((a, idx) => (
//                 <tr key={a.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
//                   <td className="px-3 py-2 align-top">{idx + 1}.</td>
//                   <td className="px-3 py-2 align-top">{a.description}</td>
//                   <td className="px-3 py-2 align-top">{a.deadline || "—"}</td>
//                   <td className="px-3 py-2 align-top">{a.responsibility || "—"}</td>
//                   <td className="px-3 py-2 align-top">{a.status || "Planned"}</td>
//                   <td className="px-3 py-2 align-top">
//                     <div className="flex gap-2">
//                       <button onClick={() => startEdit(a)} className="px-2 py-1 bg-slate-100 rounded text-sm">Edit</button>
//                       <button onClick={() => handleDelete(a.id)} className="px-2 py-1 bg-red-50 text-red-600 rounded text-sm">Delete</button>
//                     </div>
//                   </td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* form for add/edit */}
//       <form onSubmit={handleSave} className="mt-3 bg-white p-3 rounded border">
//         <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
//           <div className="md:col-span-3">
//             <input
//               placeholder="Action plan (Sub Action plan)"
//               value={form.description}
//               onChange={(e) => setForm({...form, description: e.target.value})}
//               className="w-full p-2 border rounded"
//               required
//             />
//           </div>

//           <div>
//             <input
//               type="date"
//               value={form.deadline || ""}
//               onChange={(e) => setForm({...form, deadline: e.target.value})}
//               className="w-full p-2 border rounded"
//             />
//           </div>

//           <div>
//             <input
//               placeholder="Responsibility"
//               value={form.responsibility}
//               onChange={(e) => setForm({...form, responsibility: e.target.value})}
//               className="w-full p-2 border rounded"
//             />
//           </div>

//           <div>
//             <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})} className="w-full p-2 border rounded">
//               {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
//             </select>
//           </div>
//         </div>

//         <div className="mt-3 flex gap-2 justify-end">
//           <button type="button" onClick={resetForm} className="px-3 py-2 bg-slate-100 rounded">Clear</button>
//           <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded">
//             {saving ? "Saving..." : (form.id ? "Save Changes" : "Add Action")}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// }

// client/src/components/ActionPlans.jsx
import React, { useEffect, useState } from "react";
import api from "../utils/api";

const STATUS_OPTIONS = ["Planned", "In Progress", "Completed", "Delay"];

/**
 * ActionPlans
 * Props:
 *  - kpiId (string) required
 *  - onChange (fn) optional: called when actions list changes (add/edit/delete)
 *  - readOnly (boolean) optional: when true, hide edit/delete buttons and the form (preview-only)
 */
export default function ActionPlans({ kpiId, onChange, readOnly = false }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  // add/edit form state (used only when readOnly === false)
  const initialForm = { id: null, description: "", deadline: "", responsibility: "", status: "Planned" };
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!kpiId) return;
    fetchActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpiId]);

  async function fetchActions() {
    setLoading(true);
    try {
      const res = await api.get(`/kpis/${encodeURIComponent(kpiId)}/actions`);
      setActions(res.data || []);
    } catch (err) {
      console.error("Failed to fetch actions", err);
      setActions([]);
    } finally {
      setLoading(false);
    }
  }

  // Only used when not readOnly
  function startEdit(action) {
    if (!action) return;
    setForm({
      id: action.id,
      description: action.description || "",
      deadline: action.deadline || "",
      responsibility: action.responsibility || "",
      status: action.status || "Planned"
    });
    // keep UX simple: scroll to top of this section so user sees form
    const el = document.querySelector("#actionplans-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetForm() {
    setForm(initialForm);
  }

  // Only used when not readOnly
  async function handleSave(e) {
    e.preventDefault();
    if (!form.description || !form.description.trim()) return alert("Description required");
    setSaving(true);
    try {
      if (form.id) {
        const res = await api.put(`/kpis/${encodeURIComponent(kpiId)}/actions/${encodeURIComponent(form.id)}`, form);
        setActions(prev => prev.map(a => (a.id === res.data.id ? res.data : a)));
      } else {
        const res = await api.post(`/kpis/${encodeURIComponent(kpiId)}/actions`, form);
        setActions(prev => [...prev, res.data]);
      }
      resetForm();
      if (typeof onChange === "function") onChange();
    } catch (err) {
      console.error("Save action failed", err);
      alert(err?.response?.data?.error || err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // Only used when not readOnly
  async function handleDelete(actionId) {
    if (!window.confirm("Delete this action?")) return;
    try {
      await api.delete(`/kpis/${encodeURIComponent(kpiId)}/actions/${encodeURIComponent(actionId)}`);
      setActions(prev => prev.filter(a => a.id !== actionId));
      if (typeof onChange === "function") onChange();
    } catch (err) {
      console.error("Delete failed", err);
      alert("Delete failed");
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">Action plan (Sub Action plan)</h4>
        <div className="text-xs text-slate-400">Total: {actions.length}</div>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left w-12">Sr.no</th>
              <th className="px-3 py-2 text-left">Action plan (Sub Action plan)</th>
              <th className="px-3 py-2 text-left w-32">Deadline</th>
              <th className="px-3 py-2 text-left w-40">Responsibility</th>
              <th className="px-3 py-2 text-left w-32">Status</th>
              {!readOnly && <th className="px-3 py-2 text-left w-36">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={readOnly ? 5 : 6} className="p-4 text-sm text-slate-500">Loading...</td></tr>
            ) : actions.length === 0 ? (
              <tr><td colSpan={readOnly ? 5 : 6} className="p-4 text-sm text-slate-500">No action plans yet.</td></tr>
            ) : (
              actions.map((a, idx) => (
                <tr key={a.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-3 py-2 align-top">{idx + 1}.</td>
                  <td className="px-3 py-2 align-top">{a.description}</td>
                  <td className="px-3 py-2 align-top">{a.deadline || "—"}</td>
                  <td className="px-3 py-2 align-top">{a.responsibility || "—"}</td>
                  <td className="px-3 py-2 align-top">{a.status || "Planned"}</td>
                  {!readOnly && (
                    <td className="px-3 py-2 align-top">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(a)} className="px-2 py-1 bg-slate-100 rounded text-sm">Edit</button>
                        <button onClick={() => handleDelete(a.id)} className="px-2 py-1 bg-red-50 text-red-600 rounded text-sm">Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* add / edit form — hidden in readOnly mode */}
      {!readOnly && (
        <form id="actionplans-form" onSubmit={handleSave} className="mt-3 bg-white p-3 rounded border">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <div className="md:col-span-3">
              <input
                placeholder="Action plan (Sub Action plan)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <input
                type="date"
                value={form.deadline || ""}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <input
                placeholder="Responsibility"
                value={form.responsibility}
                onChange={(e) => setForm({ ...form, responsibility: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full p-2 border rounded">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-3 flex gap-2 justify-end">
            <button type="button" onClick={resetForm} className="px-3 py-2 bg-slate-100 rounded">Clear</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded">
              {saving ? "Saving..." : (form.id ? "Save Changes" : "Add Action")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
