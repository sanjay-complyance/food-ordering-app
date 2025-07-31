import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from '@/lib/auth';
import connectToDatabase from "@/lib/mongodb";
import Order from "@/models/Order";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { orderSchema } from "@/lib/validations";

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

// GET /api/orders - Get orders for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    await connectToDatabase();

    // Find user by email
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const query: Record<string, unknown> = { userId: user._id };

    // If date parameter is provided, filter by date
    if (dateParam) {
      const [filterYear, filterMonth, filterDay] = dateParam.split('-').map(Number);
      const date = new Date(filterYear, filterMonth - 1, filterDay); // month is 0-indexed
      
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format" },
          { status: 400 }
        );
      }

      // Create start and end of the specified date in UTC
      const startOfDay = new Date(Date.UTC(filterYear, filterMonth - 1, filterDay, 0, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(filterYear, filterMonth - 1, filterDay, 23, 59, 59, 999));

      query.orderDate = {
        $gte: startOfDay,
        $lt: endOfDay,
      };
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "name email");

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = orderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { orderDate, items } = validationResult.data;

    console.log("Order creation - Input orderDate:", orderDate);
    console.log("Order creation - Current date:", new Date().toISOString());

    await connectToDatabase();

    // Find user by email
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user already has an active order for this date (excluding cancelled orders)
    const [checkYear, checkMonth, checkDay] = orderDate.split('-').map(Number);
    const orderDateStart = new Date(Date.UTC(checkYear, checkMonth - 1, checkDay, 0, 0, 0, 0));
    const orderDateEnd = new Date(Date.UTC(checkYear, checkMonth - 1, checkDay, 23, 59, 59, 999));
    
    const existingOrder = await Order.findOne({
      userId: user._id,
      orderDate: {
        $gte: orderDateStart,
        $lt: orderDateEnd,
      },
      status: { $ne: "cancelled" }, // Exclude cancelled orders
    });

    if (existingOrder) {
      return NextResponse.json(
        { error: "You already have an active order for this date" },
        { status: 409 }
      );
    }

    // Create new order with proper date handling
    // Parse the date string and create a date at start of day in UTC
    const [orderYear, orderMonth, orderDay] = orderDate.split('-').map(Number);
    
    // Create date at start of day in UTC to avoid timezone issues
    const orderDateObj = new Date(Date.UTC(orderYear, orderMonth - 1, orderDay, 0, 0, 0, 0));
    
    console.log("Order creation - Parsed orderDate:", orderDateObj);
    console.log("Order creation - OrderDate ISO:", orderDateObj.toISOString());
    
    const order = new Order({
      userId: user._id,
      orderDate: orderDateObj,
      items: items,
      status: "pending",
    });

    await order.save();
    await order.populate("userId", "name email");

    // Create notification for the user
    try {
      const notification = new Notification({
        userId: user._id,
        type: "order_confirmed",
        message: `Your order for ${new Date(orderDate).toLocaleDateString()} has been placed successfully!`,
        read: false,
      });
      await notification.save();

      // Send push notification if user has subscription
      if (user.pushSubscription) {
        try {
          const { sendPushNotification } = await import('@/lib/notifications');
          await sendPushNotification(user.pushSubscription, {
            title: "Order Confirmed! 🍽️",
            options: {
              body: `Your order for ${new Date(orderDate).toLocaleDateString()} has been placed successfully!`,
              icon: "/icons/icon-192x192.svg",
              badge: "/icons/icon-72x72.svg",
              tag: "order-confirmation",
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
          // Don't fail the order creation if push notification fails
        }
      }
    } catch (notificationError) {
      console.error("Failed to create notification:", notificationError);
      // Don't fail the order creation if notification fails
    }

    // Create admin notification
    try {
      await createAdminNotification(
        `${user.name} (${user.email}) placed a new order for ${new Date(orderDate).toLocaleDateString()}`,
        "order_modified"
      );
    } catch (adminNotificationError) {
      console.error("Failed to create admin notification:", adminNotificationError);
      // Don't fail the order creation if admin notification fails
    }

    return NextResponse.json(
      {
        success: true,
        data: order,
        message: "Order created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

// PUT /api/orders - Update an existing order
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const user = await User.findOne({ email: session.user.email }).exec();
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("id");

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Check if this is a status-only update (for backward compatibility)
    if (body.status && Object.keys(body).length === 1) {
      // Handle status-only update
      await connectToDatabase();

      // Use user already declared at the top
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

      // Check if user is admin/superuser for status updates
      const isAdmin = ["admin", "superuser"].includes(user.role);
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Only admins can update order status" },
          { status: 403 }
        );
      }

      // Update order status
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { status: body.status },
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

      return NextResponse.json({
        success: true,
        data: updatedOrder,
        message: "Order status updated successfully",
      });
    }

    // Validate request body for full order update
    const validationResult = orderSchema.safeParse(body);
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

    // Find existing order
    const existingOrder = await Order.findById(orderId).populate(
      "userId",
      "name email"
    );
    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if user owns this order or is admin/superuser
    const isOwner = existingOrder.userId.toString() === user._id.toString();
    const isAdmin = ["admin", "superuser"].includes(user.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "You can only modify your own orders" },
        { status: 403 }
      );
    }

    // Check if order can be modified (not confirmed by admin)
    if (existingOrder.status === "confirmed" && !isAdmin) {
      return NextResponse.json(
        { error: "Cannot modify confirmed orders" },
        { status: 400 }
      );
    }

    // Update order
    const updateData: Record<string, unknown> = {
      items: validationResult.data.items,
    };

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
      runValidators: true,
    }).populate("userId", "name email");

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      );
    }

    // Create admin notification if order was modified by user
    if (isOwner && !isAdmin) {
      const userName = (updatedOrder.userId as unknown as { name?: string; email?: string }).name || (updatedOrder.userId as unknown as { name?: string; email?: string }).email;
      const message = `${userName} modified their order for ${updatedOrder.orderDate.toDateString()}`;
      await createAdminNotification(message);
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: "Order updated successfully",
    });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

// DELETE /api/orders - Delete an order
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("id");

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
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

    // Check if user owns this order or is admin/superuser
    const isOwner = existingOrder.userId.toString() === user._id.toString();
    const isAdmin = ["admin", "superuser"].includes(user.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "You can only delete your own orders" },
        { status: 403 }
      );
    }

    // Check if order can be deleted (not confirmed by admin)
    if (existingOrder.status === "confirmed" && !isAdmin) {
      return NextResponse.json(
        { error: "Cannot delete confirmed orders" },
        { status: 400 }
      );
    }

    // Delete order
    await Order.findByIdAndDelete(orderId);

    // Create admin notification if order was deleted by user
    if (isOwner && !isAdmin) {
      const userName = (existingOrder.userId as unknown as { name?: string; email?: string }).name || (existingOrder.userId as unknown as { name?: string; email?: string }).email;
      const message = `${userName} cancelled their order for ${existingOrder.orderDate.toDateString()}`;
      await createAdminNotification(message);
    }

    return NextResponse.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}
