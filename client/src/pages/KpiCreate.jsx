// client/src/pages/KpiCreate.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";

export default function KpiCreate() {
  const { plantId } = useParams();
  const navigate = useNavigate();

  const [plant, setPlant] = useState(null);
  const [loadingPlant, setLoadingPlant] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // load plant metadata (we fetch all plants and find the one with plantId)
  useEffect(() => {
    let mounted = true;
    async function loadPlant() {
      setLoadingPlant(true);
      try {
        const res = await api.get("/plants");
        if (!mounted) return;
        const found = Array.isArray(res.data) ? res.data.find(p => p.id === plantId) : null;
        setPlant(found || null);
      } catch (err) {
        console.error("Failed to load plant", err);
        setPlant(null);
      } finally {
        if (mounted) setLoadingPlant(false);
      }
    }
    loadPlant();
    return () => { mounted = false; };
  }, [plantId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return alert("KPI name is required");
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || "",
        owner: owner.trim() || ""
      };
      const res = await api.post(`/kpis/plant/${encodeURIComponent(plantId)}`, payload);
      // success — navigate to dashboard
      navigate(`/plant/${encodeURIComponent(plantId)}/dashboard`);
    } catch (err) {
      console.error("Failed to create KPI", err);
      alert(err?.message || "Failed to create KPI");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create KPI</h1>
        <p className="text-sm text-slate-600 mt-1">
          Create a KPI for {loadingPlant ? "loading..." : (plant ? <strong>{plant.name}</strong> : "this plant")}.
        </p>
      </div>

      <div className="bg-white p-6 rounded shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">KPI Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Yield Rate"
              className="mt-1 block w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of the KPI (optional)"
              className="mt-1 block w-full p-2 border rounded h-24"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Owner</label>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Owner name or email (optional)"
              className="mt-1 block w-full p-2 border rounded"
            />
          </div>

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
              onClick={() => navigate(`/plant/${encodeURIComponent(plantId)}/dashboard`)}
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
