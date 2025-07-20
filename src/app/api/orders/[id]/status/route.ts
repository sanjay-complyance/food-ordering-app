import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Order from "@/models/Order";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { z } from "zod";

// Validation schema for status updates
const statusUpdateSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled"]),
});

// Helper function to create admin notifications
async function createAdminNotification(
  message: string,
  type: "order_modified" = "order_modified"
) {
  try {
    // Find all admin and superuser accounts
    const admins = await User.find({ role: { $in: ["admin", "superuser"] } });

    // Create notifications for each admin
    const notifications = admins.map((admin) => ({
      userId: admin._id,
      type,
      message,
      read: false,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (error) {
    console.error("Error creating admin notifications:", error);
    // Don't throw error - notification failure shouldn't break the main operation
  }
}

// PATCH /api/orders/[id]/status - Update order status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const orderId = params.id;
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = statusUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find user by email
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Find existing order
    const existingOrder = await Order.findById(orderId).populate(
      "userId",
      "name email"
    );
    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if user is admin/superuser
    const isAdmin = ["admin", "superuser"].includes(user.role);

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can update order status" },
        { status: 403 }
      );
    }

    const { status } = validationResult.data;

    // Update order status
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status },
      {
        new: true,
        runValidators: true,
      }
    ).populate("userId", "name email");

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "Failed to update order status" },
        { status: 500 }
      );
    }

    // Create notification for the order owner
    try {
      const userName = (updatedOrder.userId as any).name || (updatedOrder.userId as any).email;
      const message = `Your order for ${updatedOrder.orderDate.toDateString()} has been ${status}`;
      
      await Notification.create({
        userId: updatedOrder.userId,
        type: status === "confirmed" ? "order_confirmed" : "order_modified",
        message,
        read: false,
      });
    } catch (error) {
      console.error("Error creating user notification:", error);
      // Don't throw error - notification failure shouldn't break the main operation
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: "Order status updated successfully",
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }
} 