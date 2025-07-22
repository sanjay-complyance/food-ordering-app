/**
 * Error logging and monitoring utility
 * In a production environment, this would integrate with services like Sentry, LogRocket, etc.
 * For the free tier requirements, we'll implement a robust logger that could be extended later
 */

// Error severity levels
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// Error context interface
interface ErrorContext {
  userId?: string;
  path?: string;
  action?: string;
  additionalData?: Record<string, unknown>;
}

// Performance metrics storage
const performanceMetrics: Record<string, number[]> = {};
const errorCounts: Record<string, number> = {};
const MAX_METRICS_HISTORY = 100;

/**
 * Log an error with context information
 * @param error The error object
 * @param severity Error severity level
 * @param context Additional context about the error
 */
export function logError(
  error: Error | unknown,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  context: ErrorContext = {}
) {
  // Convert unknown errors to Error objects
  const errorObj = error instanceof Error ? error : new Error(String(error));

  // Create error log entry
  const errorLog = {
    message: errorObj.message,
    stack: errorObj.stack,
    name: errorObj.name,
    severity,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.APP_VERSION || "unknown",
    ...context,
  };

  // Track error counts by type
  const errorType = errorObj.name || "UnknownError";
  errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;

  // In production, this would send to a logging service
  if (process.env.NODE_ENV === "production") {
    // Production logging - structured for log aggregation
    console.error(JSON.stringify(errorLog));

    // Here you would integrate with external logging services
    // For Vercel deployment, these logs will be captured by Vercel's logging system

    // For critical errors, we might want additional actions
    if (severity === ErrorSeverity.CRITICAL) {
      // Send alert notification (in a real system, this would email/text admins)
      sendAlertNotification(errorLog);
    }
  } else {
    // Development logging - more readable format
    console.error(`[${severity.toUpperCase()}] ${errorObj.message}`);
    console.error("Context:", context);
    console.error("Stack:", errorObj.stack);
  }

  return errorLog;
}

/**
 * Create an error handler middleware for API routes
 */
export function createErrorHandler() {
  return (error: Error, req: Request) => {
    // Extract path from request
    const url = new URL(req.url);
    const path = url.pathname;

    // Extract user info from headers if available
    const authHeader = req.headers.get("authorization");
    let userId: string | undefined = undefined;

    if (authHeader) {
      try {
        // This is a simplified example - in a real app, you'd decode the JWT properly
        const token = authHeader.replace("Bearer ", "");
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(Buffer.from(base64, "base64").toString());
        userId = payload.sub || payload.id;
      } catch (_) {
        // Ignore token parsing errors
      }
    }

    // Log the error with request context
    logError(error, ErrorSeverity.HIGH, {
      userId,
      path,
      action: req.method,
      additionalData: {
        query: Object.fromEntries(url.searchParams.entries()),
        userAgent: req.headers.get("user-agent"),
        referer: req.headers.get("referer"),
      },
    });

    // Return appropriate error response
    if (error.name === "ValidationError") {
      return new Response(
        JSON.stringify({ error: "Validation error", details: error.message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (error.name === "UnauthorizedError") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error.name === "ForbiddenError") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error.name === "NotFoundError") {
      return new Response(JSON.stringify({ error: "Resource not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Default server error response
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  };
}

/**
 * Monitor application performance metrics
 * Collects metrics for monitoring and analysis
 */
export function monitorPerformance(metricName: string, value: number) {
  // Initialize array for this metric if it doesn't exist
  if (!performanceMetrics[metricName]) {
    performanceMetrics[metricName] = [];
  }

  // Add value to metrics history
  performanceMetrics[metricName].push(value);

  // Limit the size of the metrics history
  if (performanceMetrics[metricName].length > MAX_METRICS_HISTORY) {
    performanceMetrics[metricName].shift();
  }

  if (process.env.NODE_ENV === "production") {
    // In production, log the metric
    console.log(`[METRIC] ${metricName}: ${value}`);

    // In a real system, you would send this to a monitoring service
    // For Vercel deployment, these logs will be captured by Vercel's logging system
  }
}

/**
 * Get performance metrics statistics
 */
export function getPerformanceMetrics() {
  const stats: Record<
    string,
    {
      avg: number;
      min: number;
      max: number;
      count: number;
      p95: number;
    }
  > = {};

  // Calculate statistics for each metric
  Object.entries(performanceMetrics).forEach(([name, values]) => {
    if (values.length === 0) return;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    stats[name] = {
      avg: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: values.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  });

  return stats;
}

/**
 * Get error statistics
 */
export function getErrorStats() {
  return {
    counts: { ...errorCounts },
    total: Object.values(errorCounts).reduce((a, b) => a + b, 0),
  };
}

/**
 * Reset performance metrics
 * Useful for testing or when metrics need to be cleared
 */
export function resetMetrics() {
  Object.keys(performanceMetrics).forEach((key) => {
    performanceMetrics[key] = [];
  });

  Object.keys(errorCounts).forEach((key) => {
    errorCounts[key] = 0;
  });
}

/**
 * Send alert notification for critical errors
 * In a real system, this would integrate with email/SMS/Slack
 */
function sendAlertNotification(errorLog: Record<string, unknown>) {
  // In a real system, this would send an alert to administrators
  // For now, just log it prominently
  console.error("🚨 CRITICAL ERROR ALERT 🚨");
  console.error(JSON.stringify(errorLog, null, 2));

  // Track alert in metrics
  monitorPerformance("critical_alerts", 1);
}
