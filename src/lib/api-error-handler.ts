import { NextResponse } from "next/server";
import { logError, ErrorSeverity } from "./error-logger";

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  error: string;
  details?: string | Record<string, unknown>;
  code?: string;
}

/**
 * Standardized API error handler
 * Creates consistent error responses across all API routes
 */
export function handleApiError(
  error: unknown,
  path: string
): NextResponse<ApiErrorResponse> {
  // Convert unknown error to Error object
  const err = error instanceof Error ? error : new Error(String(error));

  // Log the error with context
  logError(err, ErrorSeverity.HIGH, {
    path,
    action: "API_REQUEST",
  });

  // Determine appropriate status code and message
  let statusCode = 500;
  let message = "Internal server error";
  let code: string | undefined = undefined;

  // Handle specific error types
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = err.message;
    code = "VALIDATION_ERROR";
  } else if (err.name === "UnauthorizedError") {
    statusCode = 401;
    message = "Unauthorized";
    code = "UNAUTHORIZED";
  } else if (err.name === "ForbiddenError") {
    statusCode = 403;
    message = "Forbidden";
    code = "FORBIDDEN";
  } else if (err.name === "NotFoundError") {
    statusCode = 404;
    message = "Resource not found";
    code = "NOT_FOUND";
  } else if (err.message.includes("duplicate key")) {
    statusCode = 409;
    message = "Resource already exists";
    code = "DUPLICATE_RESOURCE";
  }

  // Create standardized error response
  const errorResponse: ApiErrorResponse = {
    error: message,
  };

  // Add error code if available
  if (code) {
    errorResponse.code = code;
  }

  // Add details in development mode
  if (process.env.NODE_ENV !== "production") {
    errorResponse.details = err.message;
  }

  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Create custom error classes for common API errors
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}
