// client/src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import PlantList from "../components/PlantList";

export default function Home() {
  const navigate = useNavigate();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(false);

  // create form state
  const [name, setName] = useState("");



  
  const [code, setCode] = useState("");
  const [location, setLocation] = useState("");
  const [creating, setCreating] = useState(false);

  // selected plant local (highlight only)
  const [selectedPlantId, setSelectedPlantId] = useState(null);

  useEffect(() => {
    fetchPlants();
  }, []);

  async function fetchPlants() {
    setLoading(true);
    try {
      const res = await api.get("/plants");
      setPlants(res.data || []);
    } catch (err) {
      console.error("Failed to load plants", err);
      alert(err.message || "Failed to load plants");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return alert("Please enter plant name");
    setCreating(true);
    try {
      const payload = { name: name.trim(), code: code.trim() || null, location: location.trim() || null };
      const res = await api.post("/plants", payload);
      const newPlant = res.data;
      setPlants((p) => [newPlant, ...p]);
      // reset form
      setName("");
      setCode("");
      setLocation("");
      // auto-select and navigate to dashboard
      setSelectedPlantId(newPlant.id);
      navigate(`/plant/${encodeURIComponent(newPlant.id)}/dashboard`);
    } catch (err) {
      console.error("Create plant failed", err);
      alert(err.message || "Create plant failed");
    } finally {
      setCreating(false);
    }
  }

  function onSelectPlant(plant) {
    setSelectedPlantId(plant.id);
    navigate(`/plant/${encodeURIComponent(plant.id)}/dashboard`);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">KPI Manager</h1>
        <p className="text-sm text-slate-600 mt-1">Select a plant to manage KPIs and upload KPI data files.</p>
      </div>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Plants</h2>
          <button onClick={fetchPlants} className="text-sm text-blue-600">Refresh</button>
        </div>

        {loading ? (
          <div className="p-4 bg-white rounded shadow-sm">Loading plants...</div>
        ) : (
          <PlantList plants={plants} onSelect={onSelectPlant} selectedId={selectedPlantId} />
        )}
      </section>

      <section className="mb-12 bg-white p-4 rounded shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Create New Plant</h3>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-sm text-slate-700">Plant Name*</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full p-2 border rounded"
              placeholder="e.g. Plant A"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-700">Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 block w-full p-2 border rounded"
              placeholder="optional code"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm text-slate-700">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 block w-full p-2 border rounded"
              placeholder="optional location"
            />
          </div>

          <div className="sm:col-span-3 flex gap-2 mt-2">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create & Open Dashboard"}
            </button>
            <button
              type="button"
              onClick={() => { setName(""); setCode(""); setLocation(""); }}
              className="px-4 py-2 bg-slate-100 rounded"
            >
              Clear
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
