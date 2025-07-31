import { NextResponse } from "next/server";
import {
  shouldSendMenuUpdateReminders,
  hasMenuUpdateReminderBeenSentToday,
  sendMenuUpdateReminderToAdmins,
  shouldSendDailyReminders,
  hasReminderBeenSentToday,
  sendBulkNotifications,
} from "@/lib/notifications";

// POST /api/cron - Run scheduled jobs (menu update reminder, order reminder, etc.)
export async function POST() {
  const results: Record<string, string> = {};

  // Menu update reminder for admins
  if (
    await shouldSendMenuUpdateReminders() &&
    !(await hasMenuUpdateReminderBeenSentToday())
  ) {
    const count = await sendMenuUpdateReminderToAdmins();
    results.menuUpdateReminder = `Sent to ${count} admins`;
  } else {
    results.menuUpdateReminder = "Not time or already sent";
  }

  // (Optional) Daily order reminder for all users
  if (
    await shouldSendDailyReminders() &&
    !(await hasReminderBeenSentToday())
  ) {
    // System-wide notification (order reminder)
    await sendBulkNotifications({
      type: "order_reminder",
      message: "Please place your lunch order for today!",
      systemWide: true,
    });
    results.orderReminder = "Order reminder sent";
  } else {
    results.orderReminder = "Not time or already sent";
  }

  return NextResponse.json({ success: true, results });
} 