import mongoose from "mongoose";
import User from "@/models/User";
import Menu from "@/models/Menu";
import Order from "@/models/Order";
import Notification from "@/models/Notification";

/**
 * Creates optimal indexes for MongoDB collections to improve query performance
 */
export async function createIndexes() {
  try {
    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ role: 1 });

    // Menu indexes
    await Menu.collection.createIndex({ date: -1 });
    await Menu.collection.createIndex({ "items.available": 1 });
    await Menu.collection.createIndex({ createdBy: 1 });

    // Order indexes
    await Order.collection.createIndex({ userId: 1 });
    await Order.collection.createIndex({ orderDate: -1 });
    await Order.collection.createIndex({ status: 1 });
    await Order.collection.createIndex({ userId: 1, orderDate: -1 });

    // Notification indexes
    await Notification.collection.createIndex({ userId: 1 });
    await Notification.collection.createIndex({ read: 1 });
    await Notification.collection.createIndex({ createdAt: -1 });
    await Notification.collection.createIndex({ userId: 1, read: 1 });
    await Notification.collection.createIndex({ type: 1 });

    console.log("Database indexes created successfully");
  } catch (error) {
    console.error("Error creating database indexes:", error);
  }
}

/**
 * Utility function to convert MongoDB document to plain object
 * and handle ObjectId conversion to string
 */
export function sanitizeDocument(doc: unknown) {
  if (!doc) return null;

  const obj = (doc as { toObject?: () => Record<string, unknown> }).toObject ? (doc as { toObject: () => Record<string, unknown> }).toObject() : doc as Record<string, unknown>;

  // Convert _id to string if it exists
  if (obj._id) {
    obj._id = (obj._id as { toString: () => string }).toString();
  }

  // Convert any other ObjectId fields to strings
  Object.keys(obj).forEach((key) => {
    if (obj[key] instanceof mongoose.Types.ObjectId) {
      obj[key] = (obj[key] as { toString: () => string }).toString();
    }
  });

  return obj;
}

/**
 * Utility function to sanitize an array of documents
 */
export function sanitizeDocuments(docs: unknown[]) {
  if (!docs) return [];
  return docs.map((doc) => sanitizeDocument(doc));
}

/**
 * Utility function to handle database errors
 */
export function handleDbError(error: unknown) {
  console.error("Database error:", error);

  const errorObj = error as { code?: number; name?: string; message?: string };

  // Check for specific MongoDB error types
  if (errorObj.code === 11000) {
    // Duplicate key error
    return {
      status: 409,
      message: "Duplicate entry found",
    };
  }

  if (errorObj.name === "ValidationError") {
    return {
      status: 400,
      message: "Validation error: " + errorObj.message,
    };
  }

  // Default error
  return {
    status: 500,
    message: "Database error occurred",
  };
}

/**
 * Utility function to check if MongoDB is connected
 */
export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}
