import { IUser, NotificationType } from "@/types/models";
import { sendEmailNotification } from "./email-notifications";
import Notification from "@/models/Notification";

/**
 * Check if a user should receive a notification based on their preferences
 */
export function shouldReceiveNotification(
  user: IUser,
  notificationType: NotificationType
): boolean {
  const prefs = user.notificationPreferences;

  // If frequency is set to none, don't send any notifications
  if (prefs.frequency === "none") {
    return false;
  }

  // Check specific notification type preferences
  switch (notificationType) {
    case "order_reminder":
      return prefs.orderReminders;
    case "order_confirmed":
      return prefs.orderConfirmations;
    case "order_modified":
      return prefs.orderModifications;
    case "menu_updated":
      // Menu updates are considered less important
      if (prefs.frequency === "important_only") {
        return false;
      }
      return prefs.menuUpdates;
    default:
      return true;
  }
}

/**
 * Check if a notification type is considered important
 */
export function isImportantNotification(
  notificationType: NotificationType
): boolean {
  const importantTypes: NotificationType[] = [
    "order_reminder",
    "order_confirmed",
    "order_modified",
  ];
  return importantTypes.includes(notificationType);
}

/**
 * Filter notifications based on user preferences
 */
export function filterNotificationsByPreferences(
  user: IUser,
  notificationType: NotificationType
): boolean {
  // If frequency is important_only, only show important notifications
  if (user.notificationPreferences.frequency === "important_only") {
    return isImportantNotification(notificationType);
  }

  // Otherwise, check if user wants this specific type
  return shouldReceiveNotification(user, notificationType);
}

/**
 * Send notification to user based on their delivery preferences
 */
export async function sendNotificationToUser(
  user: IUser,
  type: NotificationType,
  message: string
): Promise<{ inApp: boolean; email: boolean }> {
  const result = { inApp: false, email: false };

  // Check if user should receive this notification
  if (!shouldReceiveNotification(user, type)) {
    return result;
  }

  const prefs = user.notificationPreferences;

  // Send in-app notification
  if (prefs.deliveryMethod === "in_app" || prefs.deliveryMethod === "both") {
    try {
      const notification = new Notification({
        userId: user._id,
        type,
        message,
        read: false,
      });
      await notification.save();
      result.inApp = true;
    } catch (error) {
      console.error("Failed to create in-app notification:", error);
    }
  }

  // Send email notification
  if (prefs.deliveryMethod === "email" || prefs.deliveryMethod === "both") {
    try {
      const emailSent = await sendEmailNotification(user, type, message);
      result.email = emailSent;
    } catch (error) {
      console.error("Failed to send email notification:", error);
    }
  }

  return result;
}
