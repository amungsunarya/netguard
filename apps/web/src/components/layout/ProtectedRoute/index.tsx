import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../../features/auth/useAuth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isReady, loadFromStorage } = useAuth();

  useEffect(() => {
    if (!isReady) loadFromStorage();
  }, [isReady, loadFromStorage]);

  if (!isReady) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        color: "#94A3B8",
        background: "#0F172A",
      }}>
        Loading...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}