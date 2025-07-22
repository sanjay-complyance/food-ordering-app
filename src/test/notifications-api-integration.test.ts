import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/mongodb", () => ({
  default: vi.fn(),
}));

vi.mock("@/models/Notification", () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
    lean: vi.fn(),
  },
}));

vi.mock("@/models/User", () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Import after mocking
import {
  GET as GET_NOTIFICATIONS,
  POST as POST_NOTIFICATION,
} from "@/app/api/notifications/route";
import { PUT as PUT_NOTIFICATION } from "@/app/api/notifications/[id]/route";
import { POST as POST_SYSTEM_NOTIFICATION } from "@/app/api/notifications/system/route";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { auth } from "@/lib/auth";

describe("Notifications API Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/notifications", () => {
    it("should return user notifications when authenticated", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock user session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          role: "user",
          name: "Test User",
        },
      });

      // Mock user lookup
      vi.mocked(User.findOne).mockResolvedValue({
        _id: "user1",
        email: "user@example.com",
        role: "user",
      });

      // Mock notifications data
      const mockNotifications = [
        {
          _id: "notif1",
          userId: "user1",
          type: "order_reminder",
          message: "Don't forget to place your lunch order",
          read: false,
          createdAt: new Date(),
        },
        {
          _id: "notif2",
          userId: "user1",
          type: "order_confirmed",
          message: "Your order has been confirmed",
          read: true,
          createdAt: new Date(),
        },
      ];

      vi.mocked(Notification.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockNotifications),
          }),
        }),
      } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications"
      );
      const response = await GET_NOTIFICATIONS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(2);
      expect(data.notifications[0]._id).toBe("notif1");
      expect(data.notifications[1]._id).toBe("notif2");
    });

    it("should return 401 when not authenticated", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock no session
      vi.mocked(auth).mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications"
      );
      const response = await GET_NOTIFICATIONS(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("PUT /api/notifications/[id]", () => {
    it("should mark notification as read", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock user session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          role: "user",
          name: "Test User",
        },
      });

      // Mock notification update
      const mockUpdatedNotification = {
        _id: "notif1",
        userId: "user1",
        type: "order_reminder",
        message: "Don't forget to place your lunch order",
        read: true, // Updated to read
        createdAt: new Date(),
        toObject: () => ({
          _id: "notif1",
          userId: "user1",
          type: "order_reminder",
          message: "Don't forget to place your lunch order",
          read: true,
          createdAt: new Date(),
        }),
      };

      // First find the notification to verify ownership
      vi.mocked(Notification.findById).mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: "notif1",
          userId: "user1", // Same as session user
        }),
      } as any);

      // Then update it
      vi.mocked(Notification.findOneAndUpdate).mockResolvedValue(
        mockUpdatedNotification as any
      );

      const request = new NextRequest(
        "http://localhost:3000/api/notifications/notif1",
        {
          method: "PUT",
          body: JSON.stringify({ read: true }),
        }
      );

      // Mock params
      const params = { id: "notif1" };

      const response = await PUT_NOTIFICATION(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notification.read).toBe(true);
    });

    it("should return 403 when trying to update another user's notification", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock user session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          role: "user",
          name: "Test User",
        },
      });

      // Find notification with different userId
      vi.mocked(Notification.findById).mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: "notif1",
          userId: "user2", // Different from session user
        }),
      } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications/notif1",
        {
          method: "PUT",
          body: JSON.stringify({ read: true }),
        }
      );

      // Mock params
      const params = { id: "notif1" };

      const response = await PUT_NOTIFICATION(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("POST /api/notifications/system", () => {
    it("should create system notifications for all users", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock admin session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin",
          name: "Admin User",
        },
      });

      // Mock users data
      const mockUsers = [
        { _id: "user1", email: "user1@example.com" },
        { _id: "user2", email: "user2@example.com" },
      ];

      vi.mocked(User.find).mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockUsers),
      } as any);

      // Mock notification creation
      vi.mocked(Notification.create).mockResolvedValue({} as unknown);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications/system",
        {
          method: "POST",
          body: JSON.stringify({
            type: "order_reminder",
            message: "Don't forget to place your lunch order",
          }),
        }
      );

      const response = await POST_SYSTEM_NOTIFICATION(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("System notifications sent successfully");
      expect(vi.mocked(Notification.create)).toHaveBeenCalledTimes(2); // Once for each user
    });

    it("should return 401 for non-admin users", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock regular user session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          role: "user",
          name: "Test User",
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/notifications/system",
        {
          method: "POST",
          body: JSON.stringify({
            type: "order_reminder",
            message: "Don't forget to place your lunch order",
          }),
        }
      );

      const response = await POST_SYSTEM_NOTIFICATION(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });
});
