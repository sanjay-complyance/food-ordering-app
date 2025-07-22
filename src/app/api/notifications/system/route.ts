import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { NotificationType } from "@/types/models";
import {
  shouldReceiveNotification,
  sendNotificationToUser,
} from "@/lib/notification-preferences";
import { handleApiError } from "@/lib/api-error-handler";

// POST /api/notifications/system - Create system-wide notifications (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get user to check permissions
    const user = await User.findOne({ email: session.user.email });
    if (!user || (user.role !== "admin" && user.role !== "superuser")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, message, userIds } = body;

    // Validate required fields
    if (!type || !message) {
      return NextResponse.json(
        { error: "Type and message are required" },
        { status: 400 }
      );
    }

    // Validate notification type
    const validTypes: NotificationType[] = [
      "order_reminder",
      "order_confirmed",
      "order_modified",
      "menu_updated",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid notification type" },
        { status: 400 }
      );
    }

    const notifications = [];

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Create notifications for specific users
      for (const userId of userIds) {
        const targetUser = await User.findById(userId);
        if (targetUser) {
          // Check if user should receive this notification based on their preferences
          if (shouldReceiveNotification(targetUser, type)) {
            // Send notification based on user's delivery preferences
            const result = await sendNotificationToUser(
              targetUser,
              type,
              message
            );

            if (result.inApp) {
              // Find the created notification to include in response
              const notification = await Notification.findOne({
                userId: targetUser._id,
                type,
                message,
              }).sort({ createdAt: -1 });

              if (notification) {
                notifications.push(notification);
              }
            }
          }
        }
      }
    } else {
      // Create system-wide notification (visible to all users)
      const notification = new Notification({
        userId: null, // null means system-wide
        type,
        message,
        read: false,
      });
      await notification.save();
      notifications.push(notification);

      // For system-wide notifications, also send emails to users who prefer email delivery
      const users = await User.find({
        "notificationPreferences.deliveryMethod": { $in: ["email", "both"] },
      });

      for (const user of users) {
        if (shouldReceiveNotification(user, type)) {
          // Only send email, as the in-app notification is already created as system-wide
          await sendNotificationToUser(user, type, message);
        }
      }
    }

    return NextResponse.json(
      {
        notifications,
        count: notifications.length,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "/api/notifications/system");
  }
}

// GET /api/notifications/system - Get system notification stats (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get user to check permissions
    const user = await User.findOne({ email: session.user.email });
    if (!user || (user.role !== "admin" && user.role !== "superuser")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get notification statistics
    const totalNotifications = await Notification.countDocuments();
    const systemNotifications = await Notification.countDocuments({
      userId: null,
    });
    const unreadNotifications = await Notification.countDocuments({
      read: false,
    });

    // Get recent notifications
    const recentNotifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      stats: {
        total: totalNotifications,
        system: systemNotifications,
        unread: unreadNotifications,
      },
      recent: recentNotifications,
    });
  } catch (error) {
    return handleApiError(error, "/api/notifications/system");
  }
}
