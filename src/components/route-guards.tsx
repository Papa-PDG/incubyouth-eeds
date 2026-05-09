import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

function FullPageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!session) return <Navigate to="/login" />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { session, role, loading } = useAuth();
  if (loading || (session && role === null)) return <FullPageLoader />;
  if (!session) return <Navigate to="/login" />;
  if (role !== "admin") return <Navigate to="/" />;
  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (session) return <Navigate to="/chat" />;
  return <>{children}</>;
}