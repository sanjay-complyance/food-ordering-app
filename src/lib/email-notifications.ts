import { IUser, NotificationType } from "@/types/models";

/**
 * Email notification service
 * This is a placeholder implementation that logs emails instead of sending them
 * In a production environment, this would integrate with a service like Resend, SendGrid, etc.
 */

interface EmailNotification {
  to: string;
  subject: string;
  message: string;
  type: NotificationType;
}

/**
 * Send an email notification to a user
 */
export async function sendEmailNotification(
  user: IUser,
  type: NotificationType,
  message: string
): Promise<boolean> {
  try {
    const email: EmailNotification = {
      to: user.email,
      subject: getEmailSubject(type),
      message: formatEmailMessage(message, user.name),
      type,
    };

    // In a real implementation, this would send the email
    // For now, we'll just log it
    console.log("📧 Email notification:", {
      to: email.to,
      subject: email.subject,
      message: email.message,
      type: email.type,
    });

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return true;
  } catch (error) {
    console.error("Failed to send email notification:", error);
    return false;
  }
}

/**
 * Get email subject based on notification type
 */
function getEmailSubject(type: NotificationType): string {
  switch (type) {
    case "order_reminder":
      return "🍽️ Daily Lunch Order Reminder";
    case "order_confirmed":
      return "✅ Your Lunch Order is Confirmed";
    case "order_modified":
      return "📝 Your Lunch Order has been Modified";
    case "menu_updated":
      return "🆕 New Menu Available";
    default:
      return "📢 Lunch Ordering Notification";
  }
}

/**
 * Format email message with user's name
 */
function formatEmailMessage(message: string, userName: string): string {
  return `Hi ${userName},

${message}

Best regards,
Daily Lunch Ordering System

---
You can manage your notification preferences by logging into the app and clicking the settings icon.`;
}

/**
 * Send bulk email notifications to multiple users
 */
export async function sendBulkEmailNotifications(
  users: IUser[],
  type: NotificationType,
  message: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const success = await sendEmailNotification(user, type, message);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Failed to send email to ${user.email}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}
