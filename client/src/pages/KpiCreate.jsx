

// client/src/pages/KpiCreate.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";

export default function KpiCreate() {
  const { plantId } = useParams();
  const navigate = useNavigate();

  const [plant, setPlant] = useState(null);
  const [loadingPlant, setLoadingPlant] = useState(true);

  // form state
  const [name, setName] = useState(""); // KPI name (required)
  const [action, setAction] = useState("maintain"); // increase | decrease | maintain | maximize | minimize
  const [description, setDescription] = useState("");
  const [presentValue, setPresentValue] = useState(""); // numeric string
  const [targetValue, setTargetValue] = useState(""); // numeric string (for increase/decrease)
  const [targetLowerValue, setTargetLowerValue] = useState(""); // for maintain/minimize
  const [targetUpperValue, setTargetUpperValue] = useState(""); // for maintain/maximize
  const [unit, setUnit] = useState(""); // defaults to plant.name when loaded
  const [deadline, setDeadline] = useState(""); // yyyy-mm-dd
  const [targetRevisionDate, setTargetRevisionDate] = useState("");
  const [owner, setOwner] = useState("");
  const [category, setCategory] = useState(""); // NEW: category selection
  const [submitting, setSubmitting] = useState(false);

  // allowed categories (exact strings)
  const CATEGORY_OPTIONS = [
    { value: "", label: "(none)" },
    { value: "Throughput", label: "Throughput" },
    { value: "COST", label: "COST" },
    { value: "DELIVERY", label: "DELIVERY" },
    { value: "QUALITY", label: "QUALITY" },
    { value: "Safety", label: "Safety" },
    { value: "Productivity", label: "Productivity" },
  ];

  useEffect(() => {
    let mounted = true;
    async function loadPlant() {
      setLoadingPlant(true);
      try {
        const res = await api.get("/plants");
        if (!mounted) return;
        const found = Array.isArray(res.data)
          ? res.data.find((p) => p.id === plantId)
          : null;
        setPlant(found || null);
        if (found && mounted) setUnit(found.name || "");
      } catch (err) {
        console.error("Failed to load plant", err);
        setPlant(null);
      } finally {
        if (mounted) setLoadingPlant(false);
      }
    }
    loadPlant();
    return () => {
      mounted = false;
    };
  }, [plantId]);

  function isNumberStringEmptyOrValid(v) {
    if (v === null || v === undefined || String(v).trim() === "")
      return true; // empty is allowed
    return !Number.isNaN(Number(String(v).trim()));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!name || !name.trim()) {
      return alert("KPI name is required");
    }

    // validate numeric fields
    if (!isNumberStringEmptyOrValid(presentValue)) {
      return alert("Present value must be numeric or left empty.");
    }
    if (!isNumberStringEmptyOrValid(targetValue)) {
      return alert("Target value must be numeric or left empty.");
    }
    if (!isNumberStringEmptyOrValid(targetLowerValue)) {
      return alert("Lower target must be numeric or left empty.");
    }
    if (!isNumberStringEmptyOrValid(targetUpperValue)) {
      return alert("Upper target must be numeric or left empty.");
    }

    // action-specific checks
    if ((action === "increase" || action === "decrease") && !targetValue) {
      return alert("Please provide targetValue for increase/decrease.");
    }
    if (action === "maintain" && (!targetLowerValue || !targetUpperValue)) {
      return alert("Please provide both lower and upper targets for maintain.");
    }
    if (action === "maximize" && !targetUpperValue) {
      return alert("Please provide upper target for maximize.");
    }
    if (action === "minimize" && !targetLowerValue) {
      return alert("Please provide lower target for minimize.");
    }

    setSubmitting(true);
    try {
      const payload = {
        name: String(name).trim(),
        description: description ? String(description).trim() : "",
        owner: owner ? String(owner).trim() : "",
        action,
        presentValue:
          presentValue === "" ? null : Number(String(presentValue).trim()),
        targetValue:
          targetValue === "" ? null : Number(String(targetValue).trim()),
        targetLowerValue:
          targetLowerValue === ""
            ? null
            : Number(String(targetLowerValue).trim()),
        targetUpperValue:
          targetUpperValue === ""
            ? null
            : Number(String(targetUpperValue).trim()),
        unit: unit ? String(unit).trim() : plant?.name || "",
        deadline: deadline ? String(deadline) : null,
        targetRevisionDate: targetRevisionDate
          ? String(targetRevisionDate)
          : null,
        // include category (send empty string if none)
        category: category ? String(category) : "",
      };

      await api.post(`/kpis/plant/${encodeURIComponent(plantId)}`, payload);
      navigate(`/plant/${encodeURIComponent(plantId)}/dashboard`);
    } catch (err) {
      console.error("Failed to create KPI", err);
      alert(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to create KPI"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create KPI</h1>
        <p className="text-sm text-slate-600 mt-1">
          Create a KPI for{" "}
          {loadingPlant
            ? "loading..."
            : plant
            ? <strong>{plant.name}</strong>
            : "this plant"}
          .
        </p>
      </div>

      <div className="bg-white p-6 rounded shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* KPI name */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              KPI Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maximize milk processing per hour"
              className="mt-1 block w-full p-2 border rounded"
              required
            />
          </div>

          {/* Action */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Action
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="mt-1 block w-48 p-2 border rounded"
            >
              <option value="increase">Increase</option>
              <option value="decrease">Decrease</option>
              <option value="maintain">Maintain (range)</option>
              <option value="maximize">Maximize</option>
              <option value="minimize">Minimize</option>
            </select>
          </div>

          {/* Category (NEW) */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-64 p-2 border rounded"
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value + opt.label} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="text-xs text-slate-400 mt-1">
              Optional — choose one category for easier filtering and reports.
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description / objective (optional)"
              className="mt-1 block w-full p-2 border rounded h-24"
            />
          </div>

          {/* Present / Target / Unit */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Present value
              </label>
              <input
                type="number"
                value={presentValue}
                onChange={(e) => setPresentValue(e.target.value)}
                placeholder="Current value"
                className="mt-1 block w-full p-2 border rounded"
              />
            </div>

            {action === "increase" || action === "decrease" ? (
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Target value ({action === "increase" ? "higher" : "lower"})
                </label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="Target value"
                  className="mt-1 block w-full p-2 border rounded"
                />
              </div>
            ) : null}

            {action === "maintain" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Lower limit
                  </label>
                  <input
                    type="number"
                    value={targetLowerValue}
                    onChange={(e) => setTargetLowerValue(e.target.value)}
                    placeholder="Lower value"
                    className="mt-1 block w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Upper limit
                  </label>
                  <input
                    type="number"
                    value={targetUpperValue}
                    onChange={(e) => setTargetUpperValue(e.target.value)}
                    placeholder="Upper value"
                    className="mt-1 block w-full p-2 border rounded"
                  />
                </div>
              </>
            ) : null}

            {action === "maximize" ? (
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Upper target
                </label>
                <input
                  type="number"
                  value={targetUpperValue}
                  onChange={(e) => setTargetUpperValue(e.target.value)}
                  placeholder="Upper value"
                  className="mt-1 block w-full p-2 border rounded"
                />
              </div>
            ) : null}

            {action === "minimize" ? (
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Lower target
                </label>
                <input
                  type="number"
                  value={targetLowerValue}
                  onChange={(e) => setTargetLowerValue(e.target.value)}
                  placeholder="Lower value"
                  className="mt-1 block w-full p-2 border rounded"
                />
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Unit / Location
              </label>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. KLPH or plant location"
                className="mt-1 block w-full p-2 border rounded"
              />
              <div className="text-xs text-slate-400 mt-1">
                Defaults to plant name; editable.
              </div>
            </div>
          </div>

          {/* Deadline + Revision */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1 block w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Target revision date (optional)
              </label>
              <input
                type="date"
                value={targetRevisionDate}
                onChange={(e) => setTargetRevisionDate(e.target.value)}
                className="mt-1 block w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* Owner */}
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Owner
            </label>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Owner name or email (optional)"
              className="mt-1 block w-full p-2 border rounded"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 items-center">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create KPI"}
            </button>
            <button
              type="button"
              onClick={() =>
                navigate(`/plant/${encodeURIComponent(plantId)}/dashboard`)
              }
              className="px-4 py-2 bg-slate-100 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 text-sm text-slate-500">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:underline"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}


// import React, { useEffect, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import api from "../utils/api";

// export default function KpiCreate() {
//   const { plantId } = useParams();
//   const navigate = useNavigate();

//   const [plant, setPlant] = useState(null);
//   const [loadingPlant, setLoadingPlant] = useState(true);

//   const [name, setName] = useState("");
//   const [action, setAction] = useState("maintain");
//   const [description, setDescription] = useState("");
//   const [presentValue, setPresentValue] = useState("");
//   const [targetValue, setTargetValue] = useState("");
//   const [targetLowerValue, setTargetLowerValue] = useState("");
//   const [targetUpperValue, setTargetUpperValue] = useState("");
//   const [unit, setUnit] = useState("");
//   const [deadline, setDeadline] = useState("");
//   const [targetRevisionDate, setTargetRevisionDate] = useState("");
//   const [owner, setOwner] = useState("");
//   const [category, setCategory] = useState("");
//   const [submitting, setSubmitting] = useState(false);

//   const CATEGORY_OPTIONS = [
//     { value: "", label: "(none)" },
//     { value: "Throughput", label: "Throughput" },
//     { value: "COST", label: "COST" },
//     { value: "DELIVERY", label: "DELIVERY" },
//     { value: "QUALITY", label: "QUALITY" },
//     { value: "Safety", label: "Safety" },
//     { value: "Productivity", label: "Productivity" },
//   ];

//   useEffect(() => {
//     let mounted = true;
//     async function loadPlant() {
//       setLoadingPlant(true);
//       try {
//         const res = await api.get("/plants");
//         if (!mounted) return;
//         const found = Array.isArray(res.data)
//           ? res.data.find((p) => p.id === plantId)
//           : null;
//         setPlant(found || null);
//         if (found && mounted) setUnit(found.name || "");
//       } catch (err) {
//         console.error("Failed to load plant", err);
//         setPlant(null);
//       } finally {
//         if (mounted) setLoadingPlant(false);
//       }
//     }
//     loadPlant();
//     return () => {
//       mounted = false;
//     };
//   }, [plantId]);

//   function isNumberStringEmptyOrValid(v) {
//     if (v === null || v === undefined || String(v).trim() === "") return true;
//     return !Number.isNaN(Number(String(v).trim()));
//   }

//   async function handleSubmit(e) {
//     e.preventDefault();
//     if (!name || !name.trim()) return alert("KPI name is required");
//     if (!isNumberStringEmptyOrValid(presentValue))
//       return alert("Present value must be numeric or left empty.");
//     if (!isNumberStringEmptyOrValid(targetValue))
//       return alert("Target value must be numeric or left empty.");
//     if (!isNumberStringEmptyOrValid(targetLowerValue))
//       return alert("Lower target must be numeric or left empty.");
//     if (!isNumberStringEmptyOrValid(targetUpperValue))
//       return alert("Upper target must be numeric or left empty.");
//     if ((action === "increase" || action === "decrease") && !targetValue)
//       return alert("Please provide targetValue for increase/decrease.");
//     if (action === "maintain" && (!targetLowerValue || !targetUpperValue))
//       return alert("Please provide both lower and upper targets for maintain.");
//     if (action === "maximize" && !targetUpperValue)
//       return alert("Please provide upper target for maximize.");
//     if (action === "minimize" && !targetLowerValue)
//       return alert("Please provide lower target for minimize.");

//     setSubmitting(true);
//     try {
//       const payload = {
//         name: String(name).trim(),
//         description: description ? String(description).trim() : "",
//         owner: owner ? String(owner).trim() : "",
//         action,
//         presentValue: presentValue === "" ? null : Number(String(presentValue).trim()),
//         targetValue: targetValue === "" ? null : Number(String(targetValue).trim()),
//         targetLowerValue: targetLowerValue === "" ? null : Number(String(targetLowerValue).trim()),
//         targetUpperValue: targetUpperValue === "" ? null : Number(String(targetUpperValue).trim()),
//         unit: unit ? String(unit).trim() : plant?.name || "",
//         deadline: deadline ? String(deadline) : null,
//         targetRevisionDate: targetRevisionDate ? String(targetRevisionDate) : null,
//         category: category ? String(category) : "",
//       };
//       await api.post(`/kpis/plant/${encodeURIComponent(plantId)}`, payload);
//       navigate(`/plant/${encodeURIComponent(plantId)}/dashboard`);
//     } catch (err) {
//       console.error("Failed to create KPI", err);
//       alert(err?.response?.data?.error || err?.message || "Failed to create KPI");
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
//       <div className="w-full max-w-6xl bg-white rounded-xl shadow-lg p-6">
//         <h1 className="text-3xl font-bold text-gray-900 mb-6 border-b-2 border-gray-200 pb-2">Create KPI</h1>
//         <p className="text-sm text-gray-600 mb-6">
//           Create a KPI for {loadingPlant ? "loading..." : plant ? <strong className="text-gray-800">{plant.name}</strong> : "this plant"}.
//         </p>
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
//           <label className="text-sm font-medium text-gray-700 flex items-center h-12">KPI Name *</label>
//           <input
//             value={name}
//             onChange={(e) => setName(e.target.value)}
//             placeholder="e.g. Maximize milk processing per hour"
//             className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
//             required
//           />
//           <label className="text-sm font-medium text-gray-700 flex items-center h-12">Action</label>
//           <select
//             value={action}
//             onChange={(e) => setAction(e.target.value)}
//             className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
//           >
//             <option value="increase">Increase</option>
//             <option value="decrease">Decrease</option>
//             <option value="maintain">Maintain (range)</option>
//             <option value="maximize">Maximize</option>
//             <option value="minimize">Minimize</option>
//           </select>
//           <label className="text-sm font-medium text-gray-700 flex items-center h-12">Category</label>
//           <select
//             value={category}
//             onChange={(e) => setCategory(e.target.value)}
//             className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
//           >
//             {CATEGORY_OPTIONS.map(opt => (
//               <option key={opt.value + opt.label} value={opt.value}>
//                 {opt.label}
//               </option>
//             ))}
//           </select>
//           <label className="text-sm font-medium text-gray-700 flex items-center h-20">Description</label>
//           <textarea
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//             placeholder="Short description / objective (optional)"
//             className="w-full p-3 border border-gray-300 rounded-lg h-20 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
//           />
//           <label className="text-sm font-medium text-gray-700 flex items-center h-12">Present Value</label>
//           <input
//             type="number"
//             value={presentValue}
//             onChange={(e) => setPresentValue(e.target.value)}
//             placeholder="Current value"
//             className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
//           />
//           {(action === "increase" || action === "decrease") && (
//             <>
//               <label className="text-sm font-medium text-gray-700 flex items-center h-12">Target Value ({action === "increase" ? "Higher" : "Lower"})</label>
//               <input
//                 type="number"
//                 value={targetValue}
//                 onChange={(e) => setTargetValue(e.target.value)}
//                 placeholder="Target value"
//                 className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
//               />
//             </>
//           )}
//           {action === "maintain" && (
//             <>
//               <label className="text-sm font-medium text-gray-700 flex items-center h-12">Lower Limit</label>
//               <input
//                 type="number"
//                 value={targetLowerValue}
//                 onChange={(e) => setTargetLowerValue(e.target.value)}
//                 placeholder="Lower value"
//                 className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
//               />
//               <label className="text-sm font-medium text-gray-700 flex items-center h-12">Upper Limit</label>
//               <input
//                 type="number"
//                 value={targetUpperValue}
//                 onChange={(e) => setTargetUpperValue(e.target.value)}
//                 placeholder="Upper value"
//                 className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
//               />
//             </>
//           )}
//           {action === "maximize" && (
//             <>
//               <label className="text-sm font-medium text-gray-700 flex items-center h-12">Upper Target</label>
//               <input
//                 type="number"
//                 value={targetUpperValue}
//                 onChange={(e) => setTargetUpperValue(e.target.value)}
//                 placeholder="Upper value"
//                 className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
//               />
//             </>
//           )}
//           {action === "minimize" && (
//             <>
//               <label className="text-sm font-medium text-gray-700 flex items-center h-12">Lower Target</label>
//               <input
//                 type="number"
//                 value={targetLowerValue}
//                 onChange={(e) => setTargetLowerValue(e.target.value)}
//                 placeholder="Lower value"
//                 className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
//               />
//             </>
//           )}
//           <label className="text-sm font-medium text-gray-700 flex items-center h-12">Unit / Location</label>
//           <input
//             value={unit}
//             onChange={(e) => setUnit(e.target.value)}
//             placeholder="e.g. KLPH or plant location"
//             className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
//           />
//           <label className="text-sm font-medium text-gray-700 flex items-center h-12">Deadline</label>
//           <input
//             type="date"
//             value={deadline}
//             onChange={(e) => setDeadline(e.target.value)}
//             className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
//           />
//           <label className="text-sm font-medium text-gray-700 flex items-center h-12">Target Revision Date</label>
//           <input
//             type="date"
//             value={targetRevisionDate}
//             onChange={(e) => setTargetRevisionDate(e.target.value)}
//             className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
//           />
//           <label className="text-sm font-medium text-gray-700 flex items-center h-12">Owner</label>
//           <input
//             value={owner}
//             onChange={(e) => setOwner(e.target.value)}
//             placeholder="Owner name or email (optional)"
//             className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-900"
//           />
//           <div className="lg:col-span-2 flex justify-end gap-4 mt-6">
//             <button
//               type="submit"
//               disabled={submitting}
//               className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
//             >
//               {submitting ? "Creating..." : "Create KPI"}
//             </button>
//             <button
//               type="button"
//               onClick={() => navigate(`/plant/${encodeURIComponent(plantId)}/dashboard`)}
//               className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-200"
//             >
//               Cancel
//             </button>
//             <button
//               onClick={() => navigate(-1)}
//               className="px-6 py-3 text-blue-600 hover:underline transition duration-200"
//             >
//               ← Back
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }



