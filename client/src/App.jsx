import React, { useState, useEffect } from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import api from "./utils/api";

import Home from "./pages/Home";
import Login from "./pages/Login";
import KpiCreate from "./pages/KpiCreate";
import Dashboard from "./pages/Dashboard";
import PresentationView from "./pages/Presentationview";
import PresentationDeck from "./pages/Presentationdeck";
import PresentationOverview from "./pages/PresentationOverview";
import KpiDailyEntry from "./pages/KpiDailyEntry"; // NEW - Daily Entry page
import KpiDetail from "./pages/KpiDetail"; // ensure this file exists or remove the route below
import KpiEdit from "./pages/KpiEdit";
import ProtectedRoute from "./components/ProtectedRoute";

// Component to redirect logged-in users away from Home/Login pages
function PublicOnlyRoute({ children }) {
  const currentPlant = localStorage.getItem("kpi-current-plant");
  const isLoggedIn = currentPlant && localStorage.getItem(`kpi-auth-${currentPlant}`) === "true";
  
  if (isLoggedIn) {
    // Redirect logged-in users to their dashboard
    return <Navigate to={`/dashboard/${currentPlant}`} replace />;
  }
  
  return children;
}

export default function App() {
  const [currentPlant, setCurrentPlant] = useState(localStorage.getItem("kpi-current-plant"));
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPlantName, setCurrentPlantName] = useState("");

  // Check login status and update state
  useEffect(() => {
    const checkLoginStatus = () => {
      const plant = localStorage.getItem("kpi-current-plant");
      const isAuth = plant && localStorage.getItem(`kpi-auth-${plant}`) === "true";
      setCurrentPlant(plant);
      setIsLoggedIn(isAuth);
      
      if (plant && isAuth) {
        fetchCurrentPlantName(plant);
      } else {
        setCurrentPlantName("");
      }
    };
    
    // Initial check
    checkLoginStatus();
    
    // Listen for storage changes (when login happens in the same tab)
    const handleStorageChange = () => {
      checkLoginStatus();
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Custom event for same-tab updates
    window.addEventListener('loginStateChanged', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('loginStateChanged', handleStorageChange);
    };
  }, []);

  async function fetchCurrentPlantName(plantId) {
    try {
      const res = await api.get("/plants");
      const plant = res.data?.find(p => p.id === plantId);
      setCurrentPlantName(plant?.name || plantId);
    } catch (err) {
      console.error("Failed to fetch plant name", err);
      setCurrentPlantName(plantId);
    }
  }

  const handleLogout = () => {
    if (currentPlant) {
      localStorage.removeItem(`kpi-auth-${currentPlant}`);
      localStorage.removeItem("kpi-current-plant");
      setCurrentPlantName("");
      setCurrentPlant(null);
      setIsLoggedIn(false);
      
      // Notify other components of login state change
      window.dispatchEvent(new CustomEvent('loginStateChanged'));
      
      window.location.href = "/";
    }
  };

  const handleHomeClick = (e) => {
    // If user is logged in, show confirmation before going to home
    if (isLoggedIn) {
      e.preventDefault(); // Prevent default navigation
      
      const confirmLogout = window.confirm(
        "You are currently logged in. Do you want to logout and go to the home page?"
      );
      
      if (confirmLogout) {
        // User confirmed - logout and go to home
        handleLogout();
      }
      // If user cancels (clicks "No"), do nothing - stay on current page
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">KPI Manager</Link>
            <span className="text-sm text-slate-500 dark:text-gray-400 ml-3">Prototype</span>
          </div>

          <nav className="flex items-center gap-4 text-sm relative">
            <Link to="/" className="text-slate-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400" onClick={handleHomeClick}>Home</Link>
            
            {!isLoggedIn && (
              <div className="relative">
                <Link 
                  to="/login"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                >
                  Login
                </Link>
              </div>
            )}
            
            {isLoggedIn && (
              <>
                <span className="text-slate-500 dark:text-gray-400">|</span>
                <span className="text-slate-600 dark:text-gray-300">Plant: {currentPlantName}</span>
                <button 
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="container mx-auto mt-8">
        <Routes>
          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* Login */}
          <Route path="/login" element={<Login />} />
          <Route path="/login/:plantId" element={<Login />} />

          {/* Create KPI */}
          <Route path="/plant/:plantId/kpi-create" element={<ProtectedRoute><KpiCreate /></ProtectedRoute>} />
          <Route path="/plant/:plantId/kpi-edit" element={<ProtectedRoute><KpiEdit /></ProtectedRoute>} />

          {/* Dashboard */}
          <Route path="/dashboard/:plantId" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/plant/:plantId" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/plant/:plantId/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* Daily Entry (NEW) */}
          <Route path="/plant/:plantId/daily-entry" element={<ProtectedRoute><KpiDailyEntry /></ProtectedRoute>} />

          {/* KPI detail */}
          <Route path="/kpi/:kpiId" element={<ProtectedRoute><KpiDetail /></ProtectedRoute>} />

          {/* Presentations */}
          <Route path="/plant/:plantId/presentation" element={<ProtectedRoute><PresentationDeck /></ProtectedRoute>} />
          <Route path="/plant/:plantId/kpi/:kpiId/presentation" element={<ProtectedRoute><PresentationView /></ProtectedRoute>} />
          <Route path="/plant/:plantId/presentation-overview" element={<ProtectedRoute><PresentationOverview /></ProtectedRoute>} />

          {/* fallback */}
          <Route
            path="*"
            element={
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Page not found</h2>
                <p className="mt-2 text-slate-600 dark:text-gray-300">
                  Go back to <Link to="/" className="text-blue-600 dark:text-blue-400">Home</Link>.
                </p>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}