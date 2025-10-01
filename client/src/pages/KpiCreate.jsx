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

  // Predefined unit options
  const UNIT_OPTIONS = [
    "MT",
    "HRS",
    "KWH/MT",
    "KG/MT",
    "CFM/MT",
    "Nos.",
    "MT/Day",
    "Day",
    "Days",
    "Times",
    "No.",
    "Per Day",
    "Minutes",
    "SCM/MT",
    "▫C",
    "KWH",
    "M³/day",
    "Rs",
    "Ea",
    "Ppm",
    "Hour",
    "Kg",
    "%",
    "Min",
    "Kg/hr",
    "Kg/Kg powder",
    "Kg/Kg",
    "Kwh/Kg",
    "minut",
    "Ltr/Kg",
    "% wastage",
    "Coliform/gm",
    "% fat",
    "% SNF",
    "kg/1000 litmilk",
    "L",
    "GM",
    "percentage",
    "kg/Mt",
    "kwh/Mt",
    "lit/Mt",
    "Kg/Day",
    "Bag/day",
    "Kg/Ton",
    "Nm/Ton",
    "Lt/Ton",
    "Ltr/Day",
    "No. of Packets",
    "No. of Defects",
    "No. of Accident",
    "No. of Stops",
    "% PTU",
    "% Utilization",
    "lit/MT",
    "Sigma",
    "0/Day",
    "OEE",
    "Ton",
    "LTPD",
    "Kg/Production",
    "%/Day",
    "Hrs/Day",
    "KLPH",
    "Trios/Day",
    "pieces/hr",
    "Lit",
    "Second",
    "KWH/Lit",
    "cfu/Lit",
    "KG/KG MILK",
    "LITER",
    "KG/H.",
    "KL/H.",
    "M3"
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
        unit: unit ? String(unit).trim() : "",
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New KPI</h1>
          <p className="text-gray-600">
            Create a KPI for{" "}
            {loadingPlant
              ? "loading..."
              : plant
              ? <span className="font-semibold text-blue-600">{plant.name}</span>
              : "this plant"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-2">
              📊 Basic Information
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">
                  KPI Name <span className="text-red-500">*</span>
                </label>
                <div className="lg:col-span-3">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maximize milk processing per hour"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">
                  Action Type
                </label>
                <div className="lg:col-span-3">
                  <select
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="increase">📈 Increase</option>
                    <option value="decrease">📉 Decrease</option>
                    <option value="maintain">🎯 Maintain (range)</option>
                    <option value="maximize">⬆️ Maximize</option>
                    <option value="minimize">⬇️ Minimize</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">
                  Category
                </label>
                <div className="lg:col-span-3">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value + opt.label} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Optional — helps with filtering and reporting
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
                <label className="text-sm font-medium text-gray-700 pt-3">
                  Description
                </label>
                <div className="lg:col-span-3">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide a clear description of the KPI objective and purpose..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors h-24 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Values & Targets Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-2">
              🎯 Values & Targets
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">
                  Current Value
                </label>
                <div className="lg:col-span-3">
                  <input
                    type="number"
                    value={presentValue}
                    onChange={(e) => setPresentValue(e.target.value)}
                    placeholder="Enter current value"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

            {action === "increase" || action === "decrease" ? (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">
                  Target Value <span className="text-blue-600">({action === "increase" ? "higher" : "lower"})</span>
                </label>
                <div className="lg:col-span-3">
                  <input
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="Enter target value"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            ) : null}

            {action === "maintain" ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700">
                    Lower Limit
                  </label>
                  <div className="lg:col-span-3">
                    <input
                      type="number"
                      value={targetLowerValue}
                      onChange={(e) => setTargetLowerValue(e.target.value)}
                      placeholder="Minimum acceptable value"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700">
                    Upper Limit
                  </label>
                  <div className="lg:col-span-3">
                    <input
                      type="number"
                      value={targetUpperValue}
                      onChange={(e) => setTargetUpperValue(e.target.value)}
                      placeholder="Maximum acceptable value"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </>
            ) : null}

            {action === "maximize" ? (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">
                  Target Maximum
                </label>
                <div className="lg:col-span-3">
                  <input
                    type="number"
                    value={targetUpperValue}
                    onChange={(e) => setTargetUpperValue(e.target.value)}
                    placeholder="Target maximum value"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            ) : null}

            {action === "minimize" ? (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">
                  Target Minimum
                </label>
                <div className="lg:col-span-3">
                  <input
                    type="number"
                    value={targetLowerValue}
                    onChange={(e) => setTargetLowerValue(e.target.value)}
                    placeholder="Target minimum value"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
              <label className="text-sm font-medium text-gray-700">
                Unit of Measurement
              </label>
              <div className="lg:col-span-3">
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. KLPH, %, kg/hr or select from dropdown"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  list="unit-options"
                />
                <datalist id="unit-options">
                  {UNIT_OPTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-500 mt-1">
                  Select from dropdown or enter custom unit (optional)
                </p>
              </div>
            </div>
          </div>
        </div>

          {/* Timeline & Ownership Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-2">
              📅 Timeline & Ownership
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">
                  Target Deadline
                </label>
                <div className="lg:col-span-3">
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">
                  Target Revision Date
                </label>
                <div className="lg:col-span-3">
                  <input
                    type="date"
                    value={targetRevisionDate}
                    onChange={(e) => setTargetRevisionDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional — when to review/revise targets
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">
                  Owner/Responsible Person
                </label>
                <div className="lg:col-span-3">
                  <input
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Enter name or email of the person responsible"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="submit"
                disabled={submitting}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating KPI...
                  </span>
                ) : (
                  "✅ Create KPI"
                )}
              </button>
              
              <button
                type="button"
                onClick={() =>
                  navigate(`/plant/${encodeURIComponent(plantId)}/dashboard`)
                }
                className="px-8 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                ← Back
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

