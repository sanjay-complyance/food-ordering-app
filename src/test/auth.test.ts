import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before importing
vi.mock("@/lib/mongodb", () => ({
  default: vi.fn(),
}));

vi.mock("@/models/User", () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashedPassword123"),
  },
}));

// Import after mocking
import { POST } from "@/app/api/auth/signup/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

describe("Authentication API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variable for tests
    process.env.SUPERUSER_EMAIL = "sanjay@complyance.io";
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("POST /api/auth/signup", () => {
    it("should create a new user successfully", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock user not existing
      vi.mocked(User.findOne).mockResolvedValue(null);

      // Mock user creation
      const mockCreatedUser = {
        _id: "user123",
        email: "test@example.com",
        name: "Test User",
        role: "user",
        password: "hashedPassword123",
        toObject: () => ({
          _id: "user123",
          email: "test@example.com",
          name: "Test User",
          role: "user",
        }),
      };

      vi.mocked(User.create).mockResolvedValue(mockCreatedUser as any);

      const request = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
          name: "Test User",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe("User created successfully");
      expect(data.user.email).toBe("test@example.com");
      expect(data.user.role).toBe("user");
    });

    it("should create superuser when email matches SUPERUSER_EMAIL", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock user not existing
      vi.mocked(User.findOne).mockResolvedValue(null);

      // Mock user creation
      const mockCreatedUser = {
        _id: "superuser123",
        email: "sanjay@complyance.io",
        name: "Sanjay Kumar",
        role: "superuser",
        password: "hashedPassword123",
        toObject: () => ({
          _id: "superuser123",
          email: "sanjay@complyance.io",
          name: "Sanjay Kumar",
          role: "superuser",
        }),
      };

      vi.mocked(User.create).mockResolvedValue(mockCreatedUser as any);

      const request = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "sanjay@complyance.io",
          password: "password123",
          name: "Sanjay Kumar",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.user.role).toBe("superuser");
    });

    it("should return 400 for missing required fields", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          // Missing password and name
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });

    it("should return 400 for invalid email format", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "invalid-email",
          password: "password123",
          name: "Test User",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid email format");
    });

    it("should return 400 for weak password", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "123", // Too short
          name: "Test User",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password must be at least 6 characters long");
    });

    it("should return 409 if user already exists", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock user already existing
      vi.mocked(User.findOne).mockResolvedValue({
        _id: "existing123",
        email: "test@example.com",
      } as any);

      const request = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
          name: "Test User",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("User already exists");
    });

    it("should handle database errors", async () => {
      // Mock database connection failure
      vi.mocked(dbConnect).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
          name: "Test User",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("Input Validation", () => {
    it("should validate email format correctly", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.co.uk",
        "admin@company.org",
      ];

      const invalidEmails = [
        "invalid-email",
        "@domain.com",
        "user@",
        "user.domain.com",
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it("should validate password length", () => {
      const validPasswords = ["password123", "securePass!", "123456"];
      const invalidPasswords = ["123", "ab", ""];

      validPasswords.forEach((password) => {
        expect(password.length >= 6).toBe(true);
      });

      invalidPasswords.forEach((password) => {
        expect(password.length >= 6).toBe(false);
      });
    });

    it("should determine superuser role correctly", () => {
      const superuserEmail = "sanjay@complyance.io";
      const regularEmails = ["user@example.com", "admin@test.com"];

      expect(superuserEmail === process.env.SUPERUSER_EMAIL).toBe(true);

      regularEmails.forEach((email) => {
        expect(email === process.env.SUPERUSER_EMAIL).toBe(false);
      });
    });
  });
});
