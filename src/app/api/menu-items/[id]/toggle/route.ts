import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("Menu Item Toggle API: Starting request for item", params.id);
    
    const session = await getServerSession(authOptions);
    console.log("Menu Item Toggle API: Session check", { 
      hasSession: !!session, 
      user: session?.user?.email 
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { available } = body;

    if (typeof available !== "boolean") {
      return NextResponse.json(
        { error: "Available status is required" },
        { status: 400 }
      );
    }

    console.log("Menu Item Toggle API: Connecting to database");
    await connectToDatabase();

    console.log("Menu Item Toggle API: Toggling item", params.id, "to", available);
    const updatedItem = await MenuItem.findByIdAndUpdate(
      params.id,
      {
        available,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedItem) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 }
      );
    }

    console.log("Menu Item Toggle API: Toggled item successfully");
    return NextResponse.json({ item: updatedItem });
  } catch (error) {
    console.error("Menu Item Toggle API: Error toggling item:", error);
    return NextResponse.json(
      { error: "Failed to toggle menu item" },
      { status: 500 }
    );
  }
} 