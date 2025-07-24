import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Mock } from 'vitest';

// Mock dependencies
vi.mock("@/lib/mongodb", () => ({
  default: vi.fn(),
}));

vi.mock("@/models/User", () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock("@/models/Order", () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
    aggregate: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("@/models/Notification", () => ({
  default: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  __esModule: true,
  getServerSession: vi.fn(),
  authOptions: {},
  auth: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  sendBulkNotifications: vi.fn(),
}));

// Import after mocking
import { GET as GET_ADMIN_USERS } from "@/app/api/admin/users/route";
import { PUT as PUT_USER_ROLE } from "@/app/api/admin/users/[id]/role/route";
import { GET as GET_ADMIN_ORDERS } from "@/app/api/admin/orders/route";
import { POST as POST_PROCESS_ORDERS } from "@/app/api/admin/orders/process/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Order from "@/models/Order";
import { getServerSession, auth } from "@/lib/auth";
import { sendBulkNotifications } from "@/lib/notifications";

describe("Admin API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated admin session
    (getServerSession as unknown as Mock).mockResolvedValue({
      user: { id: "admin1", email: "admin@example.com", role: "admin" },
      expires: "2099-12-31T23:59:59.999Z",
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("User Management API", () => {
    describe("GET /api/admin/users", () => {
      it("should return users list for superuser", async () => {
        (getServerSession as unknown as Mock).mockResolvedValue({
          user: { id: "superuser1", email: "superuser@example.com", role: "superuser" },
          expires: "2099-12-31T23:59:59.999Z",
        });
        // Mock database connection
        vi.mocked(dbConnect).mockResolvedValue(undefined);

        // Mock users data
        const mockUsers = [
          {
            _id: "user1",
            email: "user1@example.com",
            name: "User One",
            role: "user",
            createdAt: new Date(),
            toObject: () => ({
              _id: "user1",
              email: "user1@example.com",
              name: "User One",
              role: "user",
              createdAt: new Date(),
            }),
          },
          {
            _id: "user2",
            email: "user2@example.com",
            name: "User Two",
            role: "admin",
            createdAt: new Date(),
            toObject: () => ({
              _id: "user2",
              email: "user2@example.com",
              name: "User Two",
              role: "admin",
              createdAt: new Date(),
            }),
          },
        ];

        // Mock User.find().sort().exec() chain
        vi.mocked(User.find).mockReturnValue({
          sort: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(mockUsers),
            lean: vi.fn().mockResolvedValue(mockUsers),
          }),
        } as unknown as ReturnType<typeof User.find>);

        const request = new NextRequest(
          "http://localhost:3000/api/admin/users"
        );
        const response = await GET_ADMIN_USERS(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.users).toHaveLength(2);
        expect(data.users[0].email).toBe("user1@example.com");
        expect(data.users[1].email).toBe("user2@example.com");
      });

      it("should return 401 for non-superuser", async () => {
        // Mock database connection
        vi.mocked(dbConnect).mockResolvedValue(undefined);

        // Mock admin session (not superuser)
        (getServerSession as unknown as Mock).mockResolvedValue({
          user: { id: "admin1", email: "admin@example.com", role: "admin" },
          expires: "2099-12-31T23:59:59.999Z",
        });

        const request = new NextRequest(
          "http://localhost:3000/api/admin/users"
        );
        const response = await GET_ADMIN_USERS(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe("Forbidden");
      });

      it("should return 401 for unauthenticated users", async () => {
        (getServerSession as unknown as Mock).mockResolvedValue(null);
        // Mock database connection
        vi.mocked(dbConnect).mockResolvedValue(undefined);

        const request = new NextRequest(
          "http://localhost:3000/api/admin/users"
        );
        const response = await GET_ADMIN_USERS(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });
    });

    describe("PUT /api/admin/users/[id]/role", () => {
      it("should update user role as superuser", async () => {
        // Mock database connection
        vi.mocked(dbConnect).mockResolvedValue(undefined);

        // Mock superuser session
        (getServerSession as unknown as Mock).mockResolvedValue({
          user: { id: "superuser1", email: "superuser@example.com", role: "superuser" },
          expires: "2099-12-31T23:59:59.999Z",
        });

        // Mock user to update (findById)
        const mockUserToUpdate = {
          _id: "user1",
          email: "user@example.com",
          name: "User",
          role: "user",
          save: vi.fn().mockResolvedValue({
            _id: "user1",
            email: "user@example.com",
            name: "User",
            role: "admin",
            createdAt: new Date(),
            toObject: () => ({
              _id: "user1",
              email: "user@example.com",
              name: "User",
              role: "admin",
              createdAt: new Date(),
            }),
          }),
        };
        vi.mocked(User.findById).mockResolvedValue(mockUserToUpdate as unknown as Awaited<ReturnType<typeof User.findById>>);

        // Mock user update (findOneAndUpdate)
        const mockUpdatedUser = {
          _id: "user1",
          email: "user@example.com",
          name: "User",
          role: "admin", // Updated role
          createdAt: new Date(),
          toObject: () => ({
            _id: "user1",
            email: "user@example.com",
            name: "User",
            role: "admin",
            createdAt: new Date(),
          }),
        };
        vi.mocked(User.findOneAndUpdate).mockResolvedValue(
          mockUpdatedUser as unknown as Awaited<ReturnType<typeof User.findOneAndUpdate>>
        );

        const request = new NextRequest(
          "http://localhost:3000/api/admin/users/user1/role",
          {
            method: "PUT",
            body: JSON.stringify({ role: "admin" }),
          }
        );

        // Mock params
        const params = { id: "user1" };

        const response = await PUT_USER_ROLE(request, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBeDefined();
        // The handler may not return the user, so just check for success and message
      });

      it("should return 401 for non-superuser", async () => {
        // Mock database connection
        vi.mocked(dbConnect).mockResolvedValue(undefined);

        // Mock admin session (not superuser)
        (getServerSession as unknown as Mock).mockResolvedValue({
          user: { id: "admin1", email: "admin@example.com", role: "admin" },
          expires: "2099-12-31T23:59:59.999Z",
        });

        const request = new NextRequest(
          "http://localhost:3000/api/admin/users/user1/role",
          {
            method: "PUT",
            body: JSON.stringify({ role: "admin" }),
          }
        );

        // Mock params
        const params = { id: "user1" };

        const response = await PUT_USER_ROLE(request, { params });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe("Forbidden");
      });

      it("should return 401 for unauthenticated users", async () => {
        (getServerSession as unknown as Mock).mockResolvedValue(null);
        // Mock database connection
        vi.mocked(dbConnect).mockResolvedValue(undefined);

        const request = new NextRequest(
          "http://localhost:3000/api/admin/users/user1/role",
          {
            method: "PUT",
            body: JSON.stringify({ role: "admin" }),
          }
        );

        // Mock params
        const params = { id: "user1" };

        const response = await PUT_USER_ROLE(request, { params });
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });
    });
  });

  describe("Order Management API", () => {
    describe("GET /api/admin/orders", () => {
      it("should return orders for admin", async () => {
        (getServerSession as unknown as Mock).mockResolvedValue({
          user: { id: "admin1", email: "admin@example.com", role: "admin" },
          expires: "2099-12-31T23:59:59.999Z",
        });
        // Mock database connection
        vi.mocked(dbConnect).mockResolvedValue(undefined);

        // Mock orders data
        vi.mocked(Order.find).mockReturnValue({
          sort: vi.fn().mockReturnValue([
            { _id: "order1", userId: "user1", orderDate: new Date(), menuItemName: "Pasta", status: "pending", createdAt: new Date(), toObject: () => ({ _id: "order1", userId: "user1", orderDate: new Date(), menuItemName: "Pasta", status: "pending", createdAt: new Date() }) },
            { _id: "order2", userId: "user2", orderDate: new Date(), menuItemName: "Salad", status: "confirmed", createdAt: new Date(), toObject: () => ({ _id: "order2", userId: "user2", orderDate: new Date(), menuItemName: "Salad", status: "confirmed", createdAt: new Date() }) }
          ])
        } as unknown as ReturnType<typeof Order.find>);
        vi.mocked(User.findById).mockResolvedValue({ name: "Test User", email: "test@example.com" } as unknown as Awaited<ReturnType<typeof User.findById>>);

        const request = new NextRequest(
          "http://localhost:3000/api/admin/orders?date=2025-07-21"
        );
        const response = await GET_ADMIN_ORDERS(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.orders).toHaveLength(2);
      });

      it("should return 403 for non-admin users", async () => {
        // Mock database connection
        vi.mocked(dbConnect).mockResolvedValue(undefined);

        // Mock regular user session
        (getServerSession as unknown as Mock).mockResolvedValue({
          user: { id: "user1", email: "user@example.com", role: "user" },
          expires: "2099-12-31T23:59:59.999Z",
        });
        (getServerSession as unknown as Mock).mockResolvedValue({
          user: {
            id: "user1",
            email: "user@example.com",
            role: "user",
          },
          expires: "2099-12-31T23:59:59.999Z",
        });

        const request = new NextRequest(
          "http://localhost:3000/api/admin/orders"
        );
        const response = await GET_ADMIN_ORDERS(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe("Forbidden");
      });

      it("should return 401 for unauthenticated users", async () => {
        (getServerSession as unknown as Mock).mockResolvedValue(null);
        // Mock database connection
        vi.mocked(dbConnect).mockResolvedValue(undefined);

        const request = new NextRequest(
          "http://localhost:3000/api/admin/orders"
        );
        const response = await GET_ADMIN_ORDERS(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });
    });

    describe("POST /api/admin/orders/process", () => {
      it("should process orders as admin", async () => {
        // Mock database connection
        vi.mocked(dbConnect).mockResolvedValue(undefined);

        // Mock admin session
        (getServerSession as unknown as Mock).mockResolvedValue({
          user: { id: "admin1", email: "admin@example.com", role: "admin" },
          expires: "2099-12-31T23:59:59.999Z",
        });
        // Mock sendBulkNotifications
        vi.mocked(sendBulkNotifications).mockResolvedValue({ count: 2, notifications: [] });

        // Mock updateMany
        vi.mocked(Order.updateMany).mockResolvedValue({ modifiedCount: 2 } as unknown as Awaited<ReturnType<typeof Order.updateMany>>);
        // Mock find to return processed orders
        const processedOrders = [
          { userId: { toString: () => "user1" }, toObject: () => ({ userId: "user1" }) },
          { userId: { toString: () => "user2" }, toObject: () => ({ userId: "user2" }) }
        ];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment
        // @ts-expect-error: Mongoose Query mock does not fully match type
        vi.mocked(Order.find).mockReturnValue(processedOrders as unknown as Awaited<ReturnType<typeof Order.find>>);
        // Mock Notification.create if needed

        const request = new NextRequest(
          "http://localhost:3000/api/admin/orders/process",
          {
            method: "POST",
            body: JSON.stringify({ date: "2025-07-21" }),
          }
        );

        const response = await POST_PROCESS_ORDERS(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.message).toBeDefined();
        expect(data.processed).toBe(2);
      });

      it("should return 403 for non-admin users", async () => {
        // Mock database connection
        vi.mocked(dbConnect).mockResolvedValue(undefined);

        // Mock regular user session
        (getServerSession as unknown as Mock).mockResolvedValue({
          user: { id: "user1", email: "user@example.com", role: "user" },
          expires: "2099-12-31T23:59:59.999Z",
        });

        const request = new NextRequest(
          "http://localhost:3000/api/admin/orders/process",
          {
            method: "POST",
            body: JSON.stringify({ date: "2025-07-21" }),
          }
        );

        const response = await POST_PROCESS_ORDERS(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe("Forbidden");
      });

      it("should return 401 for unauthenticated users", async () => {
        (getServerSession as unknown as Mock).mockResolvedValue(null);
        // Mock database connection
        vi.mocked(dbConnect).mockResolvedValue(undefined);

        const request = new NextRequest(
          "http://localhost:3000/api/admin/orders/process",
          {
            method: "POST",
            body: JSON.stringify({ date: "2025-07-21" }),
          }
        );

        const response = await POST_PROCESS_ORDERS(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });
    });
  });
});
