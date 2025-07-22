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

vi.mock("@/lib/auth", () => ({
  getServerSession: vi.fn(),
}));

// Import after mocking
import { GET as GET_USERS } from "@/app/api/admin/users/route";
import { PUT as UPDATE_USER_ROLE } from "@/app/api/admin/users/[id]/role/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "@/lib/auth";

describe("Admin API Integration Tests", () => {
  beforeEach(() => {
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
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "super1",
          email: "sanjay@complyance.io", // Superuser email from requirements
          role: "superuser",
        },
      });

      // Mock users data
      const mockUsers = [
        {
          _id: "user1",
          name: "Regular User",
          email: "user@example.com",
          role: "user",
          toObject: () => ({
            _id: "user1",
            name: "Regular User",
            email: "user@example.com",
            role: "user",
          }),
        },
        {
          _id: "admin1",
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
          toObject: () => ({
            _id: "admin1",
            name: "Admin User",
            email: "admin@example.com",
            role: "admin",
          }),
        },
      ];

      vi.mocked(User.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockUsers),
        }),
      } as any);

      const request = new NextRequest("http://localhost:3000/api/admin/users");
      const response = await GET_USERS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(2);
      expect(data.users[0]._id).toBe("user1");
      expect(data.users[1]._id).toBe("admin1");
    });

    it("should return 401 for non-superuser users", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock admin session (not superuser)
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin", // Admin but not superuser
        },
      });

      const request = new NextRequest("http://localhost:3000/api/admin/users");
      const response = await GET_USERS(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("PUT /api/admin/users/[id]/role", () => {
    it("should update user role for superuser", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock superuser session
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "super1",
          email: "sanjay@complyance.io", // Superuser email from requirements
          role: "superuser",
        },
      });

      // Mock user to update
      vi.mocked(User.findById).mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: "user1",
          name: "Regular User",
          email: "user@example.com",
          role: "user",
        }),
      } as any);

      // Mock user update
      const updatedUser = {
        _id: "user1",
        name: "Regular User",
        email: "user@example.com",
        role: "admin", // Updated role
        toObject: () => ({
          _id: "user1",
          name: "Regular User",
          email: "user@example.com",
          role: "admin",
        }),
      };

      vi.mocked(User.findOneAndUpdate).mockResolvedValue(updatedUser as any);

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
      expect(data.user.role).toBe("admin");
    });

    it("should return 401 for non-superuser users", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock admin session (not superuser)
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin", // Admin but not superuser
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

      const response = await UPDATE_USER_ROLE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should prevent changing superuser role", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock superuser session
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "super1",
          email: "sanjay@complyance.io", // Superuser email from requirements
          role: "superuser",
        },
      });

      // Mock user to update - this is the superuser
      vi.mocked(User.findById).mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: "super1",
          name: "Superuser",
          email: "sanjay@complyance.io",
          role: "superuser",
        }),
      } as any);

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

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot change superuser role");
    });
  });
});
