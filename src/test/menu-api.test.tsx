import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OrderForm } from "@/components/menu/OrderForm";
import * as usePWA from "@/hooks/usePWA";
import { ToastProvider } from "@/lib/toast";

// Mock dependencies
vi.mock("@/lib/mongodb", () => ({
  default: vi.fn(),
}));

// Mock Menu as a constructor with static methods (like Order in orders-api.test.ts)
vi.mock("@/models/Menu", () => {
  const MenuMock = vi.fn();
  (MenuMock as any).find = vi.fn();
  (MenuMock as any).findOne = vi.fn();
  (MenuMock as any).create = vi.fn();
  (MenuMock as any).findOneAndUpdate = vi.fn();
  (MenuMock as any).findOneAndDelete = vi.fn();
  (MenuMock as any).findByIdAndUpdate = vi.fn();
  (MenuMock as any).findByIdAndDelete = vi.fn();
  (MenuMock as any).updateMany = vi.fn();
  return {
    __esModule: true,
    default: MenuMock,
  };
});

vi.mock("@/models/MenuItem", () => ({
  MenuItem: {
    find: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  authOptions: {},
}));

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

// Import after mocking
import { GET, POST, PUT, DELETE } from "@/app/api/menu/route";
import { GET as GET_CURRENT } from "@/app/api/menu/current/route";
import dbConnect from "@/lib/mongodb";
import Menu from "@/models/Menu";
import { auth } from "@/lib/auth";

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

      // Mock session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin",
        },
        expires: "2099-12-31T23:59:59.999Z"
      });

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
        populate: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue(mockMenus),
        }),
      } as Partial<typeof Menu>);

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
      // Mock session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin",
        },
        expires: "2099-12-31T23:59:59.999Z"
      });
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
      // Mock getServerSession from next-auth/next
      const { getServerSession } = await import("next-auth/next");
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin",
        },
        expires: "2099-12-31T23:59:59.999Z"
      });
      // Mock session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin",
        },
        expires: "2099-12-31T23:59:59.999Z"
      });
      // Mock MenuItem.find to return items with a sort method
      const items = [
        { name: "Pasta", description: "Italian pasta", available: true },
        { name: "Salad", description: "Fresh salad", available: true },
      ];
      const { MenuItem } = await import("@/models/MenuItem");
      vi.mocked(MenuItem.find).mockReturnValue({
        sort: vi.fn().mockReturnValue(items),
      } as any);
      const request = new NextRequest("http://localhost:3000/api/menu/current");
      const response = await GET_CURRENT(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.menu._id).toBe("current-menu");
      expect(data.menu.items).toHaveLength(2);
    });
    it("should return 404 when no menu exists for current day", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);
      // Mock getServerSession from next-auth/next
      const { getServerSession } = await import("next-auth/next");
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin",
        },
        expires: "2099-12-31T23:59:59.999Z"
      });
      // Mock session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin",
        },
        expires: "2099-12-31T23:59:59.999Z"
      });
      // Mock MenuItem.find to return empty array with a sort method
      const { MenuItem } = await import("@/models/MenuItem");
      vi.mocked(MenuItem.find).mockReturnValue({
        sort: vi.fn().mockReturnValue([]),
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
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin",
        },
        expires: "2099-12-31T23:59:59.999Z"
      });
      // Patch the MenuMock constructor for this test
      (Menu as any).mockImplementation(function (data: any) {
        return {
          ...data,
          _id: "newMenu1",
          name: "Lunch Menu",
          description: "Tasty food",
          date: new Date("2025-07-22"),
          items: [
            { name: "Burger", description: "Beef burger", available: true },
            { name: "Fries", description: "French fries", available: true },
          ],
          createdBy: "admin1",
          createdAt: new Date(),
          updatedAt: new Date(),
          save: vi.fn().mockResolvedValue(undefined),
          populate: vi.fn().mockResolvedValue({
            ...data,
            _id: "newMenu1",
            name: "Lunch Menu",
            description: "Tasty food",
            date: new Date("2025-07-22"),
            items: [
              { name: "Burger", description: "Beef burger", available: true },
              { name: "Fries", description: "French fries", available: true },
            ],
            createdBy: "admin1",
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        };
      });
      // Mock updateMany to resolve
      (Menu as any).updateMany.mockResolvedValue(undefined);
      // Mock findOne to resolve to null (no duplicate menu)
      (Menu as any).findOne.mockResolvedValue(null);
      const request = new NextRequest("http://localhost:3000/api/menu", {
        method: "POST",
        body: JSON.stringify({
          name: "Lunch Menu",
          description: "Tasty food",
          items: [
            { name: "Burger", description: "Beef burger", available: true },
            { name: "Fries", description: "French fries", available: true },
          ],
        }),
      });
      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.data._id).toBe("newMenu1");
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
        expires: "2099-12-31T23:59:59.999Z"
      });
      const request = new NextRequest("http://localhost:3000/api/menu", {
        method: "POST",
        body: JSON.stringify({
          name: "Lunch Menu",
          description: "Tasty food",
          items: [
            { name: "Burger", description: "Beef burger", available: true },
          ],
        }),
      });
      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.error).toBe("Insufficient permissions");
    });
  });

  describe("PUT /api/menu", () => {
    it("should update menu successfully as admin", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);
      // Mock admin session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin",
        },
        expires: "2099-12-31T23:59:59.999Z"
      });
      // Mock menu update
      const mockUpdatedMenu = {
        _id: "menu1",
        name: "Lunch Menu",
        description: "Delicious options",
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
      vi.mocked(Menu.findByIdAndUpdate).mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockUpdatedMenu),
      } as Partial<typeof Menu>);
      const request = new NextRequest("http://localhost:3000/api/menu", {
        method: "PUT",
        body: JSON.stringify({
          _id: "menu1",
          name: "Lunch Menu",
          description: "Delicious options",
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
      expect(data.data._id).toBe("menu1");
      expect(data.data.items[0].name).toBe("Updated Pasta");
    });
  });

  describe("DELETE /api/menu", () => {
    it("should delete menu successfully as admin", async () => {
      // Mock database connection
      vi.mocked(dbConnect).mockResolvedValue(undefined);

      // Mock admin session
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "admin1",
          email: "admin@example.com",
          role: "admin",
        },
        expires: "2099-12-31T23:59:59.999Z"
      });

      // Mock menu deletion
      vi.mocked(Menu.findByIdAndDelete).mockResolvedValue({
        _id: "menu1",
        date: new Date("2025-07-21"),
      } as Partial<typeof Menu>);

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

describe("OrderForm offline queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "onLine", { value: false, writable: true });
    localStorage.clear();
  });

  it("queues order when offline", async () => {
    const addToQueue = vi.fn();
    vi.spyOn(usePWA, "useOrderQueue").mockReturnValue({ queue: [], addToQueue, removeFromQueue: vi.fn(), syncQueue: vi.fn() });
    const mockMenuItem = { name: "Test Item", description: "A test item", available: true };
    render(
      <ToastProvider>
        <OrderForm selectedItems={[mockMenuItem]} onCancel={vi.fn()} onSuccess={vi.fn()} />
      </ToastProvider>
    );
    fireEvent.submit(screen.getByTestId("order-form"));
    await waitFor(() => {
      expect(addToQueue).toHaveBeenCalled();
      expect(screen.getByText(/queued and will be submitted/i)).toBeTruthy();
    });
  });

  it("shows queued orders and sync button", () => {
    vi.spyOn(usePWA, "useOrderQueue").mockReturnValue({ queue: [{ id: "1", items: [] }], addToQueue: vi.fn(), removeFromQueue: vi.fn(), syncQueue: vi.fn() });
    const mockMenuItem = { name: "Test Item", description: "A test item", available: true };
    render(
      <ToastProvider>
        <OrderForm selectedItems={[mockMenuItem]} onCancel={vi.fn()} onSuccess={vi.fn()} />
      </ToastProvider>
    );
    expect(screen.getByText(/1 order\(s\) queued/i)).toBeTruthy();
    expect(screen.getByText(/Sync Now/i)).toBeTruthy();
  });
});
