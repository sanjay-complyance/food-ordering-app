import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { logError, ErrorSeverity } from "./lib/error-logger";

export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;
    const startTime = Date.now();

    // Public routes that don't require authentication
    const publicRoutes = [
      "/",
      "/auth/login",
      "/auth/signup",
      "/api/auth/signup",
      "/api/auth",
      "/unauthorized",
    ];

    // Check if route is public
    const isPublicRoute = publicRoutes.some(
      (route) => pathname.startsWith(route) || pathname === route
    );

    // Allow public routes
    if (isPublicRoute) {
      return NextResponse.next();
    }

    // For protected routes, let the individual pages/API routes handle authentication
    // This avoids loading Mongoose models in the Edge Runtime

    // Log request performance for monitoring in production
    if (process.env.NODE_ENV === "production") {
      const duration = Date.now() - startTime;
      console.log(`[PERFORMANCE] Route ${pathname}: ${duration}ms`);
    }

    return NextResponse.next();
  } catch (error) {
    // Log any middleware errors
    logError(error, ErrorSeverity.HIGH, {
      path: req.nextUrl.pathname,
      action: "MIDDLEWARE",
    });

    // Continue to avoid blocking the request
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
