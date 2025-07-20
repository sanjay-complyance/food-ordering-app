import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import User from "@/models/User";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/admin/orders - Get all orders for a specific date (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!["admin", "superuser"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    // Get date from query params
    const url = new URL(request.url);
    const date = url.searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    // Create date range for the specified date (start of day to end of day)
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Find all orders for the specified date
    const orders = await Order.find({
      orderDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ createdAt: -1 });

    // Get user details for each order
    const ordersWithUserDetails = await Promise.all(
      orders.map(async (order) => {
        const orderUser = await User.findById(order.userId, "name email");
        return {
          ...order.toObject(),
          userName: orderUser ? orderUser.name : "Unknown User",
          userEmail: orderUser ? orderUser.email : "unknown@example.com",
        };
      })
    );

    return NextResponse.json({ orders: ordersWithUserDetails });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
