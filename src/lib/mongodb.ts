import mongoose from "mongoose";
import { logError, ErrorSeverity, monitorPerformance } from "./error-logger";
import { configureMongoDBAtlasForFreeTier } from "./db-optimization";

type ConnectionObject = {
  isConnected?: number;
  connectionAttempts?: number;
  lastConnectionAttempt?: number;
};

const connection: ConnectionObject = {
  isConnected: 0,
  connectionAttempts: 0,
  lastConnectionAttempt: 0,
};

// Maximum number of connection retries before giving up
const MAX_CONNECTION_RETRIES = 5;
// Backoff time between retries (in ms)
const RETRY_BACKOFF_MS = 3000;

// Connection options optimized for production on MongoDB Atlas free tier
const getConnectionOptions = () => {
  const baseOptions: mongoose.ConnectOptions = {
    dbName: "daily-lunch-ordering",
    // Production optimizations
    maxPoolSize: process.env.NODE_ENV === "production" ? 5 : 10, // Reduced for free tier in production
    minPoolSize: process.env.NODE_ENV === "production" ? 1 : 5, // Reduced for free tier in production
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    heartbeatFrequencyMS: 30000, // Reduced frequency for free tier
    // Additional options for production
    retryWrites: true,
    retryReads: true,
  };

  // Add environment-specific options
  if (process.env.NODE_ENV === "production") {
    return {
      ...baseOptions,
      // Additional production-specific options
      compressors: "zlib", // Enable compression for network efficiency
      zlibCompressionLevel: 6, // Balance between compression ratio and CPU usage
    };
  }

  return baseOptions;
};

/**
 * Connect to MongoDB with optimized settings and retry logic
 */
async function dbConnect(): Promise<void> {
  // Check if we have a connection to the database or if it's currently connecting
  if (connection.isConnected === 1) {
    return;
  }

  // In test environment, don't use the regular connection logic
  if (process.env.NODE_ENV === "test") {
    // For tests, we assume the connection is handled by the test setup
    connection.isConnected = 1;
    return;
  }

  // Configure MongoDB Atlas optimizations
  configureMongoDBAtlasForFreeTier();

  // Track connection attempt
  connection.connectionAttempts = (connection.connectionAttempts || 0) + 1;
  connection.lastConnectionAttempt = Date.now();

  try {
    // Record connection start time for performance monitoring
    const startTime = Date.now();

    // Attempt to connect to the database
    const db = await mongoose.connect(
      process.env.MONGODB_URI || "",
      getConnectionOptions()
    );

    // Record connection performance
    const connectionTime = Date.now() - startTime;
    monitorPerformance("mongodb_connection_time", connectionTime);

    connection.isConnected = db.connections[0].readyState;
    connection.connectionAttempts = 0; // Reset attempts on success

    // Log connection success in production
    if (process.env.NODE_ENV === "production") {
      console.log(
        `MongoDB connection established with ${db.connections.length} connections in ${connectionTime}ms`
      );
    }
  } catch (error) {
    // Log the error with our error logger
    logError(error, ErrorSeverity.CRITICAL, {
      action: "DATABASE_CONNECTION",
      additionalData: {
        uri: process.env.MONGODB_URI?.replace(/\/\/.*@/, "//[REDACTED]@"),
        attempt: connection.connectionAttempts,
      },
    });

    // In test environment, don't exit process
    if (process.env.NODE_ENV === "test") {
      throw error;
    } else {
      // In production, retry connection with exponential backoff
      if (
        connection.connectionAttempts &&
        connection.connectionAttempts < MAX_CONNECTION_RETRIES
      ) {
        const backoffTime =
          RETRY_BACKOFF_MS * Math.pow(2, connection.connectionAttempts - 1);
        console.log(
          `Retrying database connection in ${backoffTime}ms (attempt ${connection.connectionAttempts}/${MAX_CONNECTION_RETRIES})`
        );
        setTimeout(dbConnect, backoffTime);
      } else {
        // After max retries, exit the process
        console.error(
          `Database connection failed after ${MAX_CONNECTION_RETRIES} attempts - application cannot continue`
        );
        process.exit(1);
      }
    }
  }
}

// Add connection event listeners for better monitoring
mongoose.connection.on("error", (err) => {
  logError(err, ErrorSeverity.HIGH, { action: "MONGODB_ERROR" });
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
  connection.isConnected = 0;

  // Only attempt reconnect in production and if we haven't exceeded retry limit
  if (
    process.env.NODE_ENV === "production" &&
    (!connection.connectionAttempts ||
      connection.connectionAttempts < MAX_CONNECTION_RETRIES)
  ) {
    // Add some delay before reconnecting
    setTimeout(dbConnect, RETRY_BACKOFF_MS);
  }
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected");
  connection.isConnected = 1;
  connection.connectionAttempts = 0; // Reset attempts on successful reconnection
});

// Add connection monitoring for production
if (process.env.NODE_ENV === "production") {
  // Monitor connection pool usage
  setInterval(() => {
    if (mongoose.connection.readyState === 1) {
      // 1 = connected
      try {
        // Use a safer approach to get connection stats
        const poolSize = mongoose.connections.length;
        monitorPerformance("mongodb_connection_pool_size", poolSize);
      } catch (err) {
        // Handle any errors safely
        console.error("Error monitoring MongoDB connections:", err);
      }
    }
  }, 60000); // Check every minute
}

export default dbConnect;
