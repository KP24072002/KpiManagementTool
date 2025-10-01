import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import api from "../utils/api";

export default function ProtectedRoute({ children }) {
  const { plantId, kpiId } = useParams();
  const [loading, setLoading] = useState(false);
  const [redirectPlant, setRedirectPlant] = useState(null);
  
  // If we have plantId from URL, use it directly
  if (plantId) {
    const isAuthenticated = localStorage.getItem(`kpi-auth-${plantId}`) === "true";
    
    if (!isAuthenticated) {
      return <Navigate to={`/login/${plantId}`} replace />;
    }
    
    return children;
  }
  
  // If we have kpiId but no plantId, we need to fetch the KPI to get its plantId
  useEffect(() => {
    if (kpiId && !redirectPlant) {
      setLoading(true);
      api.get(`/kpis/${kpiId}`)
        .then(res => {
          const kpiPlantId = res.data?.plantId;
          if (kpiPlantId) {
            setRedirectPlant(kpiPlantId);
          }
        })
        .catch(err => {
          console.error("Failed to fetch KPI", err);
          // Redirect to home if KPI not found
          setRedirectPlant("__not_found__");
        })
        .finally(() => setLoading(false));
    }
  }, [kpiId, redirectPlant]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (redirectPlant === "__not_found__") {
    return <Navigate to="/" replace />;
  }
  
  if (redirectPlant) {
    const isAuthenticated = localStorage.getItem(`kpi-auth-${redirectPlant}`) === "true";
    
    if (!isAuthenticated) {
      return <Navigate to={`/login/${redirectPlant}`} replace />;
    }
  }
  
  return children;
}