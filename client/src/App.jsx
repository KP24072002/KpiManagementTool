// client/src/App.jsx
// import React from "react";
// import { Routes, Route, Link } from "react-router-dom";
// import Home from "./pages/Home";
// import KpiCreate from "./pages/KpiCreate";
// import Dashboard from "./pages/Dashboard";
// import KpiDetail from "./pages/Dashboard"; // optional: using Dashboard UI for kpi/:kpiId route for now
// import PresentationView from "./pages/Presentationview";
// export default function App() {
//   return (
//     <div className="min-h-screen bg-gray-50">
//       <header className="bg-white shadow p-4">
//         <div className="max-w-6xl mx-auto flex items-center justify-between">
//           <div>
//             <Link to="/" className="text-xl font-bold">KPI Manager</Link>
//             <span className="text-sm text-slate-500 ml-3">Prototype</span>
//           </div>

//           <nav className="flex items-center gap-4 text-sm">
//             <Link to="/" className="text-slate-700 hover:text-blue-600">Home</Link>
//           </nav>
//         </div>
//       </header>

//       <main className="max-w-6xl mx-auto mt-8">
//         <Routes>
//           <Route path="/" element={<Home />} />
//           <Route path="/plant/:plantId/kpi-create" element={<KpiCreate />} />
//           <Route path="/plant/:plantId/dashboard" element={<Dashboard />} />
//           <Route path="/kpi/:kpiId" element={<KpiDetail />} />
//           <Route
//                  path="/plant/:plantId/kpi/:kpiId/presentation"
//   element={<PresentationView />}
// />
//           {/* fallback route */}
//           <Route
//             path="*"
//             element={
//               <div className="p-6">
//                 <h2 className="text-xl font-semibold">Page not found</h2>
//                 <p className="mt-2 text-slate-600">
//                   Go back to <Link to="/" className="text-blue-600">Home</Link>.
//                 </p>
//               </div>
//             }
//           />
//         </Routes>
//       </main>
//     </div>
//   );
// }


// client/src/App.jsx
import React from "react";
import { Routes, Route, Link } from "react-router-dom";

import Home from "./pages/Home";
import KpiCreate from "./pages/KpiCreate";
import Dashboard from "./pages/Dashboard";
import PresentationView from "./pages/Presentationview";
import PresentationDeck from "./pages/Presentationdeck";
import PresentationOverview from "./pages/PresentationOverview";
import KpiDailyEntry from "./pages/KpiDailyEntry"; // NEW - Daily Entry page
import KpiDetail from "./pages/KpiDetail"; // ensure this file exists or remove the route below
import KpiEdit from "./pages/KpiEdit";

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
          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* Create KPI */}
          <Route path="/plant/:plantId/kpi-create" element={<KpiCreate />} />
          <Route path="/plant/:plantId/kpi-edit" element={<KpiEdit />} />

          {/* Dashboard */}
          <Route path="/plant/:plantId" element={<Dashboard />} />
          <Route path="/plant/:plantId/dashboard" element={<Dashboard />} />

          {/* Daily Entry (NEW) */}
          <Route path="/plant/:plantId/daily-entry" element={<KpiDailyEntry />} />

          {/* KPI detail */}
          <Route path="/kpi/:kpiId" element={<KpiDetail />} />

          {/* Presentations */}
          <Route path="/plant/:plantId/presentation" element={<PresentationDeck />} />
          <Route path="/plant/:plantId/kpi/:kpiId/presentation" element={<PresentationView />} />
          <Route path="/plant/:plantId/presentation-overview" element={<PresentationOverview />} />

          {/* fallback */}
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


