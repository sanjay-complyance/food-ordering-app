import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/mongodb", () => ({
  default: vi.fn(),
}));

// Global array to track created notifications
const createdNotifications: any[] = [];

vi.mock("@/models/Notification", () => {
  class NotificationMock {
    constructor(props: Record<string, any>) {
      Object.assign(this, props);
      // Debug: log when NotificationMock is constructed
      // eslint-disable-next-line no-console
      console.log("DEBUG NotificationMock constructor", props);
    }
    async save() {
      // Debug: log when save is called
      // eslint-disable-next-line no-console
      console.log("DEBUG NotificationMock save", this);
      createdNotifications.push(this);
      return this;
    }
    static findById = vi.fn();
    static create = vi.fn();
  }
  return {
    __esModule: true,
    default: NotificationMock,
  };
});

vi.mock("@/models/User", () => ({
  __esModule: true,
  default: {
    findOne: () => ({
      exec: async () => ({
        _id: "user1",
        email: "user@example.com",
        role: "user",
        name: "Test User",
        notificationPreferences: {
          frequency: "immediate",
        },
      }),
    }),
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
import { auth } from "@/lib/auth";

let Notification: any;
let User: any;

describe("Notifications API Integration Tests", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear created notifications before each test
    createdNotifications.length = 0;
    // Dynamically import models for each test
    Notification = (await import("@/models/Notification")).default;
    User = (await import("@/models/User")).default;
    Notification.findById = undefined;
    Notification.create = undefined;
    User.find = undefined;
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

      // Mock notifications data
      const notifications = [
        { _id: "notif1", user: "user1", message: "Test notification 1", read: false },
        { _id: "notif2", user: "user1", message: "Test notification 2", read: false },
      ];
      Notification.find = () => ({
        sort: function () { return this; },
        limit: function () { return this; },
        lean: function () { return { ...this, exec: async () => notifications, then: (onFulfilled: any) => Promise.resolve(notifications).then(onFulfilled) }; },
        exec: async () => notifications,
        then: (onFulfilled: any) => Promise.resolve(notifications).then(onFulfilled),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/notifications"
      );
      const response = await GET_NOTIFICATIONS(request);
      const data = await response.json();
      if (response.status !== 200) {
        // eslint-disable-next-line no-console
        console.log('GET /api/notifications debug:', data);
      }
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
      const NotificationMock = (await import("@/models/Notification")).default;
      NotificationMock.findById = async () => {
        const instance = new NotificationMock({ userId: "user1", read: false });
        instance._id = "notif1";
        instance.userId = "user1";
        return instance;
      };

      // Mock User.findOne to return a user with _id
      User.findOne = vi.fn().mockResolvedValue({
        _id: "user1",
        email: "user1@example.com",
        role: "user",
        name: "Test User",
      });

      // Then update it
      Notification.findOneAndUpdate = vi.fn().mockResolvedValue(
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
      const NotificationMock = (await import("@/models/Notification")).default;
      NotificationMock.findById = async () => {
        const instance = new NotificationMock({ userId: "otheruser", read: false });
        instance._id = "notif1";
        instance.userId = "otheruser";
        return instance;
      };

      // Mock User.findOne to return a user with _id different from notification.userId
      User.findOne = vi.fn().mockResolvedValue({
        _id: "user2",
        email: "user2@example.com",
        role: "user",
        name: "Other User",
      });

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
        { _id: "user1", email: "user1@example.com", notificationPreferences: { frequency: "immediate" } },
        { _id: "user2", email: "user2@example.com", notificationPreferences: { frequency: "immediate" } },
      ];

      // Mock User.findOne to return an admin user
      User.findOne = vi.fn().mockResolvedValue({
        _id: "admin1",
        email: "admin@example.com",
        role: "admin",
        name: "Admin User",
      });

      User.find = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockUsers),
        then: (onFulfilled: any) => Promise.resolve(mockUsers).then(onFulfilled),
      });

      // Mock Notification as a constructible function/class and collect created notifications
      const NotificationMock = (await import("@/models/Notification")).default;
      NotificationMock.create = vi.fn().mockResolvedValue({} as unknown);

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

      expect(response.status).toBe(201);
      expect(Array.isArray(data.notifications)).toBe(true);
      expect(typeof data.count).toBe("number");
      // Log the users returned by User.find().exec()
      const users = await User.find().exec();
      // eslint-disable-next-line no-console
      console.log("DEBUG users from User.find().exec()", users);
      // Instead, check that the notifications array has the expected length (1 system-wide notification)
      expect(createdNotifications.length).toBe(1);
      expect(createdNotifications[0].userId).toBe(null);
    });

    it("should return 403 for non-admin users", async () => {
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

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });
});
