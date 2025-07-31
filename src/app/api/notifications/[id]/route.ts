import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";
import {
  handleApiError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@/lib/api-error-handler";
import mongoose from "mongoose";

// PUT /api/notifications/[id] - Mark notification as read/unread
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError();
    }

    await dbConnect();

    // Get user to find their ID
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const { id } = params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError("Invalid notification ID");
    }

    const body = await request.json();
    const { read } = body;

    if (typeof read !== "boolean") {
      throw new ValidationError("Read status must be a boolean");
    }

    // Find the notification
    const notification = await Notification.findById(id);
    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    // Check if user has permission to modify this notification
    // eslint-disable-next-line no-console
    console.log('DEBUG notification.userId:', notification.userId);
    // Users can only modify their own notifications or system-wide notifications
    if (
      notification.userId &&
      notification.userId.toString() !== user._id.toString()
    ) {
      throw new ForbiddenError();
    }

    // Update the notification
    // Debug log for notification object and prototype
    // eslint-disable-next-line no-console
    console.log('DEBUG notification object:', notification);
    // eslint-disable-next-line no-console
    console.log('DEBUG notification prototype:', Object.getPrototypeOf(notification));
    notification.read = read;
    await notification.save();

    return NextResponse.json({ notification });
  } catch (error) {
    return handleApiError(error, `/api/notifications/${params.id}`);
  }
}

// DELETE /api/notifications/[id] - Delete notification (optional feature)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError();
    }

    await dbConnect();

    // Get user to find their ID
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const { id } = params;
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError("Invalid notification ID");
    }

    // Find the notification
    const notification = await Notification.findById(id);
    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    // Check if user has permission to delete this notification
    // Users can only delete their own notifications, not system-wide ones
    if (
      !notification.userId ||
      notification.userId.toString() !== user._id.toString()
    ) {
      throw new ForbiddenError();
    }

    await Notification.findByIdAndDelete(id);

    return NextResponse.json({ message: "Notification deleted successfully" });
  } catch (error) {
    return handleApiError(error, `/api/notifications/${params.id}`);
  }
}
