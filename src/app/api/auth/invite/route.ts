import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Invite from "@/models/Invite";
import User from "@/models/User";
import bcrypt from "bcryptjs";

// POST /api/auth/invite - Accept invite and create user
export async function POST(request: NextRequest) {
  await dbConnect();
  const { token, name, password } = await request.json();
  if (!token || !name || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const invite = await Invite.findOne({ token });
  if (!invite) {
    return NextResponse.json({ error: "Invalid invite token" }, { status: 400 });
  }
  if (invite.status !== "pending" || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite expired or already used" }, { status: 400 });
  }
  // Check if user already exists
  const existing = await User.findOne({ email: invite.email });
  if (existing) {
    return NextResponse.json({ error: "User already exists" }, { status: 400 });
  }
  // Create user
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: invite.email,
    name,
    password: hashed,
    role: "user",
    notificationPreferences: {
      orderReminders: true,
      orderConfirmations: true,
      orderModifications: true,
      menuUpdates: true,
      deliveryMethod: "in_app",
      frequency: "all",
    },
  });
  invite.status = "accepted";
  await invite.save();
  return NextResponse.json({ user });
} 