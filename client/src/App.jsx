// client/src/App.jsx
import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import KpiCreate from "./pages/KpiCreate";
import Dashboard from "./pages/Dashboard";
import KpiDetail from "./pages/Dashboard"; // optional: using Dashboard UI for kpi/:kpiId route for now

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <Link to="/" className="text-xl font-bold">KPI Manager</Link>
            <span className="text-sm text-slate-500 ml-3">Prototype</span>
          </div>

          <nav className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-slate-700 hover:text-blue-600">Home</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto mt-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plant/:plantId/kpi-create" element={<KpiCreate />} />
          <Route path="/plant/:plantId/dashboard" element={<Dashboard />} />
          <Route path="/kpi/:kpiId" element={<KpiDetail />} />

          {/* fallback route */}
          <Route
            path="*"
            element={
              <div className="p-6">
                <h2 className="text-xl font-semibold">Page not found</h2>
                <p className="mt-2 text-slate-600">
                  Go back to <Link to="/" className="text-blue-600">Home</Link>.
                </p>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
