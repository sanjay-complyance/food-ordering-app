import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { NotificationType } from "@/types/models";
import { ObjectId } from "mongoose";

export interface CreateNotificationParams {
  userId?: ObjectId | string | null;
  type: NotificationType;
  message: string;
}

export interface SendBulkNotificationParams {
  userIds?: (ObjectId | string)[];
  type: NotificationType;
  message: string;
  systemWide?: boolean;
}

/**
 * Create a single notification
 */
export async function createNotification({
  userId,
  type,
  message,
}: CreateNotificationParams) {
  await dbConnect();

  const notification = new Notification({
    userId: userId || null,
    type,
    message,
    read: false,
  });

  await notification.save();
  return notification;
}

/**
 * Send notifications to multiple users or system-wide
 */
export async function sendBulkNotifications({
  userIds,
  type,
  message,
  systemWide = false,
}: SendBulkNotificationParams) {
  await dbConnect();

  const notifications = [];

  if (systemWide) {
    // Send system-wide notification
    notifications.push(
      new Notification({
        userId: null,
        type,
        message,
        read: false,
      })
    );
  } else if (userIds && userIds.length > 0) {
    // Send to specific users
    for (const userId of userIds) {
      notifications.push(
        new Notification({
          userId,
          type,
          message,
          read: false,
        })
      );
    }
  }

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }

  return {
    count: notifications.length,
    notifications,
  };
}

/**
 * Get notifications for a specific user
 */
export async function getUserNotifications(
  userId: ObjectId | string,
  options: {
    unreadOnly?: boolean;
    limit?: number;
    skip?: number;
  } = {}
) {
  await dbConnect();

  const { unreadOnly = false, limit = 50, skip = 0 } = options;

  const query: any = {
    $or: [
      { userId },
      { userId: null }, // system-wide notifications
    ],
  };

  if (unreadOnly) {
    query.read = false;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  return notifications;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: ObjectId | string,
  userId: ObjectId | string
) {
  await dbConnect();

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      $or: [
        { userId },
        { userId: null }, // system-wide notifications
      ],
    },
    { read: true },
    { new: true }
  );

  return notification;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: ObjectId | string) {
  await dbConnect();

  const result = await Notification.updateMany(
    {
      $or: [
        { userId },
        { userId: null }, // system-wide notifications
      ],
      read: false,
    },
    { read: true }
  );

  return result;
}

/**
 * Delete old notifications (cleanup)
 */
export async function cleanupOldNotifications(daysOld: number = 30) {
  await dbConnect();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await Notification.deleteMany({
    createdAt: { $lt: cutoffDate },
  });

  return result;
}

/**
 * Get notification counts for a user
 */
export async function getNotificationCounts(userId: ObjectId | string) {
  await dbConnect();

  const [total, unread] = await Promise.all([
    Notification.countDocuments({
      $or: [{ userId }, { userId: null }],
    }),
    Notification.countDocuments({
      $or: [{ userId }, { userId: null }],
      read: false,
    }),
  ]);

  return { total, unread };
}

/**
 * Send order modification notification to admins
 */
export async function notifyAdminsOfOrderModification(
  userName: string,
  orderDetails: string,
  modificationType: "created" | "updated" | "cancelled"
) {
  await dbConnect();

  // Get all admin and superuser accounts
  const admins = await User.find(
    {
      role: { $in: ["admin", "superuser"] },
    },
    "_id"
  );

  if (admins.length === 0) {
    return { count: 0 };
  }

  const actionText = {
    created: "placed a new",
    updated: "modified their",
    cancelled: "cancelled their",
  };

  const message = `📝 ${userName} ${actionText[modificationType]} order: ${orderDetails}`;

  return await sendBulkNotifications({
    userIds: admins.map((admin) => admin._id),
    type: "order_modified",
    message,
  });
}

/**
 * Check if daily reminders should be sent
 */
export function shouldSendDailyReminders(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Check if it's 10:30 AM on a weekday (Monday-Friday)
  const isWeekday = currentDay >= 1 && currentDay <= 5;
  const isReminderTime = currentHour === 10 && currentMinute === 30;

  return isWeekday && isReminderTime;
}

/**
 * Check if reminders have already been sent today
 */
export async function hasReminderBeenSentToday(): Promise<boolean> {
  await dbConnect();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingReminder = await Notification.findOne({
    type: "order_reminder",
    createdAt: {
      $gte: today,
      $lt: tomorrow,
    },
  });

  return !!existingReminder;
}
