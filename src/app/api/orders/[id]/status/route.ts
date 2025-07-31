import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from '@/lib/auth';
import connectToDatabase from "@/lib/mongodb";
import Order from "@/models/Order";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { z } from "zod";

// Validation schema for status updates
const statusUpdateSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled"]),
});



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
      const message = `Your order for ${updatedOrder.orderDate.toDateString()} has been ${status}`;
      
      await Notification.create({
        userId: updatedOrder.userId,
        type: status === "confirmed" ? "order_confirmed" : "order_modified",
        message,
        read: false,
      });

      // Send push notification if user has subscription
      const orderOwner = await User.findById(updatedOrder.userId);
      if (orderOwner?.pushSubscription) {
        try {
          const { sendPushNotification } = await import('@/lib/notifications');
          const statusEmoji = status === "confirmed" ? "✅" : status === "cancelled" ? "❌" : "⏳";
          const statusText = status === "confirmed" ? "confirmed" : status === "cancelled" ? "cancelled" : "is pending";
          
          await sendPushNotification(orderOwner.pushSubscription, {
            title: `Order ${statusText} ${statusEmoji}`,
            options: {
              body: `Your order for ${updatedOrder.orderDate.toDateString()} has been ${status}`,
              icon: "/icons/icon-192x192.svg",
              badge: "/icons/icon-72x72.svg",
              tag: "order-status-update",
              requireInteraction: true,
              actions: [
                {
                  action: "view",
                  title: "View Order",
                  icon: "/icons/icon-72x72.svg",
                },
                {
                  action: "dismiss",
                  title: "Dismiss",
                },
              ],
            },
          });
        } catch (pushError) {
          console.error("Failed to send push notification:", pushError);
          // Don't fail the status update if push notification fails
        }
      }
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