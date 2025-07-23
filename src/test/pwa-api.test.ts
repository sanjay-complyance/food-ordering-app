import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock getServerSession and env
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { getServerSession } from "next-auth";

// Import the API handlers after mocks
import * as pwaApi from "@/app/api/pwa/notifications/route";

describe("/api/pwa/notifications API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VAPID_PUBLIC_KEY = "test-vapid-key";
  });

  afterEach(() => {
    delete process.env.VAPID_PUBLIC_KEY;
  });

  describe("POST", () => {
    it("should return 401 if not authenticated", async () => {
      (getServerSession as any).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/pwa/notifications", { method: "POST", body: JSON.stringify({ title: "Test" }) });
      const res = await pwaApi.POST(req);
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if title is missing", async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: "user1" } });
      const req = new NextRequest("http://localhost/api/pwa/notifications", { method: "POST", body: JSON.stringify({ body: "No title" }) });
      const res = await pwaApi.POST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toBe("Title is required");
    });

    it("should return success and notification payload", async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: "user1" } });
      const req = new NextRequest("http://localhost/api/pwa/notifications", { method: "POST", body: JSON.stringify({ title: "Test", body: "Body" }) });
      const res = await pwaApi.POST(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notification).toBeDefined();
      expect(data.notification.title).toBe("Test");
    });

    it("should handle server error", async () => {
      (getServerSession as any).mockImplementation(() => { throw new Error("fail"); });
      const req = new NextRequest("http://localhost/api/pwa/notifications", { method: "POST", body: JSON.stringify({ title: "Test" }) });
      const res = await pwaApi.POST(req);
      const data = await res.json();
      expect(res.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("GET", () => {
    it("should return 401 if not authenticated", async () => {
      (getServerSession as any).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/pwa/notifications");
      const res = await pwaApi.GET(req);
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return config and capabilities", async () => {
      (getServerSession as any).mockResolvedValue({ user: { id: "user1" } });
      const req = new NextRequest("http://localhost/api/pwa/notifications");
      const res = await pwaApi.GET(req);
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.vapidPublicKey).toBe("test-vapid-key");
      expect(data.notificationsSupported).toBe(true);
      expect(data.pushSupported).toBe(true);
    });

    it("should handle server error", async () => {
      (getServerSession as any).mockImplementation(() => { throw new Error("fail"); });
      const req = new NextRequest("http://localhost/api/pwa/notifications");
      const res = await pwaApi.GET(req);
      const data = await res.json();
      expect(res.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
}); 