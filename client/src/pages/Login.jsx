import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";

export default function Login() {
  const { plantId } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plant, setPlant] = useState(null);
  const [plants, setPlants] = useState([]); // All available plants
  const [selectedPlantId, setSelectedPlantId] = useState(plantId || ""); // For dropdown mode
  const [loadingPlants, setLoadingPlants] = useState(true);
  const [mode, setMode] = useState(plantId ? "direct" : "dropdown"); // direct or dropdown mode

  useEffect(() => {
    fetchAllPlants();
    if (plantId) {
      fetchPlantDetails();
    }
  }, [plantId]);

  async function fetchAllPlants() {
    try {
      const res = await api.get("/plants");
      setPlants(res.data || []);
      if (plantId) {
        const foundPlant = res.data?.find(p => p.id === plantId);
        setPlant(foundPlant || null);
      }
    } catch (err) {
      console.error("Failed to fetch plants", err);
      setPlants([]);
    } finally {
      setLoadingPlants(false);
    }
  }

  async function fetchPlantDetails() {
    // This is now handled in fetchAllPlants
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError("Please enter the password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let currentPlant;
      let currentPlantId;
      
      if (mode === "direct" && plant) {
        currentPlant = plant;
        currentPlantId = plantId;
      } else if (mode === "dropdown" && selectedPlantId) {
        currentPlant = plants.find(p => p.id === selectedPlantId);
        currentPlantId = selectedPlantId;
      } else {
        setError("Please select a plant first.");
        return;
      }
      
      if (!currentPlant) {
        setError("Selected plant not found.");
        return;
      }

      // Basic validation: password should match plant name (case-insensitive)
      const expectedPassword = currentPlant.name?.toLowerCase();
      const enteredPassword = password.trim().toLowerCase();

      if (enteredPassword === expectedPassword) {
        // Store login state in localStorage (basic implementation)
        localStorage.setItem(`kpi-auth-${currentPlantId}`, "true");
        localStorage.setItem("kpi-current-plant", currentPlantId);
        
        // Notify App component of login state change
        window.dispatchEvent(new CustomEvent('loginStateChanged'));
        
        // Navigate to dashboard
        navigate(`/dashboard/${currentPlantId}`);
      } else {
        setError(`Invalid password. Please enter the plant name: "${currentPlant.name}".`);
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/");
  };

  if (loadingPlants) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Loading plants...</p>
        </div>
      </div>
    );
  }

  if (mode === "direct" && !plant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-xl font-bold text-red-600 mb-4">Plant Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">The plant "{plantId}" could not be found.</p>
          <button 
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Plant Access</h1>
          {mode === "direct" ? (
            <>
              <p className="text-gray-600 dark:text-gray-300">Enter password to access {plant.name}</p>
              {plant.code && <p className="text-sm text-gray-500 dark:text-gray-400">Plant Code: {plant.code}</p>}
            </>
          ) : (
            <p className="text-gray-600 dark:text-gray-300">Select a plant and enter password</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === "dropdown" && (
            <div>
              <label htmlFor="plantSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Plant
              </label>
              <select
                id="plantSelect"
                value={selectedPlantId}
                onChange={(e) => setSelectedPlantId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Choose a plant...</option>
                {plants.map(plant => (
                  <option key={plant.id} value={plant.id} className="dark:bg-gray-700 dark:text-white">
                    {plant.name} {plant.code ? `(${plant.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {mode === "direct" && (
            <div>
              <label htmlFor="plant" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Plant Name
              </label>
              <input
                type="text"
                id="plant"
                value={plant.name || ""}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "direct" ? "Enter plant name as password" : "Enter the selected plant name as password"}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Hint: Use the plant name as the password
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            KPI Management System • Secure Plant Access
          </p>
        </div>
      </div>
    </div>
  );
}