import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock database and models
vi.mock("@/lib/mongodb", () => ({
  default: vi.fn(),
}));

// Create a proper mock constructor for Order
const mockOrderInstance = {
  save: vi.fn(),
  populate: vi.fn(),
};

vi.mock("@/models/Order", () => {
  const mockOrder = vi.fn(() => mockOrderInstance);
  mockOrder.find = vi.fn();
  mockOrder.findOne = vi.fn();
  mockOrder.findById = vi.fn();
  mockOrder.findByIdAndUpdate = vi.fn();
  mockOrder.findByIdAndDelete = vi.fn();
  return { default: mockOrder };
});

vi.mock("@/models/User", () => ({
  default: {
    find: vi.fn(),
  },
}));

vi.mock("@/models/Notification", () => ({
  default: {
    insertMany: vi.fn(),
  },
}));

// Import API functions and mocked modules after mocking
import { GET, POST, PUT, DELETE } from "@/app/api/orders/route";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import User from "@/models/User";
import Notification from "@/models/Notification";

const mockAuth = vi.mocked(auth);
const mockDbConnect = vi.mocked(dbConnect);
const mockOrder = vi.mocked(Order);
const mockUser = vi.mocked(User);
const mockNotification = vi.mocked(Notification);

// Helper function to create mock request
function createMockRequest(
  url: string,
  method: string = "GET",
  body?: any
): NextRequest {
  const request = new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
  return request;
}

// Mock data
const mockUser1 = {
  id: "user1",
  email: "user1@example.com",
  name: "User One",
  role: "user",
};

const mockAdmin = {
  id: "admin1",
  email: "admin@example.com",
  name: "Admin User",
  role: "admin",
};

const mockOrder1 = {
  _id: "order1",
  userId: {
    _id: "user1",
    name: "User One",
    email: "user1@example.com",
  },
  orderDate: {
    toDateString: () => "Mon Jan 15 2024",
  },
  menuItemName: "Chicken Sandwich",
  menuItemDescription: "Grilled chicken with lettuce and tomato",
  status: "pending",
  createdAt: "2024-01-15T09:00:00.000Z",
  updatedAt: "2024-01-15T09:00:00.000Z",
};

describe("Orders API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/orders", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createMockRequest("http://localhost:3000/api/orders");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return user orders successfully", async () => {
      mockAuth.mockResolvedValue({ user: mockUser1 } as any);

      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue([mockOrder1]),
        }),
      });
      mockOrder.find = mockFind;

      const request = createMockRequest("http://localhost:3000/api/orders");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0]._id).toBe("order1");
      expect(data.data[0].menuItemName).toBe("Chicken Sandwich");
      expect(mockFind).toHaveBeenCalledWith({ userId: "user1" });
    });

    it("should filter orders by date when date parameter is provided", async () => {
      mockAuth.mockResolvedValue({ user: mockUser1 } as any);

      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue([mockOrder1]),
        }),
      });
      mockOrder.find = mockFind;

      const request = createMockRequest(
        "http://localhost:3000/api/orders?date=2024-01-15"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockFind).toHaveBeenCalledWith({
        userId: "user1",
        orderDate: {
          $gte: expect.any(Date),
          $lt: expect.any(Date),
        },
      });
    });

    it("should return 400 for invalid date format", async () => {
      mockAuth.mockResolvedValue({ user: mockUser1 } as any);

      const request = createMockRequest(
        "http://localhost:3000/api/orders?date=invalid-date"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid date format");
    });

    it("should handle database errors", async () => {
      mockAuth.mockResolvedValue({ user: mockUser1 } as any);
      mockOrder.find = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          populate: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      });

      const request = createMockRequest("http://localhost:3000/api/orders");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to fetch orders");
    });
  });

  describe("POST /api/orders", () => {
    // Use a future date to avoid validation errors
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split("T")[0];

    const validOrderData = {
      orderDate: tomorrowString,
      menuItemName: "Chicken Sandwich",
      menuItemDescription: "Grilled chicken with lettuce and tomato",
    };

    it("should return 401 if user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createMockRequest(
        "http://localhost:3000/api/orders",
        "POST",
        validOrderData
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should create order successfully", async () => {
      mockAuth.mockResolvedValue({ user: mockUser1 } as any);
      mockOrder.findOne = vi.fn().mockResolvedValue(null); // No existing order

      // Mock the Order constructor and instance methods
      mockOrderInstance.save.mockResolvedValue(mockOrder1);
      mockOrderInstance.populate.mockResolvedValue(mockOrder1);

      const request = createMockRequest(
        "http://localhost:3000/api/orders",
        "POST",
        validOrderData
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Order created successfully");
      expect(mockOrderInstance.save).toHaveBeenCalled();
    });

    it("should return 409 if user already has order for the date", async () => {
      mockAuth.mockResolvedValue({ user: mockUser1 } as any);
      mockOrder.findOne = vi.fn().mockResolvedValue(mockOrder1); // Existing order

      const request = createMockRequest(
        "http://localhost:3000/api/orders",
        "POST",
        validOrderData
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("You already have an order for this date");
    });

    it("should return 400 for invalid order data", async () => {
      mockAuth.mockResolvedValue({ user: mockUser1 } as any);

      const invalidData = {
        orderDate: "2024-01-15",
        menuItemName: "", // Invalid: empty name
        menuItemDescription: "Description",
      };

      const request = createMockRequest(
        "http://localhost:3000/api/orders",
        "POST",
        invalidData
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details).toBeDefined();
    });

    it("should return 400 for past order date", async () => {
      mockAuth.mockResolvedValue({ user: mockUser1 } as any);

      const pastDateData = {
        ...validOrderData,
        orderDate: "2020-01-01", // Past date
      };

      const request = createMockRequest(
        "http://localhost:3000/api/orders",
        "POST",
        pastDateData
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });
  });

  describe("PUT /api/orders", () => {
    const updateData = {
      menuItemName: "Updated Sandwich",
      menuItemDescription: "Updated description",
    };

    it("should return 401 if user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createMockRequest(
        "http://localhost:3000/api/orders?id=order1",
        "PUT",
        updateData
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 400 if order ID is missing", async () => {
      mockAuth.mockResolvedValue({ user: mockUser1 } as any);

      const request = createMockRequest(
        "http://localhost:3000/api/orders",
        "PUT",
        updateData
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Order ID is required");
    });

    it("should return 404 if order not found", async () => {
      mockAuth.mockResolvedValue({ user: mockUser1 } as any);
      mockOrder.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(null),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders?id=nonexistent",
        "PUT",
        updateData
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Order not found");
    });

    it("should update order successfully for owner", async () => {
      mockAuth.mockResolvedValue({ user: mockUser1 } as any);

      const existingOrder = {
        ...mockOrder1,
        userId: { _id: "user1", name: "User One", email: "user1@example.com" },
      };

      mockOrder.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(existingOrder),
      });

      const updatedOrder = { ...existingOrder, ...updateData };
      mockOrder.findByIdAndUpdate = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(updatedOrder),
      });

      // Mock admin users for notification
      mockUser.find = vi.fn().mockResolvedValue([mockAdmin]);
      mockNotification.insertMany = vi.fn().mockResolvedValue([]);

      const request = createMockRequest(
        "http://localhost:3000/api/orders?id=order1",
        "PUT",
        updateData
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Order updated successfully");
      expect(mockNotification.insertMany).toHaveBeenCalled(); // Admin notification created
    });

    it("should return 403 if user tries to update someone else's order", async () => {
      mockAuth.mockResolvedValue({
        user: { ...mockUser1, id: "user2" },
      } as any);

      const existingOrder = {
        ...mockOrder1,
        userId: { _id: "user1", name: "User One", email: "user1@example.com" },
      };

      mockOrder.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(existingOrder),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders?id=order1",
        "PUT",
        updateData
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You can only modify your own orders");
    });

    it("should return 400 if user tries to update confirmed order", async () => {
      mockAuth.mockResolvedValue({ user: mockUser1 } as any);

      const confirmedOrder = {
        ...mockOrder1,
        userId: { _id: "user1", name: "User One", email: "user1@example.com" },
        status: "confirmed",
      };

      mockOrder.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(confirmedOrder),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders?id=order1",
        "PUT",
        updateData
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot modify confirmed orders");
    });

    it("should allow admin to update any order including status", async () => {
      mockAuth.mockResolvedValue({ user: mockAdmin } as any);

      const existingOrder = {
        ...mockOrder1,
        userId: { _id: "user1", name: "User One", email: "user1@example.com" },
      };

      mockOrder.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(existingOrder),
      });

      const adminUpdateData = { ...updateData, status: "confirmed" };
      const updatedOrder = { ...existingOrder, ...adminUpdateData };

      mockOrder.findByIdAndUpdate = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(updatedOrder),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders?id=order1",
        "PUT",
        adminUpdateData
      );
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe("confirmed");
    });
  });

  describe("DELETE /api/orders", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createMockRequest(
        "http://localhost:3000/api/orders?id=order1",
        "DELETE"
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });

    it("should return 400 if order ID is missing", async () => {
      mockAuth.mockResolvedValue({ user: mockUser1 } as any);

      const request = createMockRequest(
        "http://localhost:3000/api/orders",
        "DELETE"
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Order ID is required");
    });

    it("should return 404 if order not found", async () => {
      mockAuth.mockResolvedValue({ user: mockUser1 } as any);
      mockOrder.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(null),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders?id=nonexistent",
        "DELETE"
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Order not found");
    });

    it("should delete order successfully for owner", async () => {
      mockAuth.mockResolvedValue({ user: mockUser1 } as any);

      const existingOrder = {
        ...mockOrder1,
        userId: { _id: "user1", name: "User One", email: "user1@example.com" },
      };

      mockOrder.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(existingOrder),
      });
      mockOrder.findByIdAndDelete = vi.fn().mockResolvedValue(existingOrder);

      // Mock admin users for notification
      mockUser.find = vi.fn().mockResolvedValue([mockAdmin]);
      mockNotification.insertMany = vi.fn().mockResolvedValue([]);

      const request = createMockRequest(
        "http://localhost:3000/api/orders?id=order1",
        "DELETE"
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Order deleted successfully");
      expect(mockOrder.findByIdAndDelete).toHaveBeenCalledWith("order1");
      expect(mockNotification.insertMany).toHaveBeenCalled(); // Admin notification created
    });

    it("should return 403 if user tries to delete someone else's order", async () => {
      mockAuth.mockResolvedValue({
        user: { ...mockUser1, id: "user2" },
      } as any);

      const existingOrder = {
        ...mockOrder1,
        userId: { _id: "user1", name: "User One", email: "user1@example.com" },
      };

      mockOrder.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(existingOrder),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders?id=order1",
        "DELETE"
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You can only delete your own orders");
    });

    it("should return 400 if user tries to delete confirmed order", async () => {
      mockAuth.mockResolvedValue({ user: mockUser1 } as any);

      const confirmedOrder = {
        ...mockOrder1,
        userId: { _id: "user1", name: "User One", email: "user1@example.com" },
        status: "confirmed",
      };

      mockOrder.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(confirmedOrder),
      });

      const request = createMockRequest(
        "http://localhost:3000/api/orders?id=order1",
        "DELETE"
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot delete confirmed orders");
    });

    it("should allow admin to delete any order", async () => {
      mockAuth.mockResolvedValue({ user: mockAdmin } as any);

      const existingOrder = {
        ...mockOrder1,
        userId: { _id: "user1", name: "User One", email: "user1@example.com" },
        status: "confirmed",
      };

      mockOrder.findById = vi.fn().mockReturnValue({
        populate: vi.fn().mockResolvedValue(existingOrder),
      });
      mockOrder.findByIdAndDelete = vi.fn().mockResolvedValue(existingOrder);

      const request = createMockRequest(
        "http://localhost:3000/api/orders?id=order1",
        "DELETE"
      );
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockOrder.findByIdAndDelete).toHaveBeenCalledWith("order1");
    });
  });
});
