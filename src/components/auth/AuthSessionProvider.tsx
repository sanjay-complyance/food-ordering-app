"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "./AuthProvider";
import { ReactNode } from "react";

interface AuthSessionProviderProps {
  children: ReactNode;
}

export function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  return (
    <SessionProvider>
      <AuthProvider>{children}</AuthProvider>
    </SessionProvider>
  );
}
