import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/mongodb", () => ({
  default: vi.fn(),
}));

vi.mock("@/models/Order", () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock("@/models/Menu", () => ({
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
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
import { GET as GET_ORDERS, POST as POST_ORDER } from "@/app/api/orders/route";
import { PUT as UPDATE_ORDER_STATUS } from "@/app/api/orders/[id]/status/route";
import { POST as PROCESS_ORDERS } from "@/app/api/admin/orders/process/route";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Menu from "@/models/Menu";
import Notification from "@/models/Notification";
import { getServerSession } from "@/lib/auth";

describe("Orders API Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/orders", () => {
    it("should return user orders when authenticated", async () => {
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

      // Mock orders data
      const mockOrders = [
        {
          _id: "order1",
          userId: "user1",
          menuId: "menu1",
          menuItemIndex: 0,
          status: "pending",
          orderDate: new Date(),
          toObject: () => ({
            _id: "order1",
            userId: "user1",
            menuId: "menu1",
            menuItemIndex: 0,
            status: "pending",
            orderDate: new Date(),
          }),
        },
        {
          _id: "order2",
          userId: "user1",
          menuId: "menu2",
          menuItemIndex: 1,
          status: "processed",
          orderDate: new Date(),
          toObject: () => ({
            _id: "order2",
            userId: "user1",
            menuId: "menu2",
            menuItemIndex: 1,
            status: "processed",
            orderDate: new Date(),
          }),
        },
      ];

      vi.mocked(Order.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockOrders),
        }),
      } as any);

      const request = new NextRequest("http://localhost:3000/api/orders");
      const response = await GET_ORDERS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orders).toHaveLength(2);
      expect(data.orders[0]._id).toBe("order1");
      expect(data.orders[1]._id).toBe("order2");
    });

    it("should return all orders for admin users", async () => {
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

      // Mock orders data
      const mockOrders = [
        {
          _id: "order1",
          userId: "user1",
          menuId: "menu1",
          menuItemIndex: 0,
          status: "pending",
          orderDate: new Date(),
          toObject: () => ({
            _id: "order1",
            userId: "user1",
            menuId: "menu1",
            menuItemIndex: 0,
            status: "pending",
            orderDate: new Date(),
          }),
        },
        {
          _id: "order2",
          userId: "user2",
          menuId: "menu1",
          menuItemIndex: 1,
          status: "pending",
          orderDate: new Date(),
          toObject: () => ({
            _id: "order2",
            userId: "user2",
            menuId: "menu1",
            menuItemIndex: 1,
            status: "pending",
            orderDate: new Date(),
          }),
        },
      ];

      vi.mocked(Order.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockOrders),
        }),
      } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/orders?all=true"
      );
      const response = await GET_ORDERS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.orders).toHaveLength(2);
      expect(data.orders[0]._id).toBe("order1");
      expect(data.orders[1]._id).toBe("order2");
    });

    it("should return 401 when not authenticated", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock no session
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/orders");
      const response = await GET_ORDERS(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("POST /api/orders", () => {
    it("should create a new order when authenticated", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock user session
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          role: "user",
          name: "Test User",
        },
      });

      // Mock menu data
      const mockMenu = {
        _id: "menu1",
        date: new Date(),
        items: [
          { name: "Pasta", description: "Italian pasta", available: true },
          { name: "Salad", description: "Fresh salad", available: true },
        ],
      };

      vi.mocked(Menu.findById).mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockMenu),
      } as any);

      // Mock order creation
      const mockCreatedOrder = {
        _id: "newOrder",
        userId: "user1",
        menuId: "menu1",
        menuItemIndex: 0,
        status: "pending",
        orderDate: new Date(),
        toObject: () => ({
          _id: "newOrder",
          userId: "user1",
          menuId: "menu1",
          menuItemIndex: 0,
          status: "pending",
          orderDate: new Date(),
        }),
      };

      vi.mocked(Order.create).mockResolvedValue(mockCreatedOrder as any);

      // Mock existing order check
      vi.mocked(Order.findOne).mockReturnValue({
        exec: vi.fn().mockResolvedValue(null), // No existing order
      } as any);

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          menuId: "menu1",
          menuItemIndex: 0,
        }),
      });

      const response = await POST_ORDER(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.order._id).toBe("newOrder");
      expect(data.order.menuId).toBe("menu1");
      expect(data.order.menuItemIndex).toBe(0);
    });

    it("should update existing order when one exists for the day", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock user session
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          role: "user",
          name: "Test User",
        },
      });

      // Mock menu data
      const mockMenu = {
        _id: "menu1",
        date: new Date(),
        items: [
          { name: "Pasta", description: "Italian pasta", available: true },
          { name: "Salad", description: "Fresh salad", available: true },
        ],
      };

      vi.mocked(Menu.findById).mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockMenu),
      } as any);

      // Mock existing order
      const existingOrder = {
        _id: "existingOrder",
        userId: "user1",
        menuId: "menu1",
        menuItemIndex: 0,
        status: "pending",
        orderDate: new Date(),
      };

      vi.mocked(Order.findOne).mockReturnValue({
        exec: vi.fn().mockResolvedValue(existingOrder),
      } as any);

      // Mock order update
      const updatedOrder = {
        _id: "existingOrder",
        userId: "user1",
        menuId: "menu1",
        menuItemIndex: 1, // Changed to index 1
        status: "pending",
        orderDate: new Date(),
        toObject: () => ({
          _id: "existingOrder",
          userId: "user1",
          menuId: "menu1",
          menuItemIndex: 1,
          status: "pending",
          orderDate: new Date(),
        }),
      };

      vi.mocked(Order.findOneAndUpdate).mockResolvedValue(updatedOrder as any);

      // Mock notification creation
      vi.mocked(Notification.create).mockResolvedValue({} as any);

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          menuId: "menu1",
          menuItemIndex: 1, // Changed to index 1
        }),
      });

      const response = await POST_ORDER(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.order._id).toBe("existingOrder");
      expect(data.order.menuItemIndex).toBe(1);
      expect(vi.mocked(Notification.create)).toHaveBeenCalled(); // Admin notification should be created
    });
  });

  describe("PUT /api/orders/[id]/status", () => {
    it("should update order status for admin users", async () => {
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

      // Mock order update
      const updatedOrder = {
        _id: "order1",
        userId: "user1",
        menuId: "menu1",
        menuItemIndex: 0,
        status: "processed", // Updated status
        orderDate: new Date(),
        toObject: () => ({
          _id: "order1",
          userId: "user1",
          menuId: "menu1",
          menuItemIndex: 0,
          status: "processed",
          orderDate: new Date(),
        }),
      };

      vi.mocked(Order.findOneAndUpdate).mockResolvedValue(updatedOrder as any);

      const request = new NextRequest(
        "http://localhost:3000/api/orders/order1/status",
        {
          method: "PUT",
          body: JSON.stringify({ status: "processed" }),
        }
      );

      // Mock params
      const params = { id: "order1" };

      const response = await UPDATE_ORDER_STATUS(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.order.status).toBe("processed");
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

      const request = new NextRequest(
        "http://localhost:3000/api/orders/order1/status",
        {
          method: "PUT",
          body: JSON.stringify({ status: "processed" }),
        }
      );

      // Mock params
      const params = { id: "order1" };

      const response = await UPDATE_ORDER_STATUS(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("POST /api/admin/orders/process", () => {
    it("should process all pending orders for admin users", async () => {
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

      // Mock pending orders
      const mockPendingOrders = [
        {
          _id: "order1",
          userId: "user1",
          menuId: "menu1",
          menuItemIndex: 0,
          status: "pending",
          orderDate: new Date(),
          toObject: () => ({
            _id: "order1",
            userId: "user1",
            menuId: "menu1",
            menuItemIndex: 0,
            status: "pending",
            orderDate: new Date(),
          }),
        },
        {
          _id: "order2",
          userId: "user2",
          menuId: "menu1",
          menuItemIndex: 1,
          status: "pending",
          orderDate: new Date(),
          toObject: () => ({
            _id: "order2",
            userId: "user2",
            menuId: "menu1",
            menuItemIndex: 1,
            status: "pending",
            orderDate: new Date(),
          }),
        },
      ];

      vi.mocked(Order.find).mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockPendingOrders),
      } as any);

      // Mock order update
      vi.mocked(Order.findOneAndUpdate).mockResolvedValue({} as any);

      // Mock notification creation
      vi.mocked(Notification.create).mockResolvedValue({} as any);

      const request = new NextRequest(
        "http://localhost:3000/api/admin/orders/process",
        {
          method: "POST",
        }
      );

      const response = await PROCESS_ORDERS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Orders processed successfully");
      expect(vi.mocked(Order.findOneAndUpdate)).toHaveBeenCalledTimes(2); // Once for each order
      expect(vi.mocked(Notification.create)).toHaveBeenCalled(); // Notifications should be created
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

      const request = new NextRequest(
        "http://localhost:3000/api/admin/orders/process",
        {
          method: "POST",
        }
      );

      const response = await PROCESS_ORDERS(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });
});
