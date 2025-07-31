import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Invite from "@/models/Invite";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import { sendEmailNotification } from "@/lib/email-notifications";
import { IUser } from "@/types/models";

// POST /api/admin/invite - Create an invite (admin only)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !["admin", "superuser"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await dbConnect();
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3); // 3 days
  const invite = await Invite.create({ email, token, expiresAt });
  // Send invite email (replace with real link in production)
  const signupUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/invite?token=${token}`;
  await sendEmailNotification(
    { email, name: email, _id: '', role: 'user', notificationPreferences: {} } as unknown as IUser,
    "menu_updated",
    `You have been invited to join the Lunch Ordering App. Click here to sign up: ${signupUrl}`
  );
  return NextResponse.json({ invite });
}

// GET /api/admin/invite - List invites (admin only) or fetch by token
export async function GET(request: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (token) {
    const invite = await Invite.find({ token });
    return NextResponse.json({ invites: invite });
  }
  const session = await auth();
  if (!session?.user || !["admin", "superuser"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const invites = await Invite.find().sort({ createdAt: -1 });
  return NextResponse.json({ invites });
} 