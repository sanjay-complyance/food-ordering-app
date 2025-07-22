import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/mongodb", () => ({
  default: vi.fn(),
}));

vi.mock("@/models/Order", () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
}));

vi.mock("@/models/Notification", () => ({
  default: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getServerSession: vi.fn(),
}));

// Import after mocking
import { GET, POST, PUT } from "@/app/api/orders/route";
import {
  GET as GET_ADMIN,
  POST as POST_PROCESS,
} from "@/app/api/admin/orders/route";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Notification from "@/models/Notification";
import { getServerSession } from "@/lib/auth";

describe("Orders API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/orders", () => {
    it("should return user orders successfully", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock user session
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          role: "user",
        },
      });

      // Mock order data
      const mockOrders = [
        {
          _id: "order1",
          userId: "user1",
          orderDate: new Date("2025-07-21"),
          menuItemName: "Pasta",
          menuItemDescription: "Italian pasta",
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(Order.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockOrders),
        }),
      } as any);

      const request = new NextRequest("http://localhost:3000/api/orders");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orders).toHaveLength(1);
      expect(data.orders[0]._id).toBe("order1");
    });

    it("should handle database errors", async () => {
      // Mock database connection failure
      vi.mocked(dbConnect).mockRejectedValue(
        new Error("Database connection failed")
      );

      // Mock user session
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          role: "user",
        },
      });

      const request = new NextRequest("http://localhost:3000/api/orders");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("POST /api/orders", () => {
    it("should create order successfully", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock user session
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          name: "Test User",
          role: "user",
        },
      });

      // Mock order creation
      const mockCreatedOrder = {
        _id: "newOrder1",
        userId: "user1",
        orderDate: new Date("2025-07-21"),
        menuItemName: "Burger",
        menuItemDescription: "Beef burger",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(Order.create).mockResolvedValue(mockCreatedOrder as any);

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          menuItemName: "Burger",
          menuItemDescription: "Beef burger",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.order._id).toBe("newOrder1");
    });
  });

  describe("PUT /api/orders", () => {
    it("should update order successfully", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock user session
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          name: "Test User",
          role: "user",
        },
      });

      // Mock finding existing order
      vi.mocked(Order.findOne).mockResolvedValue({
        _id: "order1",
        userId: "user1",
        status: "pending",
      } as any);

      // Mock order update
      const mockUpdatedOrder = {
        _id: "order1",
        userId: "user1",
        orderDate: new Date("2025-07-21"),
        menuItemName: "Updated Burger",
        menuItemDescription: "Updated beef burger",
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(Order.findOneAndUpdate).mockResolvedValue(
        mockUpdatedOrder as any
      );

      // Mock notification creation
      vi.mocked(Notification.create).mockResolvedValue({
        _id: "notification1",
        type: "order_modified",
      } as any);

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "PUT",
        body: JSON.stringify({
          id: "order1",
          menuItemName: "Updated Burger",
          menuItemDescription: "Updated beef burger",
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.order._id).toBe("order1");
      expect(data.order.menuItemName).toBe("Updated Burger");

      // Verify notification was created
      expect(Notification.create).toHaveBeenCalled();
    });

    it("should prevent updating processed orders", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock user session
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          role: "user",
        },
      });

      // Mock finding existing order that's already processed
      vi.mocked(Order.findOne).mockResolvedValue({
        _id: "order1",
        userId: "user1",
        status: "confirmed", // Already processed
      } as any);

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "PUT",
        body: JSON.stringify({
          id: "order1",
          menuItemName: "Updated Burger",
          menuItemDescription: "Updated beef burger",
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot modify a processed order");
    });
  });

  describe("GET /api/admin/orders", () => {
    it("should return all orders for admin", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock admin session
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin",
        },
      });

      // Mock order data
      const mockOrders = [
        {
          _id: "order1",
          userId: "user1",
          orderDate: new Date("2025-07-21"),
          menuItemName: "Pasta",
          menuItemDescription: "Italian pasta",
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: "order2",
          userId: "user2",
          orderDate: new Date("2025-07-21"),
          menuItemName: "Burger",
          menuItemDescription: "Beef burger",
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(Order.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockOrders),
        }),
      } as any);

      const request = new NextRequest("http://localhost:3000/api/admin/orders");
      const response = await GET_ADMIN(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orders).toHaveLength(2);
    });

    it("should return 401 for non-admin users", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock regular user session
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          role: "user",
        },
      });

      const request = new NextRequest("http://localhost:3000/api/admin/orders");
      const response = await GET_ADMIN(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("POST /api/admin/orders/process", () => {
    it("should process orders successfully as admin", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock admin session
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin",
        },
      });

      // Mock finding orders to process
      const mockOrders = [
        {
          _id: "order1",
          userId: "user1",
          status: "pending",
        },
        {
          _id: "order2",
          userId: "user2",
          status: "pending",
        },
      ];

      vi.mocked(Order.find).mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockOrders),
      } as any);

      // Mock updating orders
      vi.mocked(Order.findOneAndUpdate).mockResolvedValue({
        status: "confirmed",
      } as any);

      // Mock notification creation
      vi.mocked(Notification.create).mockResolvedValue({} as any);

      const request = new NextRequest(
        "http://localhost:3000/api/admin/orders/process",
        {
          method: "POST",
          body: JSON.stringify({
            date: "2025-07-21",
          }),
        }
      );

      const response = await POST_PROCESS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Orders processed successfully");

      // Verify notifications were created
      expect(Notification.create).toHaveBeenCalledTimes(2);
    });
  });
});
