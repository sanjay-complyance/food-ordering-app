import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from '@/lib/auth';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (body.subscription) {
      // Save push subscription to user
      await User.updateOne(
        { email: session.user.email },
        { $set: { pushSubscription: body.subscription } }
      );
      return NextResponse.json({ success: true });
    }

    const { title, body: notifBody, icon, badge, tag, data } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // For now, we'll just return success and let the client handle the notification
    const notificationPayload = {
      title,
      options: {
        body: notifBody,
        icon: icon || "/icons/icon-192x192.svg",
        badge: badge || "/icons/icon-72x72.svg",
        tag: tag || "lunch-notification",
        data: data || {},
        requireInteraction: true,
        actions: [
          {
            action: "view",
            title: "View",
            icon: "/icons/icon-72x72.svg",
          },
          {
            action: "dismiss",
            title: "Dismiss",
          },
        ],
      },
    };

    return NextResponse.json({
      success: true,
      notification: notificationPayload,
    });
  } catch (error) {
    console.error("PWA notification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Return PWA configuration and capabilities
    return NextResponse.json({
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || "",
      notificationsSupported: true,
      pushSupported: true,
    });
  } catch (error) {
    console.error("PWA config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
