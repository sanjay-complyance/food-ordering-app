import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "@/models/User";
import Menu from "@/models/Menu";
import Order from "@/models/Order";
import Notification from "@/models/Notification";
import {
  UserUtils,
  MenuUtils,
  OrderUtils,
  NotificationUtils,
  DatabaseUtils,
} from "@/lib/db-utils";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections before each test
  await Promise.all([
    User.deleteMany({}),
    Menu.deleteMany({}),
    Order.deleteMany({}),
    Notification.deleteMany({}),
  ]);
});

describe("User Model", () => {
  it("should create a valid user", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
      role: "user" as const,
    };

    const user = await UserUtils.createUser(userData);
    expect(user.email).toBe("test@example.com");
    expect(user.name).toBe("Test User");
    expect(user.role).toBe("user");
    expect(user.createdAt).toBeDefined();
  });

  it("should enforce unique email constraint", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    };

    await UserUtils.createUser(userData);

    await expect(UserUtils.createUser(userData)).rejects.toThrow();
  });

  it("should validate email format", async () => {
    const userData = {
      email: "invalid-email",
      password: "password123",
      name: "Test User",
    };

    await expect(UserUtils.createUser(userData)).rejects.toThrow();
  });

  it("should find user by email", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    };

    await UserUtils.createUser(userData);
    const foundUser = await UserUtils.findByEmail("test@example.com");

    expect(foundUser).toBeTruthy();
    expect(foundUser?.email).toBe("test@example.com");
  });

  it("should update user role", async () => {
    const userData = {
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    };

    const user = await UserUtils.createUser(userData);
    const updatedUser = await UserUtils.updateUserRole(user._id, "admin");

    expect(updatedUser?.role).toBe("admin");
  });
});

describe("Menu Model", () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await UserUtils.createUser({
      email: "admin@example.com",
      password: "password123",
      name: "Admin User",
      role: "admin",
    });
  });

  it("should create a valid menu", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const menuData = {
      date: tomorrow,
      items: [
        {
          name: "Chicken Curry",
          description: "Spicy chicken curry with rice",
          price: 12.99,
          available: true,
        },
      ],
      createdBy: testUser._id,
    };

    const menu = await MenuUtils.createMenu(menuData);
    expect(menu.items).toHaveLength(1);
    expect(menu.items[0].name).toBe("Chicken Curry");
    expect(menu.createdBy.toString()).toBe(testUser._id.toString());
  });

  it("should enforce unique date constraint", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const menuData = {
      date: tomorrow,
      items: [
        {
          name: "Chicken Curry",
          description: "Spicy chicken curry with rice",
          available: true,
        },
      ],
      createdBy: testUser._id,
    };

    await MenuUtils.createMenu(menuData);

    await expect(MenuUtils.createMenu(menuData)).rejects.toThrow();
  });

  it("should find menu by date", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const menuData = {
      date: tomorrow,
      items: [
        {
          name: "Chicken Curry",
          description: "Spicy chicken curry with rice",
          available: true,
        },
      ],
      createdBy: testUser._id,
    };

    await MenuUtils.createMenu(menuData);
    const foundMenu = await MenuUtils.findByDate(tomorrow);

    expect(foundMenu).toBeTruthy();
    expect(foundMenu?.items).toHaveLength(1);
  });
});

describe("Order Model", () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await UserUtils.createUser({
      email: "user@example.com",
      password: "password123",
      name: "Test User",
    });
  });

  it("should create a valid order", async () => {
    const today = new Date();

    const orderData = {
      userId: testUser._id,
      orderDate: today,
      menuItemName: "Chicken Curry",
      menuItemDescription: "Spicy chicken curry with rice",
      status: "pending" as const,
    };

    const order = await OrderUtils.createOrder(orderData);
    expect(order.menuItemName).toBe("Chicken Curry");
    expect(order.status).toBe("pending");
    expect(order.userId.toString()).toBe(testUser._id.toString());
  });

  it("should enforce one order per user per day", async () => {
    const today = new Date();

    const orderData = {
      userId: testUser._id,
      orderDate: today,
      menuItemName: "Chicken Curry",
      menuItemDescription: "Spicy chicken curry with rice",
    };

    await OrderUtils.createOrder(orderData);

    await expect(OrderUtils.createOrder(orderData)).rejects.toThrow();
  });

  it("should find order by user and date", async () => {
    const today = new Date();

    const orderData = {
      userId: testUser._id,
      orderDate: today,
      menuItemName: "Chicken Curry",
      menuItemDescription: "Spicy chicken curry with rice",
    };

    await OrderUtils.createOrder(orderData);
    const foundOrder = await OrderUtils.findByUserAndDate(testUser._id, today);

    expect(foundOrder).toBeTruthy();
    expect(foundOrder?.menuItemName).toBe("Chicken Curry");
  });

  it("should update order status", async () => {
    const today = new Date();

    const orderData = {
      userId: testUser._id,
      orderDate: today,
      menuItemName: "Chicken Curry",
      menuItemDescription: "Spicy chicken curry with rice",
    };

    const order = await OrderUtils.createOrder(orderData);
    const updatedOrder = await OrderUtils.updateOrderStatus(
      order._id,
      "confirmed"
    );

    expect(updatedOrder?.status).toBe("confirmed");
  });
});

describe("Notification Model", () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await UserUtils.createUser({
      email: "user@example.com",
      password: "password123",
      name: "Test User",
    });
  });

  it("should create a valid notification", async () => {
    const notificationData = {
      userId: testUser._id,
      type: "order_reminder" as const,
      message: "Don't forget to place your lunch order!",
      read: false,
    };

    const notification = await NotificationUtils.createNotification(
      notificationData
    );
    expect(notification.type).toBe("order_reminder");
    expect(notification.message).toBe(
      "Don't forget to place your lunch order!"
    );
    expect(notification.read).toBe(false);
  });

  it("should create system-wide notification", async () => {
    const notification = await NotificationUtils.createSystemNotification(
      "menu_updated",
      "Today's menu has been updated"
    );

    expect(notification.type).toBe("menu_updated");
    expect(notification.userId).toBeUndefined();
  });

  it("should mark notification as read", async () => {
    const notificationData = {
      userId: testUser._id,
      type: "order_reminder" as const,
      message: "Test notification",
    };

    const notification = await NotificationUtils.createNotification(
      notificationData
    );
    const updatedNotification = await NotificationUtils.markAsRead(
      notification._id
    );

    expect(updatedNotification?.read).toBe(true);
  });

  it("should get unread count", async () => {
    await NotificationUtils.createNotification({
      userId: testUser._id,
      type: "order_reminder",
      message: "Test 1",
    });

    await NotificationUtils.createNotification({
      userId: testUser._id,
      type: "order_confirmed",
      message: "Test 2",
    });

    const count = await NotificationUtils.getUnreadCount(testUser._id);
    expect(count).toBe(2);
  });
});

describe("Database Utils", () => {
  it("should perform health check", async () => {
    const isHealthy = await DatabaseUtils.healthCheck();
    expect(isHealthy).toBe(true);
  });
});
