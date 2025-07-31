import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";
import { auth } from "@/lib/auth";

// GET /api/settings - Get current reminder settings
export async function GET() {
  await dbConnect();
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  return NextResponse.json({ settings });
}

// PUT /api/settings - Update reminder settings (admin only)
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !["admin", "superuser"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await dbConnect();
  const { menuUpdateReminderTime, orderReminderTime } = await request.json();
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ menuUpdateReminderTime, orderReminderTime });
  } else {
    if (menuUpdateReminderTime) settings.menuUpdateReminderTime = menuUpdateReminderTime;
    if (orderReminderTime) settings.orderReminderTime = orderReminderTime;
    await settings.save();
  }
  return NextResponse.json({ settings });
} 