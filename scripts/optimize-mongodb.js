#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * MongoDB Atlas optimization script
 * This script verifies and creates optimal indexes for MongoDB Atlas
 * It's designed to be run periodically to ensure database performance
 */

require("dotenv").config();
const { MongoClient } = require("mongodb");

// Models (require them to register schemas)
require("../src/models/User");
require("../src/models/Menu");
require("../src/models/MenuItem");
require("../src/models/Order");
require("../src/models/Notification");

// Connection options optimized for MongoDB Atlas free tier
const connectionOptions = {
  maxPoolSize: 5,
  minPoolSize: 1,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 5000,
  heartbeatFrequencyMS: 30000,
  retryWrites: true,
  retryReads: true,
  w: "majority",
  compressors: "zlib",
  zlibCompressionLevel: 6,
};

// Define optimal indexes for each collection
const collectionIndexes = {
  users: [
    { key: { email: 1 }, options: { unique: true, name: "email_unique" } },
    { key: { role: 1 }, options: { name: "role_index" } },
    { key: { createdAt: -1 }, options: { name: "user_created_at" } },
  ],
  menus: [
    { key: { date: -1 }, options: { name: "menu_date_desc" } },
    {
      key: { "items.available": 1 },
      options: { name: "menu_items_available" },
    },
    { key: { createdBy: 1 }, options: { name: "menu_created_by" } },
  ],
  orders: [
    { key: { userId: 1 }, options: { name: "order_user_id" } },
    { key: { orderDate: -1 }, options: { name: "order_date_desc" } },
    { key: { status: 1 }, options: { name: "order_status" } },
    { key: { userId: 1, orderDate: -1 }, options: { name: "user_order_date" } },
    { key: { menuId: 1 }, options: { name: "order_menu_id" } },
  ],
  notifications: [
    { key: { userId: 1 }, options: { name: "notification_user_id" } },
    { key: { read: 1 }, options: { name: "notification_read" } },
    { key: { createdAt: -1 }, options: { name: "notification_created_desc" } },
    {
      key: { userId: 1, read: 1 },
      options: { name: "user_notification_read" },
    },
    { key: { type: 1 }, options: { name: "notification_type" } },
  ],
};

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    console.log("Connecting to MongoDB...");
    const client = new MongoClient(uri, connectionOptions);
    await client.connect();
    console.log("Connected to MongoDB successfully");
    return client;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

// Create indexes for a collection
async function createCollectionIndexes(db, collectionName, indexes) {
  try {
    const collection = db.collection(collectionName);
    console.log(`Creating indexes for ${collectionName}...`);

    // Get existing indexes
    const existingIndexes = await collection.indexes();
    const existingIndexNames = existingIndexes.map((index) => index.name);

    // Create each index if it doesn't exist
    for (const index of indexes) {
      const indexName = index.options.name;
      if (!existingIndexNames.includes(indexName)) {
        console.log(`Creating index ${indexName} on ${collectionName}...`);
        await collection.createIndex(index.key, index.options);
        console.log(`Index ${indexName} created successfully`);
      } else {
        console.log(`Index ${indexName} already exists on ${collectionName}`);
      }
    }
  } catch (error) {
    console.error(`Error creating indexes for ${collectionName}:`, error);
  }
}

// Analyze collection statistics
async function analyzeCollection(db, collectionName) {
  try {
    const collection = db.collection(collectionName);
    console.log(`\nAnalyzing collection: ${collectionName}`);

    // Get collection stats
    const stats = await collection.stats();
    console.log(`Documents: ${stats.count}`);
    console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(
      `Average document size: ${(stats.avgObjSize / 1024).toFixed(2)} KB`
    );

    // Get index sizes
    console.log("\nIndex sizes:");
    for (const indexName in stats.indexSizes) {
      console.log(
        `${indexName}: ${(stats.indexSizes[indexName] / 1024).toFixed(2)} KB`
      );
    }

    // Run explain plan on a typical query
    let explainResult;
    try {
      if (collectionName === "users") {
        explainResult = await collection
          .find({ role: "user" })
          .explain("executionStats");
      } else if (collectionName === "menus") {
        explainResult = await collection
          .find()
          .sort({ date: -1 })
          .limit(10)
          .explain("executionStats");
      } else if (collectionName === "orders") {
        explainResult = await collection
          .find()
          .sort({ orderDate: -1 })
          .limit(10)
          .explain("executionStats");
      } else if (collectionName === "notifications") {
        explainResult = await collection
          .find({ read: false })
          .explain("executionStats");
      }

      if (explainResult && explainResult.executionStats) {
        console.log("\nQuery performance:");
        console.log(
          `Execution time: ${explainResult.executionStats.executionTimeMillis} ms`
        );
        console.log(
          `Documents examined: ${explainResult.executionStats.totalDocsExamined}`
        );
        console.log(
          `Documents returned: ${explainResult.executionStats.nReturned}`
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      console.log("Could not run explain plan - collection may be empty");
    }
  } catch (error) {
    console.error(`Error analyzing collection ${collectionName}:`, error);
  }
}

// Main function
async function main() {
  let client;
  try {
    client = await connectToMongoDB();
    const db = client.db();

    console.log("\n=== Creating Optimal Indexes ===");
    for (const [collectionName, indexes] of Object.entries(collectionIndexes)) {
      await createCollectionIndexes(db, collectionName, indexes);
    }

    console.log("\n=== Collection Analysis ===");
    for (const collectionName of Object.keys(collectionIndexes)) {
      await analyzeCollection(db, collectionName);
    }

    console.log("\n=== Database Optimization Complete ===");
  } catch (error) {
    console.error("Error optimizing MongoDB:", error);
  } finally {
    if (client) {
      await client.close();
      console.log("MongoDB connection closed");
    }
    process.exit(0);
  }
}

// Run the script
main();
