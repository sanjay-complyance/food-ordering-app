"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { UserRole } from "@/types/models";
import { Types } from "mongoose";

// Create a simplified user type for the auth context
// This avoids issues with the Document interface from mongoose
interface AuthUser {
  _id: Types.ObjectId;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperuser: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    if (session?.user?.email) {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);

      if (status === "loading") {
        return;
      }

      if (session?.user) {
        // Map session user to our User type
        const sessionUser: AuthUser = {
          _id: new Types.ObjectId(
            session.user.id || "000000000000000000000000"
          ),
          email: session.user.email || "",
          name: session.user.name || "",
          role: (session.user as unknown as { role?: UserRole }).role || "user",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setUser(sessionUser);
      } else {
        setUser(null);
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, [session, status]);

  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin" || user?.role === "superuser";
  const isSuperuser = user?.role === "superuser";

  const contextValue: AuthContextType = {
    user,
    isLoading: isLoading || status === "loading",
    isAuthenticated,
    isAdmin,
    isSuperuser,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Hook for requiring authentication
export function useRequireAuth() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      window.location.href = "/auth/login";
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  return auth;
}

// Hook for requiring admin access
export function useRequireAdmin() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading) {
      if (!auth.isAuthenticated) {
        window.location.href = "/auth/login";
      } else if (!auth.isAdmin) {
        window.location.href = "/unauthorized";
      }
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.isAdmin]);

  return auth;
}

// Hook for requiring superuser access
export function useRequireSuperuser() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading) {
      if (!auth.isAuthenticated) {
        window.location.href = "/auth/login";
      } else if (!auth.isSuperuser) {
        window.location.href = "/unauthorized";
      }
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.isSuperuser]);

  return auth;
}
