import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Menu from "@/models/Menu";

export async function GET() {
  try {
    console.log("Menu API: Starting request");
    
    const session = await auth();
    console.log("Menu API: Session check", { hasSession: !!session, user: session?.user?.email });

    if (!session?.user) {
      console.log("Menu API: Unauthorized - no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Menu API: Connecting to database");
    await dbConnect();

    // Get all menus for admin view
    console.log("Menu API: Fetching all menus");
    const menus = await Menu.find({}).populate("createdBy", "name email").sort({ createdAt: -1 });

    console.log("Menu API: Found", menus.length, "menus");
    return NextResponse.json({
      success: true,
      menus: menus,
    });
  } catch (error) {
    console.error("Menu API: Error occurred", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin and superuser can create menus
    if (!["admin", "superuser"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await dbConnect();

    const { name, description, items } = await request.json();

    if (!name || !items || !Array.isArray(items)) {
      return NextResponse.json(
        {
          error: "Name and items array are required",
        },
        { status: 400 }
      );
    }

    // Check if menu with same name already exists
    const existingMenu = await Menu.findOne({ name });
    if (existingMenu) {
      return NextResponse.json(
        {
          error: "Menu with this name already exists",
        },
        { status: 409 }
      );
    }

    // Deactivate all existing menus if this one should be active
    await Menu.updateMany({}, { isActive: false });

    // Create new menu
    const menu = new Menu({
      name,
      description,
      items,
      isActive: true,
      createdBy: session.user.id,
    });

    await menu.save();
    await menu.populate("createdBy", "name email");

    return NextResponse.json(
      {
        success: true,
        data: menu,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Menu creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin and superuser can update menus
    if (!["admin", "superuser"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await dbConnect();

    const { _id, name, description, items } = await request.json();

    if (!_id || !name || !items || !Array.isArray(items)) {
      return NextResponse.json(
        {
          error: "Menu ID, name and items array are required",
        },
        { status: 400 }
      );
    }

    // Update existing menu
    const menu = await Menu.findByIdAndUpdate(
      _id,
      { name, description, items, updatedAt: new Date() },
      { new: true }
    ).populate("createdBy", "name email");

    if (!menu) {
      return NextResponse.json(
        { error: "Menu not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: menu,
    });
  } catch (error) {
    console.error("Menu update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin and superuser can delete menus
    if (!["admin", "superuser"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Menu ID parameter is required" },
        { status: 400 }
      );
    }

    const menu = await Menu.findByIdAndDelete(id);

    if (!menu) {
      return NextResponse.json(
        { error: "Menu not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Menu deleted successfully",
    });
  } catch (error) {
    console.error("Menu deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
