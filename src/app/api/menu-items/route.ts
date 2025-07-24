import { NextRequest, NextResponse } from "next/server";
import { getServerSession, authOptions } from '@/lib/auth';
import connectToDatabase from "@/lib/mongodb";
import { MenuItem } from "@/models/MenuItem";

export async function GET() {
  try {
    console.log("Menu Items API: Starting request");
    
    const session = await getServerSession(authOptions);
    console.log("Menu Items API: Session check", { 
      hasSession: !!session, 
      user: session?.user?.email 
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Menu Items API: Connecting to database");
    await connectToDatabase();

    console.log("Menu Items API: Fetching all menu items");
    const items = await MenuItem.find({}).sort({ createdAt: -1 });
    console.log("Menu Items API: Found", items.length, "items");

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Menu Items API: Error fetching items:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu items" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("Menu Items API: Starting POST request");
    
    const session = await getServerSession(authOptions);
    console.log("Menu Items API: Session check", { 
      hasSession: !!session, 
      user: session?.user?.email 
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, available } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    console.log("Menu Items API: Connecting to database");
    await connectToDatabase();

    console.log("Menu Items API: Creating new menu item");
    const newItem = new MenuItem({
      name,
      description,
      available: available !== undefined ? available : true,
      createdBy: session.user.email,
    });

    const savedItem = await newItem.save();
    console.log("Menu Items API: Created item with ID", savedItem._id);

    return NextResponse.json({ item: savedItem }, { status: 201 });
  } catch (error) {
    console.error("Menu Items API: Error creating item:", error);
    return NextResponse.json(
      { error: "Failed to create menu item" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log("Menu Items API: Starting PUT request");
    
    const session = await getServerSession(authOptions);
    console.log("Menu Items API: Session check", { 
      hasSession: !!session, 
      user: session?.user?.email 
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { _id, name, description, available } = body;

    if (!_id || !name || !description) {
      return NextResponse.json(
        { error: "ID, name and description are required" },
        { status: 400 }
      );
    }

    console.log("Menu Items API: Connecting to database");
    await connectToDatabase();

    console.log("Menu Items API: Updating menu item", _id);
    const updatedItem = await MenuItem.findByIdAndUpdate(
      _id,
      {
        name,
        description,
        available: available !== undefined ? available : true,
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

    console.log("Menu Items API: Updated item successfully");
    return NextResponse.json({ item: updatedItem });
  } catch (error) {
    console.error("Menu Items API: Error updating item:", error);
    return NextResponse.json(
      { error: "Failed to update menu item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("Menu Items API: Starting DELETE request");
    
    const session = await getServerSession(authOptions);
    console.log("Menu Items API: Session check", { 
      hasSession: !!session, 
      user: session?.user?.email 
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    console.log("Menu Items API: Connecting to database");
    await connectToDatabase();

    console.log("Menu Items API: Deleting menu item", id);
    const deletedItem = await MenuItem.findByIdAndDelete(id);

    if (!deletedItem) {
      return NextResponse.json(
        { error: "Menu item not found" },
        { status: 404 }
      );
    }

    console.log("Menu Items API: Deleted item successfully");
    return NextResponse.json({ message: "Menu item deleted successfully" });
  } catch (error) {
    console.error("Menu Items API: Error deleting item:", error);
    return NextResponse.json(
      { error: "Failed to delete menu item" },
      { status: 500 }
    );
  }
} 