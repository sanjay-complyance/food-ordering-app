import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { GET, PUT } from "@/app/api/user/preferences/route";
import User from "@/models/User";
import dbConnect from "@/lib/mongodb";

// Mock mongoose to avoid actual database connections
vi.mock("mongoose", () => ({
  connect: vi.fn().mockResolvedValue({}),
  connection: {
    readyState: 1,
  },
  models: {
    User: null,
  },
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => ({
    user: {
      email: "test@example.com",
      name: "Test User",
      role: "user",
    },
  })),
}));

// Mock User model
vi.mock("@/models/User", () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

// Mock dbConnect
vi.mock("@/lib/mongodb", () => ({
  default: vi.fn().mockResolvedValue({}),
}));

describe("User Preferences API", () => {
  beforeEach(() => {
    // Mock user data
    const mockUser = {
      _id: "user123",
      email: "test@example.com",
      name: "Test User",
      role: "user",
      notificationPreferences: {
        orderReminders: true,
        orderConfirmations: true,
        orderModifications: true,
        menuUpdates: true,
        deliveryMethod: "in_app",
        frequency: "all",
      },
      toObject: () => ({
        _id: "user123",
        email: "test@example.com",
        name: "Test User",
        role: "user",
        notificationPreferences: {
          orderReminders: true,
          orderConfirmations: true,
          orderModifications: true,
          menuUpdates: true,
          deliveryMethod: "in_app",
          frequency: "all",
        },
      }),
    };

    // Setup mocks
    vi.mocked(User.findOne).mockResolvedValue(mockUser as any);
    vi.mocked(dbConnect).mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should get user notification preferences", async () => {
    const req = new NextRequest("http://localhost/api/user/preferences", {
      method: "GET",
    });

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.preferences).toBeDefined();
    expect(data.preferences.orderReminders).toBe(true);
    expect(data.preferences.deliveryMethod).toBe("in_app");
    expect(data.preferences.frequency).toBe("all");
  });

  it("should update user notification preferences", async () => {
    const preferences = {
      orderReminders: false,
      orderConfirmations: true,
      orderModifications: true,
      menuUpdates: false,
      deliveryMethod: "email",
      frequency: "important_only",
    };

    const req = new NextRequest("http://localhost/api/user/preferences", {
      method: "PUT",
      body: JSON.stringify(preferences),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await PUT(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe("Preferences updated successfully");
    expect(data.preferences).toBeDefined();
    expect(data.preferences.orderReminders).toBe(false);
    expect(data.preferences.menuUpdates).toBe(false);
    expect(data.preferences.deliveryMethod).toBe("email");
    expect(data.preferences.frequency).toBe("important_only");

    // Verify the changes were saved to the database
    const user = await User.findOne({ email: "test@example.com" });
    expect(user.notificationPreferences.orderReminders).toBe(false);
    expect(user.notificationPreferences.menuUpdates).toBe(false);
    expect(user.notificationPreferences.deliveryMethod).toBe("email");
    expect(user.notificationPreferences.frequency).toBe("important_only");
  });

  it("should validate notification preferences", async () => {
    const invalidPreferences = {
      orderReminders: "not-a-boolean", // Invalid type
      orderConfirmations: true,
      orderModifications: true,
      menuUpdates: true,
      deliveryMethod: "in_app",
      frequency: "all",
    };

    const req = new NextRequest("http://localhost/api/user/preferences", {
      method: "PUT",
      body: JSON.stringify(invalidPreferences),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await PUT(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("should validate delivery method", async () => {
    const invalidDeliveryMethod = {
      orderReminders: true,
      orderConfirmations: true,
      orderModifications: true,
      menuUpdates: true,
      deliveryMethod: "invalid-method", // Invalid delivery method
      frequency: "all",
    };

    const req = new NextRequest("http://localhost/api/user/preferences", {
      method: "PUT",
      body: JSON.stringify(invalidDeliveryMethod),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await PUT(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("should validate frequency", async () => {
    const invalidFrequency = {
      orderReminders: true,
      orderConfirmations: true,
      orderModifications: true,
      menuUpdates: true,
      deliveryMethod: "in_app",
      frequency: "invalid-frequency", // Invalid frequency
    };

    const req = new NextRequest("http://localhost/api/user/preferences", {
      method: "PUT",
      body: JSON.stringify(invalidFrequency),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await PUT(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });
});
