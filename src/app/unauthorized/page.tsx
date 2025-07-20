"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Home, LogIn } from "lucide-react";

export default function UnauthorizedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleGoHome = () => {
    router.push("/");
  };

  const handleSignIn = () => {
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="mt-4 text-2xl font-bold text-gray-900">
              Access Denied
            </CardTitle>
            <CardDescription className="mt-2">
              {status === "unauthenticated"
                ? "You need to sign in to access this page."
                : "You don't have permission to access this resource."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 text-center">
              {status === "unauthenticated" ? (
                <p>Please sign in with your account to continue.</p>
              ) : (
                <p>
                  This page requires{" "}
                  {session?.user?.role === "user" ? "admin" : "superuser"}{" "}
                  privileges. Contact your administrator if you believe this is
                  an error.
                </p>
              )}
            </div>

            <div className="flex flex-col space-y-2">
              {status === "unauthenticated" ? (
                <Button onClick={handleSignIn} className="w-full">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              ) : (
                <Button onClick={handleGoHome} className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
