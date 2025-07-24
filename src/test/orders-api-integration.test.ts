import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { Types } from "mongoose";
import type { Mock } from 'vitest';

// Mock dependencies
vi.mock("@/lib/mongodb", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  sendBulkNotifications: vi.fn().mockResolvedValue(undefined),
}));

const mockOrderInstance = {
  _id: "newOrder",
  userId: "user1",
  orderDate: new Date("2025-07-23"),
  items: [
    { name: "Burger", description: "Beef burger", available: true },
    { name: "Fries", description: "French fries", available: true },
  ],
  status: "pending",
  save: vi.fn().mockResolvedValue(undefined),
  populate: vi.fn().mockImplementation(function(this: any) { return this; }),
  toObject: function() { return { ...this }; },
};
vi.mock("@/models/Order", () => {
  const orderStaticMethods = {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
  };
  const Order = vi.fn(() => mockOrderInstance);
  Object.assign(Order, orderStaticMethods);
  return { default: Order };
});

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

vi.mock("@/models/User", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  __esModule: true,
  getServerSession: vi.fn(),
  authOptions: {},
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Import after mocking
import { GET as GET_ORDERS, POST as POST_ORDER, PUT as PUT_ORDERS } from "@/app/api/orders/route";
import { PATCH as UPDATE_ORDER_STATUS } from "@/app/api/orders/[id]/status/route";
import { POST as PROCESS_ORDERS } from "@/app/api/admin/orders/process/route";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Menu from "@/models/Menu";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { getServerSession } from "@/lib/auth";

describe("Orders API Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated session
    (getServerSession as unknown as Mock).mockResolvedValue({
      user: { id: "user1", email: "user@example.com", role: "user" },
      expires: "2099-12-31T23:59:59.999Z",
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/orders", () => {
    it("should return user orders when authenticated", async () => {
      // Mock user session
      (getServerSession as unknown as Mock).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          role: "user",
        },
      });
      // Mock user lookup
      vi.mocked(User.findOne).mockResolvedValue({
        _id: "user1",
        email: "user@example.com",
        name: "Test User",
        role: "user",
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
      // @ts-expect-error: Mongoose Query mock does not fully match type
      vi.mocked(Order.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(mockOrders),
        }),
      });

      const request = new NextRequest("http://localhost:3000/api/orders");
      const response = await GET_ORDERS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0]._id).toBe("order1");
      expect(data.data[1]._id).toBe("order2");
    });

    it("should return all orders for admin users", async () => {
      (getServerSession as unknown as Mock).mockResolvedValue({
        user: { id: "admin1", email: "admin@example.com", role: "admin" },
        expires: "2099-12-31T23:59:59.999Z",
      });
      // Mock admin user lookup
      vi.mocked(User.findOne).mockResolvedValue({
        _id: "admin1",
        email: "admin@example.com",
        name: "Admin User",
        role: "admin",
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
      // @ts-expect-error: Mongoose Query mock does not fully match type
      vi.mocked(Order.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(mockOrders),
        }),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/orders?all=true"
      );
      const response = await GET_ORDERS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0]._id).toBe("order1");
      expect(data.data[1]._id).toBe("order2");
    });

    it("should return 401 when not authenticated", async () => {
      (getServerSession as unknown as Mock).mockResolvedValue(null);
      // Mock user lookup to return null
      vi.mocked(User.findOne).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/orders");
      const response = await GET_ORDERS(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });
  });

  describe("POST /api/orders", () => {
    it("should create a new order when authenticated", async () => {
      // Mock User.findOne to return a user
      // @ts-expect-error: Mongoose Query mock does not fully match type
      vi.mocked(User.findOne).mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: "user1",
          email: "user@example.com",
          role: "user",
        }),
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
      });

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

      vi.mocked(Order.create).mockResolvedValue(mockCreatedOrder);

      // Mock existing order check
      // Mock Order.findOne to return null (no existing order)
      // @ts-expect-error: Mongoose Query mock does not fully match type
      vi.mocked(Order.findOne).mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
        then: (onFulfilled: any) => Promise.resolve(null).then(onFulfilled),
      });

      const request = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({
          orderDate: new Date("2025-07-23").toISOString(),
          items: [
            { name: "Burger", description: "Beef burger", quantity: 1 },
            { name: "Fries", description: "French fries", quantity: 2 },
          ],
        }),
      });

      const response = await POST_ORDER(request);
      const data = await response.json();
      if (response.status !== 201) {
        // eslint-disable-next-line no-console
        console.log('POST /api/orders debug:', data);
      }
      expect(response.status).toBe(201);
      expect(data.data._id).toBe("newOrder");
      expect(data.data.items).toHaveLength(2);
    });

    it("should update existing order when one exists for the day", async () => {
      // Mock User.findOne to return a user
      // @ts-expect-error: Mongoose Query mock does not fully match type
      vi.mocked(User.findOne).mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: "user1",
          email: "user@example.com",
          role: "user",
        }),
      });

      // Plain object for userId
      const userIdMock2 = { toString: () => 'user1' };

      const existingOrder = {
        _id: "existingOrder",
        userId: userIdMock2,
        orderDate: new Date("2025-07-23"),
        items: [
          { name: "Burger", description: "Beef burger", quantity: 1 },
        ],
        status: "pending",
        toObject: function() {
          const result = {
            _id: "existingOrder",
            userId: userIdMock2,
            orderDate: new Date("2025-07-23"),
            items: [
              { name: "Burger", description: "Beef burger", quantity: 1 },
            ],
            status: "pending",
          };
          // eslint-disable-next-line no-console
          console.log('existingOrder.toObject() called, userId:', result.userId);
          // eslint-disable-next-line no-console
          console.log('existingOrder.toObject() called, returning:', result);
          return result;
        },
      };
      // @ts-expect-error: Mongoose Query mock does not fully match type
      vi.mocked(Order.findById).mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          _id: "existingOrder",
          userId: userIdMock2,
          orderDate: new Date("2025-07-23"),
          items: [
            { name: "Burger", description: "Beef burger", quantity: 1 },
          ],
          status: "pending",
          toObject: function() {
            const result = {
              _id: "existingOrder",
              userId: userIdMock2,
              orderDate: new Date("2025-07-23"),
              items: [
                { name: "Burger", description: "Beef burger", quantity: 1 },
              ],
              status: "pending",
            };
            // eslint-disable-next-line no-console
            console.log('existingOrder.toObject() called, userId:', result.userId);
            // eslint-disable-next-line no-console
            console.log('existingOrder.toObject() called, returning:', result);
            return result;
          },
        }),
      });

      // Mock Order.findByIdAndUpdate to return the updated order
      // @ts-expect-error: Mongoose Query mock does not fully match type
      vi.mocked(Order.findByIdAndUpdate).mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          _id: "existingOrder",
          userId: userIdMock2,
          orderDate: new Date("2025-07-23"),
          items: [
            { name: "Burger", description: "Beef burger", quantity: 2 },
            { name: "Fries", description: "French fries", quantity: 1 },
          ],
          status: "pending",
          toObject: function() {
            const result = {
              _id: "existingOrder",
              userId: userIdMock2,
              orderDate: new Date("2025-07-23"),
              items: [
                { name: "Burger", description: "Beef burger", quantity: 2 },
                { name: "Fries", description: "French fries", quantity: 1 },
              ],
              status: "pending",
            };
            // eslint-disable-next-line no-console
            console.log('updatedOrder.toObject() called, userId:', result.userId);
            // eslint-disable-next-line no-console
            console.log('updatedOrder.toObject() called, returning:', result);
            return result;
          },
        }),
      });

      const request = new NextRequest("http://localhost:3000/api/orders?id=existingOrder", {
        method: "PUT",
        body: JSON.stringify({
          orderDate: new Date("2025-07-23").toISOString(),
          items: [
            { name: "Burger", description: "Beef burger", quantity: 2 },
            { name: "Fries", description: "French fries", quantity: 1 },
          ],
        }),
      });

      const response = await PUT_ORDERS(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.data._id).toBe("existingOrder");
      expect(data.data.items).toHaveLength(2);
      expect(data.data.items[0].quantity).toBe(2);
      expect(data.data.items[1].quantity).toBe(1);
    });
  });

  describe("PUT /api/orders/[id]/status", () => {
    it("should update order status for admin users", async () => {
      (getServerSession as unknown as Mock).mockResolvedValue({
        user: { id: "admin1", email: "admin@example.com", role: "admin" },
        expires: "2099-12-31T23:59:59.999Z",
      });
      // Mock admin user lookup
      vi.mocked(User.findOne).mockResolvedValue({
        _id: "admin1",
        email: "admin@example.com",
        name: "Admin User",
        role: "admin",
      });

      // Mock Order.findById to return an order with .populate()
      vi.mocked(Order.findById).mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          _id: "order1",
          userId: { toString: () => "user1" },
          status: "pending",
          orderDate: new Date(),
        }),
      });

      // Mock order update
      const updatedOrder = {
        _id: "order1",
        userId: "user1",
        menuId: "menu1",
        menuItemIndex: 0,
        status: "confirmed", // Updated status
        orderDate: new Date(),
        toObject: function() {
          return {
            _id: "order1",
            userId: "user1",
            menuId: "menu1",
            menuItemIndex: 0,
            status: "confirmed",
            orderDate: new Date(),
          };
        },
      };

      vi.mocked(Order.findOneAndUpdate).mockResolvedValue(updatedOrder);
      vi.mocked(Order.findByIdAndUpdate).mockReturnValue({
        populate: vi.fn().mockResolvedValue(updatedOrder),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/orders/order1/status",
        {
          method: "PUT",
          body: JSON.stringify({ status: "confirmed" }),
        }
      );

      // Mock params
      const params = { id: "order1" };

      const response = await UPDATE_ORDER_STATUS(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.status).toBe("confirmed");
    });

    it("should return 403 for non-admin users", async () => {
      (getServerSession as unknown as Mock).mockResolvedValue({
        user: { id: "user1", email: "user@example.com", role: "user" },
        expires: "2099-12-31T23:59:59.999Z",
      });
      // Mock user lookup
      vi.mocked(User.findOne).mockResolvedValue({
        _id: "user1",
        email: "user@example.com",
        name: "Test User",
        role: "user",
      });

      // Mock Order.findById to return an order with .populate()
      vi.mocked(Order.findById).mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          _id: "order1",
          userId: { toString: () => "user1" },
          status: "pending",
          orderDate: new Date(),
        }),
      });
      // Mock Order.findByIdAndUpdate to return an object with .populate()
      vi.mocked(Order.findByIdAndUpdate).mockReturnValue({
        populate: vi.fn().mockResolvedValue({
          _id: "order1",
          userId: { toString: () => "user1" },
          status: "confirmed",
          orderDate: new Date(),
        }),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/orders/order1/status",
        {
          method: "PUT",
          body: JSON.stringify({ status: "confirmed" }),
        }
      );

      // Mock params
      const params = { id: "order1" };

      const response = await UPDATE_ORDER_STATUS(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Only admins can update order status");
    });
  });

  describe("POST /api/admin/orders/process", () => {
    it("should process all pending orders for admin users", async () => {
      (getServerSession as unknown as Mock).mockResolvedValue({
        user: { id: "admin1", email: "admin@example.com", role: "admin" },
        expires: "2099-12-31T23:59:59.999Z",
      });

      // Mock admin session
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin",
        },
      });
      // Mock admin user lookup
      vi.mocked(User.findOne).mockResolvedValue({
        _id: "admin1",
        email: "admin@example.com",
        name: "Admin User",
        role: "admin",
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
        sort: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(mockPendingOrders),
          }),
        }),
      });

      // Mock order update
      vi.mocked(Order.updateMany).mockResolvedValue({ modifiedCount: 2 });
      vi.mocked(Order.findOneAndUpdate).mockResolvedValue(null);

      // Mock Order.find for processed orders to return an array
      vi.mocked(Order.find).mockResolvedValue([
        { userId: { toString: () => "user1" }, status: "confirmed" },
        { userId: { toString: () => "user2" }, status: "confirmed" },
      ]);

      // Mock notification creation
      // @ts-expect-error: ObjectId type mismatch is safe for test mocks
      vi.mocked(Notification.create).mockResolvedValue([{ _id: new Types.ObjectId('507f1f77bcf86cd799439012') }]);

      const request = new NextRequest(
        "http://localhost:3000/api/admin/orders/process",
        {
          method: "POST",
          body: JSON.stringify({ date: "2025-07-23" }),
        }
      );

      const response = await PROCESS_ORDERS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Orders processed successfully");
      expect(vi.mocked(Order.updateMany)).toHaveBeenCalledTimes(1); // Should be called once to update all orders
    });

    it("should return 401 for non-admin users", async () => {
      (getServerSession as unknown as Mock).mockResolvedValue({
        user: { id: "user1", email: "user@example.com", role: "user" },
        expires: "2099-12-31T23:59:59.999Z",
      });
      // Mock user lookup
      vi.mocked(User.findOne).mockResolvedValue({
        _id: "user1",
        email: "user@example.com",
        name: "Test User",
        role: "user",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/admin/orders/process",
        {
          method: "POST",
        }
      );

      const response = await PROCESS_ORDERS(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });
});
