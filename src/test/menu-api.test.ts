import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/mongodb", () => ({
  default: vi.fn(),
}));

vi.mock("@/models/Menu", () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getServerSession: vi.fn(),
}));

// Import after mocking
import { GET, POST, PUT, DELETE } from "@/app/api/menu/route";
import { GET as GET_CURRENT } from "@/app/api/menu/current/route";
import dbConnect from "@/lib/mongodb";
import Menu from "@/models/Menu";
import { getServerSession } from "@/lib/auth";

describe("Menu API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/menu", () => {
    it("should return menus successfully", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock menu data
      const mockMenus = [
        {
          _id: "menu1",
          date: new Date("2025-07-21"),
          items: [
            { name: "Pasta", description: "Italian pasta", available: true },
            { name: "Salad", description: "Fresh salad", available: true },
          ],
          createdBy: "user1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(Menu.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockMenus),
        }),
      } as any);

      const request = new NextRequest("http://localhost:3000/api/menu");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.menus).toHaveLength(1);
      expect(data.menus[0]._id).toBe("menu1");
    });

    it("should handle database errors", async () => {
      // Mock database connection failure
      vi.mocked(dbConnect).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest("http://localhost:3000/api/menu");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("GET /api/menu/current", () => {
    it("should return current day menu", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock current menu
      const today = new Date();
      const mockMenu = {
        _id: "menu1",
        date: today,
        items: [
          { name: "Pasta", description: "Italian pasta", available: true },
          { name: "Salad", description: "Fresh salad", available: true },
        ],
        createdBy: "user1",
        createdAt: today,
        updatedAt: today,
      };

      vi.mocked(Menu.findOne).mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockMenu),
      } as any);

      const request = new NextRequest("http://localhost:3000/api/menu/current");
      const response = await GET_CURRENT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.menu._id).toBe("menu1");
    });

    it("should return 404 when no menu exists for current day", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock no menu found
      vi.mocked(Menu.findOne).mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      } as any);

      const request = new NextRequest("http://localhost:3000/api/menu/current");
      const response = await GET_CURRENT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("No menu found for today");
    });
  });

  describe("POST /api/menu", () => {
    it("should create menu successfully as admin", async () => {
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

      // Mock menu creation
      const mockCreatedMenu = {
        _id: "newMenu1",
        date: new Date("2025-07-22"),
        items: [
          { name: "Burger", description: "Beef burger", available: true },
          { name: "Fries", description: "French fries", available: true },
        ],
        createdBy: "admin1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(Menu.create).mockResolvedValue(mockCreatedMenu as any);

      const request = new NextRequest("http://localhost:3000/api/menu", {
        method: "POST",
        body: JSON.stringify({
          date: "2025-07-22",
          items: [
            { name: "Burger", description: "Beef burger", available: true },
            { name: "Fries", description: "French fries", available: true },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.menu._id).toBe("newMenu1");
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

      const request = new NextRequest("http://localhost:3000/api/menu", {
        method: "POST",
        body: JSON.stringify({
          date: "2025-07-22",
          items: [
            { name: "Burger", description: "Beef burger", available: true },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("PUT /api/menu", () => {
    it("should update menu successfully as admin", async () => {
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

      // Mock menu update
      const mockUpdatedMenu = {
        _id: "menu1",
        date: new Date("2025-07-21"),
        items: [
          {
            name: "Updated Pasta",
            description: "Updated pasta dish",
            available: true,
          },
          { name: "Salad", description: "Fresh salad", available: false },
        ],
        createdBy: "admin1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(Menu.findOneAndUpdate).mockResolvedValue(
        mockUpdatedMenu as any
      );

      const request = new NextRequest("http://localhost:3000/api/menu", {
        method: "PUT",
        body: JSON.stringify({
          id: "menu1",
          items: [
            {
              name: "Updated Pasta",
              description: "Updated pasta dish",
              available: true,
            },
            { name: "Salad", description: "Fresh salad", available: false },
          ],
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.menu._id).toBe("menu1");
      expect(data.menu.items[0].name).toBe("Updated Pasta");
    });
  });

  describe("DELETE /api/menu", () => {
    it("should delete menu successfully as admin", async () => {
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

      // Mock menu deletion
      vi.mocked(Menu.findOneAndDelete).mockResolvedValue({
        _id: "menu1",
        date: new Date("2025-07-21"),
      } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/menu?id=menu1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Menu deleted successfully");
    });
  });
});
