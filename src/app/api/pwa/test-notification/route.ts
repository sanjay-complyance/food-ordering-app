import { NextResponse } from "next/server";
import { getServerSession, authOptions } from '@/lib/auth';
import User from '@/models/User';
import { sendPushNotification } from '@/lib/notifications';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user with push subscription
    const user = await User.findOne({ email: session.user.email });
    
    if (!user?.pushSubscription) {
      return NextResponse.json({ 
        error: "No push subscription found. Please enable push notifications first." 
      }, { status: 400 });
    }

    // Send test notification
    await sendPushNotification(user.pushSubscription, {
      title: "Test Notification 🔔",
      options: {
        body: "This is a test push notification from your food ordering app!",
        icon: "/icons/icon-192x192.svg",
        badge: "/icons/icon-72x72.svg",
        tag: "test-notification",
        requireInteraction: true,
        actions: [
          {
            action: "view",
            title: "View App",
            icon: "/icons/icon-72x72.svg",
          },
          {
            action: "dismiss",
            title: "Dismiss",
          },
        ],
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Test notification sent successfully!" 
    });
  } catch (error) {
    console.error("Test notification error:", error);
    return NextResponse.json(
      { error: "Failed to send test notification" },
      { status: 500 }
    );
  }
} 