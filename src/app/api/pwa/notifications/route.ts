import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, body, icon, badge, tag, data } = await request.json();

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // In a real implementation, you would:
    // 1. Store push subscription endpoints for users
    // 2. Use a service like Firebase Cloud Messaging or Web Push Protocol
    // 3. Send notifications to registered devices

    // For now, we'll just return success and let the client handle the notification
    const notificationPayload = {
      title,
      options: {
        body,
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

export async function GET(request: NextRequest) {
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
