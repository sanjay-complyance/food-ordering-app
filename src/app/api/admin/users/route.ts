import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from '@/lib/auth';
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/admin/users - Get all users (superuser only)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions - only superuser can access user management
    if (session.user.role !== "superuser") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    // Find all users
    const users = await User.find({}, "email name role createdAt").sort({
      createdAt: -1,
    }).lean();

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
