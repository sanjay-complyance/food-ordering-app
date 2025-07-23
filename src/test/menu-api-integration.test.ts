/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { MenuItem } from "@/models/MenuItem";

// Mock dependencies
vi.mock("@/lib/mongodb", () => ({
  default: vi.fn(),
}));

vi.mock("@/models/Menu", () => {
  const menuStaticMethods = {
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
  const Menu = vi.fn(function (this: any, ...args: any[]) {
    Object.assign(this, ...args);
  });
  Object.assign(Menu, menuStaticMethods);
  return { default: Menu };
});

vi.mock("@/models/MenuItem", () => ({
  MenuItem: { find: vi.fn() },
  default: { find: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Import after mocking
import { GET as GET_MENU, POST as POST_MENU } from "@/app/api/menu/route";
import { GET as GET_CURRENT_MENU } from "@/app/api/menu/current/route";
import { PATCH as TOGGLE_MENU_ITEM } from "@/app/api/menu/[id]/toggle/route";
import dbConnect from "@/lib/mongodb";
// (Removed import of Menu to avoid conflict with local mock)
import { auth } from "@/lib/auth";

// Helper to create a mock menu instance with .save() and .populate() chain
function createMockMenuInstance(menuObj: any) {
  const menu: any = { ...menuObj };
  menu.populate = vi.fn().mockReturnValue(menu);
  menu.save = vi.fn().mockImplementation(() => Promise.resolve(menu));
  return menu;
}

const mockMenus = [
  { _id: "menu1", name: "Menu 1", items: [{ _id: "item1", available: true }, { _id: "item2", available: true }] },
  { _id: "menu2", name: "Menu 2", items: [{ _id: "item3", available: true }] },
];

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
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin",
        },
        expires: "2099-12-31T23:59:59.999Z",
      });

      const { default: Menu } = await import("@/models/Menu");
      const menuFindMock = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockMenus),
        lean: vi.fn().mockResolvedValue(mockMenus),
        then: (onFulfilled: any) => Promise.resolve(mockMenus).then(onFulfilled),
      };
      vi.mocked(Menu.find).mockReturnValue(menuFindMock as any);

      const request = new NextRequest("http://localhost:3000/api/menu");
      const response = await GET_MENU(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.menus).toHaveLength(2);
      expect(data.menus[0]._id).toBe("menu1");
      expect(data.menus[1]._id).toBe("menu2");
    });

    it("should return all menus for non-admin users (no role restriction)", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock regular user session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          role: "user",
        },
        expires: "2099-12-31T23:59:59.999Z",
      });

      const { default: Menu } = await import("@/models/Menu");
      const menuFindMock = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockMenus),
        lean: vi.fn().mockResolvedValue(mockMenus),
        then: (onFulfilled: any) => Promise.resolve(mockMenus).then(onFulfilled),
      };
      vi.mocked(Menu.find).mockReturnValue(menuFindMock as any);

      const request = new NextRequest("http://localhost:3000/api/menu");
      const response = await GET_MENU(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.menus).toHaveLength(2);
      expect(data.menus[0]._id).toBe("menu1");
      expect(data.menus[1]._id).toBe("menu2");
    });

    it("should return 401 for unauthenticated users", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock no session
      vi.mocked(auth).mockResolvedValue(null);

      const { default: Menu } = await import("@/models/Menu");
      const menuFindMock = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockMenus),
        lean: vi.fn().mockResolvedValue(mockMenus),
        then: (onFulfilled: any) => Promise.resolve(mockMenus).then(onFulfilled),
      };
      vi.mocked(Menu.find).mockReturnValue(menuFindMock as any);

      const request = new NextRequest("http://localhost:3000/api/menu");
      const response = await GET_MENU(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("GET /api/menu/current", () => {
    it("should return current day's menu for authenticated users", async () => {
      vi.mocked(dbConnect).mockResolvedValue(undefined);
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          role: "user",
        },
        expires: "2099-12-31T23:59:59.999Z",
      });
      const mockMenuItems = [
        { name: "Pasta", description: "Italian pasta", available: true },
        { name: "Salad", description: "Fresh salad", available: true },
      ];
      // Mock MenuItem.find().sort() chain as a thenable
      const menuItemFindMock = {
        sort: vi.fn().mockReturnValue({
          then: (onFulfilled: any) => Promise.resolve(mockMenuItems).then(onFulfilled),
        }),
        then: (onFulfilled: any) => Promise.resolve({ sort: () => ({ then: (f: any) => f(mockMenuItems) }) }).then(onFulfilled),
      };
      (MenuItem.find as any).mockReturnValue(menuItemFindMock);
      const request = new NextRequest("http://localhost:3000/api/menu/current");
      const response = await GET_CURRENT_MENU(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.menu).toBeDefined();
      expect(data.menu.items).toHaveLength(2);
    });

    it("should return 404 when no menu exists for current day", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock user session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          role: "user",
        },
        expires: "2099-12-31T23:59:59.999Z",
      });

      // Mock no menu found
      // For /menu/current, mock MenuItem.find().sort().exec() to return []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (MenuItem.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue([]),
        }),
      });

      const { default: Menu } = await import("@/models/Menu");
      vi.mocked(Menu.findOne).mockResolvedValue(null as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      const request = new NextRequest("http://localhost:3000/api/menu/current");
      const response = await GET_CURRENT_MENU(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });
  });

  describe("POST /api/menu", () => {
    it("should create a new menu for admin users", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock admin session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin",
        },
        expires: "2099-12-31T23:59:59.999Z",
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

      const mockMenuInstance = createMockMenuInstance(mockCreatedMenu);
      const { default: Menu } = await import("@/models/Menu");
      (Menu as any).mockImplementation(() => mockMenuInstance);

      const request = new NextRequest("http://localhost:3000/api/menu", {
        method: "POST",
        body: JSON.stringify({
          name: "Lunch Menu",
          description: "A test menu",
          items: [
            { name: "Burger", description: "Beef burger", available: true },
            { name: "Fries", description: "French fries", available: true },
          ],
        }),
      });

      const response = await POST_MENU(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data._id).toBe("newMenu");
      expect(data.data.items).toHaveLength(2);
    });

    it("should return 401 for non-admin users", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock regular user session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          role: "user",
        },
        expires: "2099-12-31T23:59:59.999Z",
      });

      const { default: Menu } = await import("@/models/Menu");
      vi.mocked(Menu.find).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(mockMenus),
            lean: vi.fn().mockResolvedValue(mockMenus),
          }),
        }),
        sort: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockMenus),
          lean: vi.fn().mockResolvedValue(mockMenus),
        }),
        exec: vi.fn().mockResolvedValue(mockMenus),
        lean: vi.fn().mockResolvedValue(mockMenus),
      } as any);

      const request = new NextRequest("http://localhost:3000/api/menu", {
        method: "POST",
        body: JSON.stringify({
          name: "Lunch Menu",
          description: "A test menu",
          items: [
            { name: "Burger", description: "Beef burger", available: true },
            { name: "Fries", description: "French fries", available: true },
          ],
        }),
      });

      const response = await POST_MENU(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Insufficient permissions");
    });
  });

  describe("PATCH /api/menu/[id]/toggle", () => {
    it("should toggle menu item availability for admin users", async () => {
      vi.mocked(dbConnect).mockResolvedValue(undefined);
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin",
        },
        expires: "2099-12-31T23:59:59.999Z",
      });
      const mockUpdatedMenu = {
        _id: "menu1",
        date: new Date("2025-07-21"),
        items: [
          { name: "Pasta", description: "Italian pasta", available: false },
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
      // Mock Menu.findByIdAndUpdate(...).populate() chain
      const menuFindByIdAndUpdateMock = {
        populate: vi.fn().mockReturnValue(mockUpdatedMenu),
      };
      const { default: Menu } = await import("@/models/Menu");
      vi.mocked(Menu.findByIdAndUpdate).mockReturnValue(menuFindByIdAndUpdateMock as any);
      const request = new NextRequest(
        "http://localhost:3000/api/menu/menu1/toggle",
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: false }),
        }
      );
      const params = { id: "menu1" };
      const response = await TOGGLE_MENU_ITEM(request, { params });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items[0].available).toBe(false);
      expect(data.data.items[1].available).toBe(true);
    });

    it("should return 401 for non-admin users", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock regular user session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user1",
          email: "user@example.com",
          role: "user",
        },
        expires: "2099-12-31T23:59:59.999Z",
      });

      const { default: Menu } = await import("@/models/Menu");
      vi.mocked(Menu.find).mockReturnValue({
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(mockMenus),
            lean: vi.fn().mockResolvedValue(mockMenus),
          }),
        }),
        sort: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue(mockMenus),
          lean: vi.fn().mockResolvedValue(mockMenus),
        }),
        exec: vi.fn().mockResolvedValue(mockMenus),
        lean: vi.fn().mockResolvedValue(mockMenus),
      } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/menu/menu1/toggle",
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: false }),
        }
      );

      // Mock params
      const params = { id: "menu1" };

      const response = await TOGGLE_MENU_ITEM(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Insufficient permissions");
    });
  });
});
