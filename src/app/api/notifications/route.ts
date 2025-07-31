import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { NotificationType } from "@/types/models";
import {
  handleApiError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@/lib/api-error-handler";
import {
  filterNotificationsByPreferences,
  sendNotificationToUser,
} from "@/lib/notification-preferences";

// GET /api/notifications - Get notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError();
    }

    await dbConnect();

    // Find user by email
    const user = await User.findOne({ email: session.user.email }).exec();
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build query - get user-specific notifications and system-wide notifications
    const query: Record<string, unknown> = {
      $or: [
        { userId: user._id },
        { userId: null }, // system-wide notifications
      ],
    };

    if (unreadOnly) {
      query.read = false;
    }

    const allNotifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 2) // Get more to account for filtering
      .lean();

    // Filter notifications based on user preferences
    const filteredNotifications = allNotifications
      .filter((notification) =>
        filterNotificationsByPreferences(user, notification.type)
      )
      .slice(0, limit);

    return NextResponse.json({ notifications: filteredNotifications });
  } catch (error) {
    return handleApiError(error, "/api/notifications");
  }
}

// POST /api/notifications - Create a new notification (admin/system only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError();
    }

    await dbConnect();

    // Get user to check permissions
    const user = await User.findOne({ email: session.user.email });
    if (!user || (user.role !== "admin" && user.role !== "superuser")) {
      throw new ForbiddenError();
    }

    const body = await request.json();
    const { userId, type, message } = body;

    // Validate required fields
    if (!type || !message) {
      throw new ValidationError("Type and message are required");
    }

    // Validate notification type
    const validTypes: NotificationType[] = [
      "order_reminder",
      "order_confirmed",
      "order_modified",
      "menu_updated",
    ];
    if (!validTypes.includes(type)) {
      throw new ValidationError("Invalid notification type");
    }

    // If userId is provided, validate it exists and check preferences
    if (userId) {
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        throw new NotFoundError("Target user not found");
      }

      // Send notification based on user preferences
      const result = await sendNotificationToUser(targetUser, type, message);

      if (!result.inApp && !result.email) {
        return NextResponse.json(
          {
            message: "Notification not sent due to user preferences",
            skipped: true,
          },
          { status: 200 }
        );
      }

      // Find the created notification to include in response
      const notification = await Notification.findOne({
        userId: targetUser._id,
        type,
        message,
      }).sort({ createdAt: -1 });

      return NextResponse.json(
        {
          notification,
          deliveryMethods: result,
        },
        { status: 201 }
      );
    }

    // For system-wide notifications
    const notification = new Notification({
      userId: null,
      type,
      message,
      read: false,
    });

    await notification.save();

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "/api/notifications");
  }
}
