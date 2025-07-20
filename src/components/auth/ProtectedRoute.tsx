"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "user" | "admin" | "superuser";
}

export function ProtectedRoute({
  children,
  requiredRole = "user",
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, isAdmin, isSuperuser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.push(
        `/auth/login?callbackUrl=${encodeURIComponent(
          window.location.pathname
        )}`
      );
      return;
    }

    // Check role-based access
    if (requiredRole === "admin" && !isAdmin) {
      router.push("/unauthorized");
      return;
    }

    if (requiredRole === "superuser" && !isSuperuser) {
      router.push("/unauthorized");
      return;
    }
  }, [isLoading, isAuthenticated, isAdmin, isSuperuser, requiredRole, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or doesn't have required role, don't render children
  // (useEffect will handle the redirect)
  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole === "admin" && !isAdmin) {
    return null;
  }

  if (requiredRole === "superuser" && !isSuperuser) {
    return null;
  }

  // If authenticated and has required role, render children
  return <>{children}</>;
}
