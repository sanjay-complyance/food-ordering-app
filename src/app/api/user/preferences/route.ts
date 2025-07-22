import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { INotificationPreferences } from "@/types/models";
import {
  handleApiError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from "@/lib/api-error-handler";

// GET /api/user/preferences - Get notification preferences for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError();
    }

    await dbConnect();

    // Get user to find their preferences
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return NextResponse.json({ preferences: user.notificationPreferences });
  } catch (error) {
    return handleApiError(error, "/api/user/preferences");
  }
}

// PUT /api/user/preferences - Update notification preferences for the current user
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError();
    }

    await dbConnect();

    // Get user to update their preferences
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const preferences = await request.json();

    // Validate preferences
    validatePreferences(preferences);

    // Update user preferences
    user.notificationPreferences = {
      orderReminders: Boolean(preferences.orderReminders),
      orderConfirmations: Boolean(preferences.orderConfirmations),
      orderModifications: Boolean(preferences.orderModifications),
      menuUpdates: Boolean(preferences.menuUpdates),
      deliveryMethod: preferences.deliveryMethod,
      frequency: preferences.frequency,
    };

    await user.save();

    return NextResponse.json({
      message: "Preferences updated successfully",
      preferences: user.notificationPreferences,
    });
  } catch (error) {
    return handleApiError(error, "/api/user/preferences");
  }
}

// Validate notification preferences
function validatePreferences(
  preferences: any
): asserts preferences is INotificationPreferences {
  // Check if preferences is an object
  if (!preferences || typeof preferences !== "object") {
    throw new ValidationError("Invalid preferences format");
  }

  // Validate boolean fields
  const booleanFields = [
    "orderReminders",
    "orderConfirmations",
    "orderModifications",
    "menuUpdates",
  ];
  for (const field of booleanFields) {
    if (typeof preferences[field] !== "boolean") {
      throw new ValidationError(`${field} must be a boolean`);
    }
  }

  // Validate delivery method
  const validDeliveryMethods = ["in_app", "email", "both"];
  if (!validDeliveryMethods.includes(preferences.deliveryMethod)) {
    throw new ValidationError("Invalid delivery method");
  }

  // Validate frequency
  const validFrequencies = ["all", "important_only", "none"];
  if (!validFrequencies.includes(preferences.frequency)) {
    throw new ValidationError("Invalid notification frequency");
  }
}
