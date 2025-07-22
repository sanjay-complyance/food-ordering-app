import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

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
import {
  GET as GET_ADMIN_USERS,
  POST as POST_ADMIN_USERS,
} from "@/app/api/admin/users/route";
import { PUT as PUT_USER_ROLE } from "@/app/api/admin/users/[id]/role/route";
import {
  GET as GET_ADMIN_ORDERS,
  POST as POST_ADMIN_ORDERS,
} from "@/app/api/admin/orders/route";
import { POST as POST_PROCESS_ORDERS } from "@/app/api/admin/orders/process/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Order from "@/models/Order";
import Notification from "@/models/Notification";
import { getServerSession } from "@/lib/auth";

describe("Admin API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("User Management API", () => {
    describe("GET /api/admin/users", () => {
      it("should return users list for superuser", async () => {
        // Mock database connection
        vi.mocked(dbConnect).mockResolvedValue(undefined);

        // Mock superuser session
        vi.mocked(getServerSession).mockResolvedValue({
          user: {
            id: "superuser1",
            email: "superuser@example.com",
            role: "superuser",
          },
        });

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

        vi.mocked(User.find).mockReturnValue({
          sort: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(mockUsers),
          }),
        } as any);

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
        vi.mocked(getServerSession).mockResolvedValue({
          user: {
            id: "admin1",
            email: "admin@example.com",
            role: "admin",
          },
        });

        const request = new NextRequest(
          "http://localhost:3000/api/admin/users"
        );
        const response = await GET_ADMIN_USERS(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized: Superuser access required");
      });
    });

    describe("PUT /api/admin/users/[id]/role", () => {
      it("should update user role as superuser", async () => {
        // Mock database connection
        vi.mocked(dbConnect).mockResolvedValue(undefined);

        // Mock superuser session
        vi.mocked(getServerSession).mockResolvedValue({
          user: {
            id: "superuser1",
            email: "superuser@example.com",
            role: "superuser",
          },
        });

        // Mock user update
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
          mockUpdatedUser as any
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
        expect(data.user.role).toBe("admin");
      });

      it("should return 401 for non-superuser", async () => {
        // Mock database connection
        vi.mocked(dbConnect).mockResolvedValue(undefined);

        // Mock admin session (not superuser)
        vi.mocked(getServerSession).mockResolvedValue({
          user: {
            id: "admin1",
            email: "admin@example.com",
            role: "admin",
          },
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

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized: Superuser access required");
      });
    });
  });

  describe("Order Management API", () => {
    describe("GET /api/admin/orders", () => {
      it("should return orders for admin", async () => {
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
            orderDate: new Date(),
            menuItemName: "Pasta",
            status: "pending",
            createdAt: new Date(),
            toObject: () => ({
              _id: "order1",
              userId: "user1",
              orderDate: new Date(),
              menuItemName: "Pasta",
              status: "pending",
              createdAt: new Date(),
            }),
          },
          {
            _id: "order2",
            userId: "user2",
            orderDate: new Date(),
            menuItemName: "Salad",
            status: "confirmed",
            createdAt: new Date(),
            toObject: () => ({
              _id: "order2",
              userId: "user2",
              orderDate: new Date(),
              menuItemName: "Salad",
              status: "confirmed",
              createdAt: new Date(),
            }),
          },
        ];

        vi.mocked(Order.find).mockReturnValue({
          populate: vi.fn().mockReturnValue({
            sort: vi.fn().mockReturnValue({
              exec: vi.fn().mockResolvedValue(mockOrders),
            }),
          }),
        } as any);

        const request = new NextRequest(
          "http://localhost:3000/api/admin/orders?date=2025-07-21"
        );
        const response = await GET_ADMIN_ORDERS(request);
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
            orderDate: new Date(),
            menuItemName: "Pasta",
            status: "pending",
          },
          {
            _id: "order2",
            userId: "user2",
            orderDate: new Date(),
            menuItemName: "Salad",
            status: "pending",
          },
        ];

        // Mock order aggregation
        vi.mocked(Order.aggregate).mockResolvedValue([
          { _id: "Pasta", count: 1 },
          { _id: "Salad", count: 1 },
        ] as any);

        // Mock order update
        vi.mocked(Order.findOneAndUpdate).mockResolvedValue({
          status: "confirmed",
        } as any);

        // Mock notification creation
        vi.mocked(Notification.create).mockResolvedValue({} as any);

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
        expect(data.message).toBeDefined();
        expect(vi.mocked(Notification.create)).toHaveBeenCalled();
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
