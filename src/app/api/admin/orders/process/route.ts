import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { sendBulkNotifications } from "@/lib/notifications";

// POST /api/admin/orders/process - Process all orders for a specific date (admin only)
export async function POST(request: NextRequest) {
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

    // Get date from request body
    const { date } = await request.json();
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

    // Update all pending orders to confirmed
    const result = await Order.updateMany(
      {
        orderDate: {
          $gte: startDate,
          $lte: endDate,
        },
        status: "pending",
      },
      {
        $set: { status: "confirmed" },
      }
    );

    // Find all users who had orders processed
    const processedOrders = await Order.find({
      orderDate: {
        $gte: startDate,
        $lte: endDate,
      },
      status: "confirmed",
    });

    // Group orders by user
    const userOrders = processedOrders.reduce((acc, order) => {
      if (!acc[order.userId.toString()]) {
        acc[order.userId.toString()] = [];
      }
      acc[order.userId.toString()].push(order);
      return acc;
    }, {} as Record<string, typeof processedOrders>);

    // Send notifications to users
    const userIds = Object.keys(userOrders);
    if (userIds.length > 0) {
      await sendBulkNotifications({
        userIds,
        type: "order_confirmed",
        message: "Your lunch order has been processed and confirmed!",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Orders processed successfully",
      processed: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error processing orders:", error);
    return NextResponse.json(
      { error: "Failed to process orders" },
      { status: 500 }
    );
  }
}
