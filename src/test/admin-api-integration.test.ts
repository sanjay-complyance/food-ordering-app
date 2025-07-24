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

vi.mock("@/lib/auth", () => ({
  __esModule: true,
  default: vi.fn(),
  getServerSession: vi.fn(),
  authOptions: {},
}));

// Import after mocking
import { GET as GET_USERS } from "@/app/api/admin/users/route";
import { PUT as UPDATE_USER_ROLE } from "@/app/api/admin/users/[id]/role/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "@/lib/auth";

describe("Admin API Integration Tests", () => {
  beforeEach(() => {
    process.env.SUPERUSER_EMAIL = "sanjay@complyance.io";
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/admin/users", () => {
    it("should return all users for superuser", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock superuser session
      (getServerSession as unknown as Mock).mockResolvedValue({
        user: { id: "super1", email: "sanjay@complyance.io", role: "superuser" },
        expires: "2099-12-31T23:59:59.999Z",
      });

      // Mock users data (plain objects, not Mongoose docs)
      const mockUsers = [
        {
          _id: "user1",
          name: "Regular User",
          email: "user@example.com",
          role: "user",
        },
        {
          _id: "admin1",
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
        },
      ];

      vi.mocked(User.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockUsers),
          lean: vi.fn().mockResolvedValue(mockUsers),
        }),
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const request = new NextRequest("http://localhost:3000/api/admin/users");
      const response = await GET_USERS(request);
      const data = await response.json();

      // Log the shape for debugging
      // console.log('data.users:', data.users);

      expect(response.status).toBe(200);
      expect(Array.isArray(data.users)).toBe(true);
      expect(data.users).toHaveLength(2);
      expect(data.users[0]._id).toBe("user1");
      expect(data.users[1]._id).toBe("admin1");
    });

    it("should return 403 for non-superuser users", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock admin session (not superuser)
      (getServerSession as unknown as Mock).mockResolvedValue({
        user: { id: "admin1", email: "admin@example.com", role: "admin" },
        expires: "2099-12-31T23:59:59.999Z",
      });

      const request = new NextRequest("http://localhost:3000/api/admin/users");
      const response = await GET_USERS(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("PUT /api/admin/users/[id]/role", () => {
    it("should update user role for superuser", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock superuser session
      (getServerSession as unknown as Mock).mockResolvedValue({
        user: { id: "super1", email: "sanjay@complyance.io", role: "superuser" },
        expires: "2099-12-31T23:59:59.999Z",
      });

      // Mock user to update
      const userToUpdate = {
        _id: "user1",
        name: "Regular User",
        email: "user@example.com",
        role: "user",
        save: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(User.findById).mockReturnValue(userToUpdate as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      // Mock user update (simulate save)
      userToUpdate.role = "admin";

      const request = new NextRequest(
        "http://localhost:3000/api/admin/users/user1/role",
        {
          method: "PUT",
          body: JSON.stringify({ role: "admin" }),
        }
      );

      // Mock params
      const params = { id: "user1" };

      const response = await UPDATE_USER_ROLE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("User role updated successfully");
    });

    it("should return 403 for non-superuser users", async () => {
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

      const response = await UPDATE_USER_ROLE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should prevent changing superuser role", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock superuser session
      (getServerSession as unknown as Mock).mockResolvedValue({
        user: { id: "super1", email: "sanjay@complyance.io", role: "superuser" },
        expires: "2099-12-31T23:59:59.999Z",
      });

      // Mock user to update - this is the superuser
      const superuserToUpdate = {
        _id: "super1",
        name: "Superuser",
        email: "sanjay@complyance.io",
        role: "superuser",
        save: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(User.findById).mockReturnValue(superuserToUpdate as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const request = new NextRequest(
        "http://localhost:3000/api/admin/users/super1/role",
        {
          method: "PUT",
          body: JSON.stringify({ role: "user" }), // Trying to demote superuser
        }
      );

      // Mock params
      const params = { id: "super1" };

      const response = await UPDATE_USER_ROLE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Cannot change role of initial superuser");
    });
  });
});
