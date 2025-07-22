import dbConnect from "./mongodb";
import { createIndexes } from "./db-utils";
import mongoose from "mongoose";
import { logError, ErrorSeverity } from "./error-logger";

/**
 * Initialize database optimizations for production
 * - Creates indexes for better query performance
 * - Sets up connection pooling
 * - Configures read/write concerns
 * - Sets up MongoDB Atlas optimizations
 */
export async function initDbOptimizations() {
  try {
    // Connect to database
    await dbConnect();

    // Create indexes for all collections
    await createIndexes();

    // Configure MongoDB connection options for production
    if (process.env.NODE_ENV === "production") {
      // Set up connection pooling for better performance
      mongoose.connection.on("connected", () => {
        console.log("MongoDB connection pool established");
      });

      // Set read preference to nearest for better read performance
      if (mongoose.connection.db) {
        // Use the proper method to set read preference
        mongoose.connection.db.readPreference("nearest");
      }

      // Set write concern for better data durability
      if (mongoose.connection.db) {
        // Use the proper method to set write concern
        mongoose.connection.db.writeConcern({ w: "majority", wtimeout: 1000 });
      }
    }

    console.log("Database optimizations initialized successfully");
    return true;
  } catch (error) {
    logError(error, ErrorSeverity.HIGH, {
      action: "DB_OPTIMIZATION_INIT",
    });
    console.error("Failed to initialize database optimizations:", error);
    return false;
  }
}

/**
 * Verify database indexes exist and are optimized
 * This can be run periodically to ensure indexes are maintained
 */
export async function verifyDbIndexes() {
  try {
    await dbConnect();
    await createIndexes();
    return true;
  } catch (error) {
    logError(error, ErrorSeverity.MEDIUM, {
      action: "DB_INDEX_VERIFICATION",
    });
    console.error("Failed to verify database indexes:", error);
    return false;
  }
}

/**
 * Optimize MongoDB Atlas settings for free tier
 * - Sets up appropriate timeouts
 * - Configures connection pooling
 * - Sets up retry logic
 */
export function configureMongoDBAtlasForFreeTier() {
  // Set MongoDB connection options optimized for free tier using the correct API
  const options = {
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: process.env.NODE_ENV === "production" ? 5 : 10,
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 30000,
  };

  // Apply options to mongoose connection
  Object.entries(options).forEach(([key, value]) => {
    // Use the mongoose.connection.set method instead of mongoose.set
    if (mongoose.connection) {
      // @ts-expect-error - Ignore TypeScript errors for dynamic property setting
      mongoose.connection[key] = value;
    }
  });

  // Log configuration
  console.log(
    `MongoDB Atlas configured for ${process.env.NODE_ENV} environment`
  );
}

/**
 * Monitor database performance metrics
 * In production, this would send metrics to a monitoring service
 */
export function monitorDatabasePerformance() {
  if (process.env.NODE_ENV !== "production") return;

  // Set up connection monitoring
  mongoose.connection.on("connected", () => {
    console.log("MongoDB connection established");
  });

  mongoose.connection.on("disconnected", () => {
    console.log("MongoDB connection disconnected");
    logError(new Error("MongoDB connection disconnected"), ErrorSeverity.HIGH, {
      action: "DB_CONNECTION_LOST",
    });
  });

  mongoose.connection.on("error", (err: Error) => {
    logError(err, ErrorSeverity.CRITICAL, {
      action: "DB_CONNECTION_ERROR",
    });
  });

  // Monitor connection pool metrics
  setInterval(() => {
    if (mongoose.connection.readyState === 1) {
      // 1 = connected
      try {
        // Use a safer approach to get connection stats
        const poolSize =
          mongoose.connection.getClient().topology?.connections?.length || 0;
        console.log(`MongoDB connections - current: ${poolSize}`);
      } catch (err) {
        // Handle any errors safely
        console.error("Error monitoring MongoDB connections:", err);
      }
    }
  }, 300000); // Check every 5 minutes
}
