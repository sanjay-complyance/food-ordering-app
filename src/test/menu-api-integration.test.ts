import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/mongodb", () => ({
  default: vi.fn(),
}));

vi.mock("@/models/Menu", () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getServerSession: vi.fn(),
}));

// Import after mocking
import { GET as GET_MENU, POST as POST_MENU } from "@/app/api/menu/route";
import { GET as GET_CURRENT_MENU } from "@/app/api/menu/current/route";
import { PUT as TOGGLE_MENU_ITEM } from "@/app/api/menu/[id]/toggle/route";
import dbConnect from "@/lib/mongodb";
import Menu from "@/models/Menu";
import { getServerSession } from "@/lib/auth";

describe("Menu API Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/menu", () => {
    it("should return all menus for admin users", async () => {
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

      // Mock menus data
      const mockMenus = [
        {
          _id: "menu1",
          date: new Date("2025-07-21"),
          items: [
            { name: "Pasta", description: "Italian pasta", available: true },
            { name: "Salad", description: "Fresh salad", available: true },
          ],
          createdBy: "admin1",
          toObject: () => ({
            _id: "menu1",
            date: new Date("2025-07-21"),
            items: [
              { name: "Pasta", description: "Italian pasta", available: true },
              { name: "Salad", description: "Fresh salad", available: true },
            ],
            createdBy: "admin1",
          }),
        },
        {
          _id: "menu2",
          date: new Date("2025-07-22"),
          items: [
            { name: "Pizza", description: "Cheese pizza", available: true },
            { name: "Soup", description: "Tomato soup", available: true },
          ],
          createdBy: "admin1",
          toObject: () => ({
            _id: "menu2",
            date: new Date("2025-07-22"),
            items: [
              { name: "Pizza", description: "Cheese pizza", available: true },
              { name: "Soup", description: "Tomato soup", available: true },
            ],
            createdBy: "admin1",
          }),
        },
      ];

      vi.mocked(Menu.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockMenus),
        }),
      } as any);

      const request = new NextRequest("http://localhost:3000/api/menu");
      const response = await GET_MENU(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.menus).toHaveLength(2);
      expect(data.menus[0]._id).toBe("menu1");
      expect(data.menus[1]._id).toBe("menu2");
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

      const request = new NextRequest("http://localhost:3000/api/menu");
      const response = await GET_MENU(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("GET /api/menu/current", () => {
    it("should return current day's menu for authenticated users", async () => {
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

      // Mock current menu data
      const mockMenu = {
        _id: "menu1",
        date: new Date("2025-07-21"),
        items: [
          { name: "Pasta", description: "Italian pasta", available: true },
          { name: "Salad", description: "Fresh salad", available: true },
        ],
        createdBy: "admin1",
        toObject: () => ({
          _id: "menu1",
          date: new Date("2025-07-21"),
          items: [
            { name: "Pasta", description: "Italian pasta", available: true },
            { name: "Salad", description: "Fresh salad", available: true },
          ],
          createdBy: "admin1",
        }),
      };

      vi.mocked(Menu.findOne).mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockMenu),
      } as any);

      const request = new NextRequest("http://localhost:3000/api/menu/current");
      const response = await GET_CURRENT_MENU(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.menu._id).toBe("menu1");
      expect(data.menu.items).toHaveLength(2);
    });

    it("should return 404 when no menu exists for current day", async () => {
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

      // Mock no menu found
      vi.mocked(Menu.findOne).mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      } as any);

      const request = new NextRequest("http://localhost:3000/api/menu/current");
      const response = await GET_CURRENT_MENU(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("No menu available for today");
    });
  });

  describe("POST /api/menu", () => {
    it("should create a new menu for admin users", async () => {
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
        _id: "newMenu",
        date: new Date("2025-07-23"),
        items: [
          { name: "Burger", description: "Beef burger", available: true },
          { name: "Fries", description: "French fries", available: true },
        ],
        createdBy: "admin1",
        toObject: () => ({
          _id: "newMenu",
          date: new Date("2025-07-23"),
          items: [
            { name: "Burger", description: "Beef burger", available: true },
            { name: "Fries", description: "French fries", available: true },
          ],
          createdBy: "admin1",
        }),
      };

      vi.mocked(Menu.create).mockResolvedValue(mockCreatedMenu as any);

      const request = new NextRequest("http://localhost:3000/api/menu", {
        method: "POST",
        body: JSON.stringify({
          date: "2025-07-23",
          items: [
            { name: "Burger", description: "Beef burger", available: true },
            { name: "Fries", description: "French fries", available: true },
          ],
        }),
      });

      const response = await POST_MENU(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.menu._id).toBe("newMenu");
      expect(data.menu.items).toHaveLength(2);
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
          date: "2025-07-23",
          items: [
            { name: "Burger", description: "Beef burger", available: true },
            { name: "Fries", description: "French fries", available: true },
          ],
        }),
      });

      const response = await POST_MENU(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("PUT /api/menu/[id]/toggle", () => {
    it("should toggle menu item availability for admin users", async () => {
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
          { name: "Pasta", description: "Italian pasta", available: false }, // Toggled to false
          { name: "Salad", description: "Fresh salad", available: true },
        ],
        createdBy: "admin1",
        toObject: () => ({
          _id: "menu1",
          date: new Date("2025-07-21"),
          items: [
            { name: "Pasta", description: "Italian pasta", available: false },
            { name: "Salad", description: "Fresh salad", available: true },
          ],
          createdBy: "admin1",
        }),
      };

      // First find the menu
      vi.mocked(Menu.findById).mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: "menu1",
          date: new Date("2025-07-21"),
          items: [
            { name: "Pasta", description: "Italian pasta", available: true },
            { name: "Salad", description: "Fresh salad", available: true },
          ],
          createdBy: "admin1",
        }),
      } as any);

      // Then update it
      vi.mocked(Menu.findOneAndUpdate).mockResolvedValue(
        mockUpdatedMenu as any
      );

      const request = new NextRequest(
        "http://localhost:3000/api/menu/menu1/toggle",
        {
          method: "PUT",
          body: JSON.stringify({ itemIndex: 0 }),
        }
      );

      // Mock params
      const params = { id: "menu1" };

      const response = await TOGGLE_MENU_ITEM(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.menu.items[0].available).toBe(false);
      expect(data.menu.items[1].available).toBe(true);
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
        "http://localhost:3000/api/menu/menu1/toggle",
        {
          method: "PUT",
          body: JSON.stringify({ itemIndex: 0 }),
        }
      );

      // Mock params
      const params = { id: "menu1" };

      const response = await TOGGLE_MENU_ITEM(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });
});
