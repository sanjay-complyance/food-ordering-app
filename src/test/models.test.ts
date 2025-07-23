import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Import models
import User from "@/models/User";
import Menu from "@/models/Menu";
import MenuItem from "@/models/MenuItem";
import Order from "@/models/Order";
import Notification from "@/models/Notification";

describe("Database Models", () => {
  let mongoServer: MongoMemoryServer;

  beforeEach(async () => {
    // Create an in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterEach(async () => {
    // Clean up after tests
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe("User Model", () => {
    it("should create a user successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "hashedPassword123",
        name: "Test User",
        role: "user",
      };

      const user = await User.create(userData);
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.role).toBe(userData.role);
    });

    it("should require email field", async () => {
      const userData = {
        password: "hashedPassword123",
        name: "Test User",
        role: "user",
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it("should enforce unique email constraint", async () => {
      const userData = {
        email: "duplicate@example.com",
        password: "hashedPassword123",
        name: "Test User",
        role: "user",
      };

      await User.create(userData);
      await expect(User.create(userData)).rejects.toThrow();
    });

    it("should validate role values", async () => {
      const userData = {
        email: "test@example.com",
        password: "hashedPassword123",
        name: "Test User",
        role: "invalid-role", // Invalid role
      };

      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe("Menu Model", () => {
    it("should create a menu successfully", async () => {
      const menuData = {
        name: "Lunch Menu", // Add required name field
        date: new Date(),
        items: [
          { name: "Pasta", description: "Italian pasta", available: true },
        ],
        createdBy: new mongoose.Types.ObjectId(),
      };
      const menu = await Menu.create(menuData);
      expect(menu).toBeDefined();
      expect(menu.name).toBe(menuData.name);
      expect(menu.items).toHaveLength(1);
    });

    it("should require date field", async () => {
      const menuData = {
        items: [
          { name: "Pasta", description: "Italian pasta", available: true },
        ],
        createdBy: new mongoose.Types.ObjectId(),
      };

      await expect(Menu.create(menuData)).rejects.toThrow();
    });

    it("should require at least one menu item", async () => {
      const menuData = {
        date: new Date(),
        items: [],
        createdBy: new mongoose.Types.ObjectId(),
      };

      await expect(Menu.create(menuData)).rejects.toThrow();
    });
  });

  describe("Order Model", () => {
    it("should create an order successfully", async () => {
      const orderData = {
        userId: new mongoose.Types.ObjectId(),
        orderDate: new Date(),
        items: [
          { name: "Burger", description: "Beef burger", quantity: 1 },
        ], // Add non-empty items array
        status: "pending",
      };
      const order = await Order.create(orderData);
      expect(order).toBeDefined();
      expect(order.items).toHaveLength(1);
      expect(order.status).toBe("pending");
    });

    it("should require userId field", async () => {
      const orderData = {
        orderDate: new Date(),
        menuItemName: "Burger",
        menuItemDescription: "Beef burger",
        status: "pending",
      };

      await expect(Order.create(orderData)).rejects.toThrow();
    });

    it("should validate status values", async () => {
      const orderData = {
        userId: new mongoose.Types.ObjectId(),
        orderDate: new Date(),
        menuItemName: "Burger",
        menuItemDescription: "Beef burger",
        status: "invalid-status", // Invalid status
      };

      await expect(Order.create(orderData)).rejects.toThrow();
    });
  });

  describe("Notification Model", () => {
    it("should create a notification successfully", async () => {
      const notificationData = {
        userId: new mongoose.Types.ObjectId(),
        type: "order_reminder",
        message: "Time to place your lunch order!",
        read: false,
      };

      const notification = await Notification.create(notificationData);
      expect(notification).toBeDefined();
      expect(notification.type).toBe("order_reminder");
      expect(notification.message).toBe("Time to place your lunch order!");
      expect(notification.read).toBe(false);
    });

    it("should create a system notification without userId", async () => {
      const notificationData = {
        type: "order_reminder", // Use a valid enum value
        message: "System maintenance scheduled",
        read: false,
      };
      const notification = await Notification.create(notificationData);
      expect(notification).toBeDefined();
      expect(notification.type).toBe("order_reminder");
      expect(notification.userId).toBeUndefined();
    });

    it("should validate notification type values", async () => {
      const notificationData = {
        userId: new mongoose.Types.ObjectId(),
        type: "invalid-type", // Invalid type
        message: "Test message",
        read: false,
      };

      await expect(Notification.create(notificationData)).rejects.toThrow();
    });

    it("should require message field", async () => {
      const notificationData = {
        userId: new mongoose.Types.ObjectId(),
        type: "order_reminder",
        read: false,
      };

      await expect(Notification.create(notificationData)).rejects.toThrow();
    });
  });
});
