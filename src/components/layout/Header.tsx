"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { InstallButton } from "@/components/pwa/InstallPrompt";
import { signOut } from "next-auth/react";
import Link from "next/link";

export function Header() {
  const { user, isLoading } = useAuth();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/login" });
  };

  if (isLoading) {
    return (
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Daily Lunch Ordering</h1>
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-xl font-semibold hover:text-gray-700"
            >
              Daily Lunch Ordering
            </Link>

            {/* Navigation links for admin users */}
            {(user.role === "admin" || user.role === "superuser") && (
              <nav className="hidden md:flex items-center gap-4">
                <Link
                  href="/admin"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Admin Dashboard
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* User info */}
            <div className="hidden sm:block text-sm text-gray-600">
              Welcome, {user.name || user.email}
              {user.role !== "user" && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {user.role}
                </span>
              )}
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* PWA Install Button */}
            <InstallButton className="hidden sm:flex" />

            {/* Sign out button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="text-sm"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
