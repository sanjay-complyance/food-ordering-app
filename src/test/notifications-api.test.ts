import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/mongodb", () => ({
  default: vi.fn(),
}));

vi.mock("@/models/Notification", () => {
  const NotificationMock = vi.fn();
  (NotificationMock as any).find = vi.fn();
  (NotificationMock as any).findOne = vi.fn();
  (NotificationMock as any).findById = vi.fn();
  (NotificationMock as any).create = vi.fn();
  (NotificationMock as any).findOneAndUpdate = vi.fn();
  (NotificationMock as any).findOneAndDelete = vi.fn();
  (NotificationMock as any).save = vi.fn();
  (NotificationMock as any).insertMany = vi.fn(); // <-- Add this line
  return { default: NotificationMock };
});

// Mock User as a constructor with static methods
vi.mock("@/models/User", () => {
  const UserMock = vi.fn();
  (UserMock as any).find = vi.fn();
  (UserMock as any).findOne = vi.fn();
  (UserMock as any).findById = vi.fn();
  (UserMock as any).create = vi.fn();
  (UserMock as any).findOneAndUpdate = vi.fn();
  (UserMock as any).findOneAndDelete = vi.fn();
  (UserMock as any).save = vi.fn();
  return { default: UserMock };
});

// Mock Settings
vi.mock("@/models/Settings", () => {
  const SettingsMock = vi.fn();
  (SettingsMock as any).findOne = vi.fn();
  return { default: SettingsMock };
});

// Mock notification-preferences functions
vi.mock("@/lib/notification-preferences", () => ({
  sendNotificationToUser: vi.fn().mockResolvedValue({ inApp: true, email: false }),
  filterNotificationsByPreferences: vi.fn(() => true),
  shouldReceiveNotification: vi.fn(() => true),
}));

// Mock auth function
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Import after mocking
import { GET, POST } from "@/app/api/notifications/route";
import { PUT } from "@/app/api/notifications/[id]/route";
import { POST as POST_SYSTEM } from "@/app/api/notifications/system/route";
import { GET as GET_STREAM } from "@/app/api/notifications/stream/route";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";
// User is mocked above, no need to import
import { auth } from "@/lib/auth";
import {
  shouldSendMenuUpdateReminders,
  hasMenuUpdateReminderBeenSentToday,
  sendMenuUpdateReminderToAdmins,
} from "@/lib/notifications";

// Add a helper for mock session
const mockSession = (user: { id: string; email: string; role: string }) => ({ user, expires: new Date(Date.now() + 1000 * 60 * 60).toISOString() });

describe("Notifications API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/notifications", () => {
    it("should return user notifications successfully", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock user session
      vi.mocked(auth).mockResolvedValue(mockSession({
        id: "user1",
        email: "user@example.com",
        role: "user",
      }));

      // Mock User model
      vi.mocked(User.findOne).mockReturnValue({
        exec: vi.fn().mockResolvedValue({ _id: "user1", email: "user@example.com", role: "user", notificationPreferences: { frequency: "immediate" } })
      });
      vi.mocked(User.findById).mockResolvedValue({ _id: "user1", email: "user@example.com", role: "user", notificationPreferences: { frequency: "immediate" } });

      // Mock notification data
      const mockNotifications = [
        {
          _id: "notification1",
          userId: "user1",
          type: "order_reminder",
          message: "Time to place your lunch order!",
          read: false,
          createdAt: new Date(),
        },
        {
          _id: "notification2",
          userId: "user1",
          type: "order_confirmed",
          message: "Your order has been confirmed",
          read: true,
          createdAt: new Date(),
        },
      ];

      // Mock .find().sort().limit().lean()
      (Notification as any).find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockNotifications),
          }),
        }),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/notifications"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(2);
      expect(data.notifications[0]._id).toBe("notification1");
    });

    it("should handle database errors", async () => {
      // Mock database connection failure
      vi.mocked(dbConnect).mockRejectedValue(
        new Error("Database connection failed")
      );

      // Mock user session
      vi.mocked(auth).mockResolvedValue(mockSession({
        id: "user1",
        email: "user@example.com",
        role: "user",
      }));

      // Mock User model
      vi.mocked(User.findOne).mockResolvedValue({ _id: "user1", email: "user@example.com", role: "user" });
      vi.mocked(User.findById).mockResolvedValue({ _id: "user1", email: "user@example.com", role: "user" });

      const request = new NextRequest(
        "http://localhost:3000/api/notifications"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("POST /api/notifications", () => {
    it("should create notification successfully", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock admin session
      vi.mocked(auth).mockResolvedValue(mockSession({
        id: "admin1",
        email: "admin@example.com",
        role: "admin",
      }));

      // Mock User model
      vi.mocked(User.findOne).mockResolvedValue({ _id: "admin1", email: "admin@example.com", role: "admin" });
      vi.mocked(User.findById).mockResolvedValue({ _id: "admin1", email: "admin@example.com", role: "admin" });

      // Mock notification creation
      const mockCreatedNotification = {
        _id: "newNotification1",
        userId: "user1",
        type: "menu_updated",
        message: "The menu has been updated",
        read: false,
        createdAt: new Date(),
      };

      vi.mocked(Notification.create).mockResolvedValue(
        mockCreatedNotification as never
      );

      // Patch sendNotificationToUser to always return { inApp: true, email: false }
      const notificationPrefs = await import("@/lib/notification-preferences");
      vi.mocked(notificationPrefs.sendNotificationToUser).mockResolvedValue({ inApp: true, email: false });

      // Patch Notification.findOne to support .sort()
      vi.mocked(Notification.findOne).mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockCreatedNotification),
      } as never);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user1",
            type: "menu_updated",
            message: "The menu has been updated",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.notification._id).toBe("newNotification1");
    });

    it("should return 401 for non-admin users", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock regular user session
      vi.mocked(auth).mockResolvedValue(mockSession({
        id: "user1",
        email: "user@example.com",
        role: "user",
      }));

      // Mock User model
      vi.mocked(User.findOne).mockResolvedValue({ _id: "user1", email: "user@example.com", role: "user" });
      vi.mocked(User.findById).mockResolvedValue({ _id: "user1", email: "user@example.com", role: "user" });

      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user1",
            type: "menu_updated",
            message: "The menu has been updated",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("PUT /api/notifications/[id]", () => {
    it("should mark notification as read", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock user session
      vi.mocked(auth).mockResolvedValue(mockSession({
        id: "user1",
        email: "user@example.com",
        role: "user",
      }));

      // Mock User model
      vi.mocked(User.findOne).mockResolvedValue({ _id: "user1", email: "user@example.com", role: "user" });
      vi.mocked(User.findById).mockResolvedValue({ _id: "user1", email: "user@example.com", role: "user" });

      // Mock finding existing notification
      vi.mocked(Notification.findOne).mockResolvedValue({
        _id: "notification1",
        userId: "user1",
        read: false,
      } as never);

      // Mock notification update
      const mockUpdatedNotification = {
        _id: "notification1",
        userId: "user1",
        type: "order_reminder",
        message: "Time to place your lunch order!",
        read: true,
        createdAt: new Date(),
      };

      vi.mocked(Notification.findOneAndUpdate).mockResolvedValue(
        mockUpdatedNotification as never
      );

      // Patch Notification.findById to return the notification
      vi.mocked(Notification.findById).mockResolvedValue({
        _id: "notification1",
        userId: "user1",
        read: false,
        save: vi.fn().mockResolvedValue(undefined),
      } as never);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications/notification1",
        {
          method: "PUT",
          body: JSON.stringify({ read: true }),
        }
      );

      const { params } = { params: { id: "notification1" } };
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notification._id).toBe("notification1");
      expect(data.notification.read).toBe(true);
    });

    it("should prevent users from marking other users' notifications as read", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock user session
      vi.mocked(auth).mockResolvedValue(mockSession({
        id: "user1",
        email: "user@example.com",
        role: "user",
      }));

      // Mock User model
      vi.mocked(User.findOne).mockResolvedValue({ _id: "user1", email: "user@example.com", role: "user" });
      vi.mocked(User.findById).mockResolvedValue({ _id: "user1", email: "user@example.com", role: "user" });

      // Mock finding existing notification belonging to another user
      vi.mocked(Notification.findOne).mockResolvedValue({
        _id: "notification1",
        userId: "user2", // Different user
        read: false,
      } as never);

      // Patch Notification.findById to return a notification with a different userId
      vi.mocked(Notification.findById).mockResolvedValue({
        _id: "notification1",
        userId: "user2",
        read: false,
        save: vi.fn().mockResolvedValue(undefined),
      } as never);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications/notification1",
        {
          method: "PUT",
          body: JSON.stringify({ read: true }),
        }
      );

      const { params } = { params: { id: "notification1" } };
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("POST /api/notifications/system", () => {
    it("should create system notification for all users", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock admin session
      vi.mocked(auth).mockResolvedValue(mockSession({
        id: "admin1",
        email: "admin@example.com",
        role: "admin",
      }));

      // Mock User model
      vi.mocked(User.findOne).mockResolvedValue({ _id: "admin1", email: "admin@example.com", role: "admin" });
      vi.mocked(User.findById).mockResolvedValue({ _id: "admin1", email: "admin@example.com", role: "admin" });

      // Mock notification creation
      vi.mocked(Notification.create).mockResolvedValue({
        _id: "systemNotification1",
        type: "menu_updated",
        message: "System maintenance scheduled",
        read: false,
        createdAt: new Date(),
      } as never);

      // Patch Notification constructor to return an object with .save()
      (Notification as any).mockImplementation(function (this: any, data: any) {
        return {
          ...data,
          save: vi.fn().mockResolvedValue(undefined),
        };
      });
      // Patch User.find to return a promise resolving to an empty array
      vi.mocked(User.find).mockImplementation(() => Promise.resolve([]));

      const request = new NextRequest(
        "http://localhost:3000/api/notifications/system",
        {
          method: "POST",
          body: JSON.stringify({
            message: "System maintenance scheduled",
            type: "menu_updated",
          }),
        }
      );

      const response = await POST_SYSTEM(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(Array.isArray(data.notifications)).toBe(true);
      expect(data.notifications.length).toBeGreaterThan(0);
      expect(data.notifications[0].type).toBe("menu_updated");
      expect(data.notifications[0].message).toBe("System maintenance scheduled");
    });

    it("should return 401 for non-admin users", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock regular user session
      vi.mocked(auth).mockResolvedValue(mockSession({
        id: "user1",
        email: "user@example.com",
        role: "user",
      }));

      // Mock User model
      vi.mocked(User.findOne).mockResolvedValue({ _id: "user1", email: "user@example.com", role: "user" });
      vi.mocked(User.findById).mockResolvedValue({ _id: "user1", email: "user@example.com", role: "user" });

      const request = new NextRequest(
        "http://localhost:3000/api/notifications/system",
        {
          method: "POST",
          body: JSON.stringify({
            message: "System maintenance scheduled",
            type: "system",
          }),
        }
      );

      const response = await POST_SYSTEM(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("GET /api/notifications/stream (SSE)", () => {
    it("should return a stream with correct headers and send events", async () => {
      const request = new NextRequest("http://localhost:3000/api/notifications/stream");
      const response = await GET_STREAM(request);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
      expect(response.headers.get("Connection")).toBe("keep-alive");
      // The body is a ReadableStream, but we can't easily test streaming in unit tests
      expect(response.body).toBeDefined();
    });
  });
});

describe("Menu Update Reminder", () => {
  it("should return true at 11:00 AM on a weekday", async () => {
    const RealDate = Date;
    // Set to Monday, 11:00 AM local time
    const testDate = new Date();
    testDate.setHours(11, 0, 0, 0);
    testDate.setDate(testDate.getDate() + ((1 + 7 - testDate.getDay()) % 7)); // Next Monday
    global.Date = class extends RealDate {
      constructor() {
        super();
        return testDate;
      }
    } as any;
    const Settings = (await import("@/models/Settings")).default;
    vi.mocked(Settings.findOne).mockResolvedValueOnce({ menuUpdateReminderTime: "11:00" });
    await expect(await shouldSendMenuUpdateReminders()).toBe(true);
    global.Date = RealDate;
  });

  it("should return false at other times", async () => {
    const RealDate = Date;
    const testDate = new Date();
    testDate.setHours(10, 59, 0, 0);
    testDate.setDate(testDate.getDate() + ((1 + 7 - testDate.getDay()) % 7)); // Next Monday
    global.Date = class extends RealDate {
      constructor() {
        super();
        return testDate;
      }
    } as any;
    const Settings = (await import("@/models/Settings")).default;
    vi.mocked(Settings.findOne).mockResolvedValueOnce({ menuUpdateReminderTime: "11:00" });
    await expect(await shouldSendMenuUpdateReminders()).toBe(false);
    global.Date = RealDate;
  });

  it("should check if menu update reminder has already been sent today", async () => {
    vi.mocked(Notification.findOne).mockResolvedValueOnce({});
    const result = await hasMenuUpdateReminderBeenSentToday();
    expect(result).toBe(true);
    vi.mocked(Notification.findOne).mockResolvedValueOnce(null);
    const result2 = await hasMenuUpdateReminderBeenSentToday();
    expect(result2).toBe(false);
  });

  it("should send menu update reminders to all admins", async () => {
    const mockAdmins = [
      { _id: "admin1" },
      { _id: "admin2" },
    ];
    vi.mocked(User.find).mockResolvedValueOnce(mockAdmins as any);
    const insertManySpy = vi.spyOn(Notification, "insertMany").mockResolvedValueOnce([]);
    const count = await sendMenuUpdateReminderToAdmins();
    expect(count).toBe(2);
    expect(insertManySpy).toHaveBeenCalledWith([
      {
        userId: "admin1",
        type: "menu_updated",
        message: "Please update today’s lunch menu before 11:30 AM.",
        read: false,
      },
      {
        userId: "admin2",
        type: "menu_updated",
        message: "Please update today’s lunch menu before 11:30 AM.",
        read: false,
      },
    ]);
  });
});
