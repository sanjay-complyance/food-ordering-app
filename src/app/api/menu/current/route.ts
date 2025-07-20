import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log("Current Menu API: Starting request");
    
    const session = await getServerSession(authOptions);
    console.log("Current Menu API: Session check", { 
      hasSession: !!session, 
      user: session?.user?.email 
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Current Menu API: Connecting to database");
    await connectToDatabase();

    console.log("Current Menu API: Fetching available menu items");
    const items = await MenuItem.find({ available: true }).sort({ createdAt: -1 });
    console.log("Current Menu API: Found", items.length, "available items");

    // Create a menu object with the available items
    const menu = {
      _id: "current-menu",
      name: "Current Menu",
      description: "Available menu items",
      items: items.map(item => ({
        name: item.name,
        description: item.description,
        available: item.available
      })),
      isActive: true,
      createdBy: "system",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log("Current Menu API: Returning menu with", items.length, "items");
    return NextResponse.json({ menu });
  } catch (error) {
    console.error("Current Menu API: Error fetching current menu:", error);
    return NextResponse.json(
      { error: "Failed to fetch current menu" },
      { status: 500 }
    );
  }
} 