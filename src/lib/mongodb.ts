import mongoose from "mongoose";

type ConnectionObject = {
  isConnected?: number;
};

const connection: ConnectionObject = {};

async function dbConnect(): Promise<void> {
  // Check if we have a connection to the database or if it's currently connecting
  if (connection.isConnected) {
    console.log("Already connected to MongoDB");
    return;
  }

  // In test environment, don't use the regular connection logic
  if (process.env.NODE_ENV === "test") {
    // For tests, we assume the connection is handled by the test setup
    connection.isConnected = 1;
    return;
  }

  try {
    // Attempt to connect to the database
    const db = await mongoose.connect(process.env.MONGODB_URI || "", {
      dbName: "daily-lunch-ordering",
    });

    connection.isConnected = db.connections[0].readyState;
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
    // In test environment, don't exit process
    if (process.env.NODE_ENV === ("test" as string)) {
      throw error;
    } else {
      process.exit(1);
    }
  }
}

export default dbConnect;
