import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies first
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/mongodb", () => ({
  connectDB: vi.fn(),
}));

vi.mock("@/models/Notification", () => {
  const mockConstructor = vi.fn();
  const mockStatic = {
    find: vi.fn(),
    findOne: vi.fn(),
    findByIdAndDelete: vi.fn(),
    insertMany: vi.fn(),
    deleteMany: vi.fn(),
    countDocuments: vi.fn(),
  };
  return {
    default: Object.assign(mockConstructor, mockStatic),
  };
});

vi.mock("@/models/User", () => ({
  default: {
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock("@/models/Order", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock("@/models/Menu", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

// Import after mocking
import { getServerSession } from "next-auth";
import { connectDB } from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";
import {
  GET as getNotifications,
  POST as createNotification,
} from "@/app/api/notifications/route";
import {
  PUT as updateNotification,
  DELETE as deleteNotification,
} from "@/app/api/notifications/[id]/route";
import {
  GET as getSystemCheck,
  POST as systemAction,
} from "@/app/api/notifications/system/route";

const mockGetServerSession = vi.mocked(getServerSession);
const mockConnectDB = vi.mocked(connectDB);
const mockNotification = vi.mocked(Notification);
const mockUser = vi.mocked(User);

describe("Notifications API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/notifications", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/notifications");
      const response = await getNotifications(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 if user is not found", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "test@example.com" },
      } as any);

      mockUser.findOne.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/notifications");
      const response = await getNotifications(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should return notifications for authenticated user", async () => {
      const mockUserDoc = {
        _id: "user123",
        email: "test@example.com",
        role: "user",
      };

      const mockNotifications = [
        {
          _id: "notif1",
          userId: "user123",
          type: "order_reminder",
          message: "Don't forget to order lunch!",
          read: false,
          createdAt: new Date().toISOString(),
        },
      ];

      mockGetServerSession.mockResolvedValue({
        user: { email: "test@example.com" },
      } as any);

      mockUser.findOne.mockResolvedValue(mockUserDoc);
      mockNotification.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockNotifications),
          }),
        }),
      } as any);

      const request = new NextRequest("http://localhost/api/notifications");
      const response = await getNotifications(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toEqual(mockNotifications);
    });

    it("should filter unread notifications when unreadOnly=true", async () => {
      const mockUserDoc = {
        _id: "user123",
        email: "test@example.com",
        role: "user",
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: "test@example.com" },
      } as any);

      mockUser.findOne.mockResolvedValue(mockUserDoc);
      mockNotification.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const request = new NextRequest(
        "http://localhost/api/notifications?unreadOnly=true"
      );
      const response = await getNotifications(request);

      expect(response.status).toBe(200);
      expect(mockNotification.find).toHaveBeenCalledWith(
        expect.objectContaining({
          read: false,
        })
      );
    });
  });

  describe("POST /api/notifications", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          type: "order_reminder",
          message: "Test notification",
        }),
      });

      const response = await createNotification(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if user is not admin or superuser", async () => {
      const mockUserDoc = {
        _id: "user123",
        email: "test@example.com",
        role: "user",
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: "test@example.com" },
      } as any);

      mockUser.findOne.mockResolvedValue(mockUserDoc);

      const request = new NextRequest("http://localhost/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          type: "order_reminder",
          message: "Test notification",
        }),
      });

      const response = await createNotification(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should create notification for admin user", async () => {
      const mockUserDoc = {
        _id: "admin123",
        email: "admin@example.com",
        role: "admin",
      };

      const mockNotificationDoc = {
        _id: "notif123",
        userId: null,
        type: "order_reminder",
        message: "Test notification",
        read: false,
        save: vi.fn().mockResolvedValue(undefined),
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@example.com" },
      } as any);

      mockUser.findOne.mockResolvedValue(mockUserDoc);
      mockNotification.mockImplementation(() => mockNotificationDoc as any);

      const request = new NextRequest("http://localhost/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          type: "order_reminder",
          message: "Test notification",
        }),
      });

      const response = await createNotification(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.notification).toBeDefined();
      expect(mockNotificationDoc.save).toHaveBeenCalled();
    });

    it("should return 400 for invalid notification type", async () => {
      const mockUserDoc = {
        _id: "admin123",
        email: "admin@example.com",
        role: "admin",
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@example.com" },
      } as any);

      mockUser.findOne.mockResolvedValue(mockUserDoc);

      const request = new NextRequest("http://localhost/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          type: "invalid_type",
          message: "Test notification",
        }),
      });

      const response = await createNotification(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid notification type");
    });
  });

  describe("PUT /api/notifications/[id]", () => {
    it("should update notification read status", async () => {
      const mockUserDoc = {
        _id: "user123",
        email: "test@example.com",
        role: "user",
      };

      const mockNotificationDoc = {
        _id: "notif123",
        userId: "user123",
        read: false,
        save: vi.fn().mockResolvedValue(undefined),
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: "test@example.com" },
      } as any);

      mockUser.findOne.mockResolvedValue(mockUserDoc);
      mockNotification.findOne.mockResolvedValue(mockNotificationDoc);

      const request = new NextRequest(
        "http://localhost/api/notifications/notif123",
        {
          method: "PUT",
          body: JSON.stringify({ read: true }),
        }
      );

      const response = await updateNotification(request, {
        params: { id: "notif123" },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockNotificationDoc.read).toBe(true);
      expect(mockNotificationDoc.save).toHaveBeenCalled();
    });

    it("should return 404 if notification not found", async () => {
      const mockUserDoc = {
        _id: "user123",
        email: "test@example.com",
        role: "user",
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: "test@example.com" },
      } as any);

      mockUser.findOne.mockResolvedValue(mockUserDoc);
      mockNotification.findOne.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/notifications/notif123",
        {
          method: "PUT",
          body: JSON.stringify({ read: true }),
        }
      );

      const response = await updateNotification(request, {
        params: { id: "notif123" },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Notification not found");
    });
  });

  describe("DELETE /api/notifications/[id]", () => {
    it("should delete notification for admin user", async () => {
      const mockUserDoc = {
        _id: "admin123",
        email: "admin@example.com",
        role: "admin",
      };

      const mockNotificationDoc = {
        _id: "notif123",
        userId: "user123",
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: "admin@example.com" },
      } as any);

      mockUser.findOne.mockResolvedValue(mockUserDoc);
      mockNotification.findByIdAndDelete.mockResolvedValue(mockNotificationDoc);

      const request = new NextRequest(
        "http://localhost/api/notifications/notif123",
        {
          method: "DELETE",
        }
      );

      const response = await deleteNotification(request, {
        params: { id: "notif123" },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Notification deleted successfully");
    });

    it("should return 403 for non-admin user", async () => {
      const mockUserDoc = {
        _id: "user123",
        email: "test@example.com",
        role: "user",
      };

      mockGetServerSession.mockResolvedValue({
        user: { email: "test@example.com" },
      } as any);

      mockUser.findOne.mockResolvedValue(mockUserDoc);

      const request = new NextRequest(
        "http://localhost/api/notifications/notif123",
        {
          method: "DELETE",
        }
      );

      const response = await deleteNotification(request, {
        params: { id: "notif123" },
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("GET /api/notifications/system", () => {
    it("should return false when not checking time", async () => {
      const request = new NextRequest(
        "http://localhost/api/notifications/system"
      );
      const response = await getSystemCheck(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.shouldSendReminders).toBe(false);
    });

    it("should return true when it's 10:30 AM on weekday and no reminders sent", async () => {
      // Mock Date to be 10:30 AM on a Tuesday (local time)
      const mockDate = new Date("2024-01-02T10:30:00"); // Tuesday local time
      vi.setSystemTime(mockDate);

      mockNotification.findOne.mockResolvedValue(null); // No existing reminders

      const request = new NextRequest(
        "http://localhost/api/notifications/system?checkTime=true"
      );
      const response = await getSystemCheck(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.shouldSendReminders).toBe(true);
      expect(data.isWeekday).toBe(true);
      expect(data.isReminderTime).toBe(true);
    });

    it("should return false when reminders already sent today", async () => {
      // Mock Date to be 10:30 AM on a Tuesday
      const mockDate = new Date("2024-01-02T10:30:00.000Z"); // Tuesday
      vi.setSystemTime(mockDate);

      mockNotification.findOne.mockResolvedValue({ _id: "existing" }); // Existing reminder

      const request = new NextRequest(
        "http://localhost/api/notifications/system?checkTime=true"
      );
      const response = await getSystemCheck(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.shouldSendReminders).toBe(false);
    });
  });

  describe("POST /api/notifications/system", () => {
    it("should send daily reminders", async () => {
      const mockUsers = [{ _id: "user1" }, { _id: "user2" }];

      const mockMenu = {
        _id: "menu1",
        items: [{ name: "Pizza", description: "Delicious pizza" }],
      };

      // Import the mocked modules
      const Menu = await import("@/models/Menu");
      const Order = await import("@/models/Order");

      mockUser.find.mockResolvedValue(mockUsers);
      vi.mocked(Menu.default.findOne).mockResolvedValue(mockMenu);
      vi.mocked(Order.default.findOne).mockResolvedValue(null);
      mockNotification.insertMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/notifications/system",
        {
          method: "POST",
          body: JSON.stringify({
            action: "send_daily_reminders",
            date: "2024-01-02",
          }),
        }
      );

      const response = await systemAction(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Daily reminders sent successfully");
      expect(data.count).toBe(2);
      expect(data.hasMenu).toBe(true);
    });

    it("should cleanup old notifications", async () => {
      mockNotification.deleteMany.mockResolvedValue({ deletedCount: 5 });

      const request = new NextRequest(
        "http://localhost/api/notifications/system",
        {
          method: "POST",
          body: JSON.stringify({
            action: "cleanup_old_notifications",
          }),
        }
      );

      const response = await systemAction(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Old notifications cleaned up successfully");
      expect(data.deletedCount).toBe(5);
    });

    it("should return 400 for invalid action", async () => {
      const request = new NextRequest(
        "http://localhost/api/notifications/system",
        {
          method: "POST",
          body: JSON.stringify({
            action: "invalid_action",
          }),
        }
      );

      const response = await systemAction(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid action");
    });
  });
});
