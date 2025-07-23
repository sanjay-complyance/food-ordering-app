import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import dbConnect from "@/lib/mongodb";
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.email || !body.password || !body.name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    let validatedData;
    try {
      validatedData = signupSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues;
        if (issues.some((i) => i.path.includes("email") && i.message.includes("Invalid email address"))) {
          return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }
        if (issues.some((i) => i.path.includes("password") && i.message.includes("Password must be at least 6 characters"))) {
          return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
        }
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      }
      throw error;
    }
    const { email, password, name } = validatedData;

    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Determine user role - superuser detection
    const role = email === process.env.SUPERUSER_EMAIL ? "superuser" : "user";

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role,
    });

    // Return user without password
    const userWithoutPassword = user.toObject();

    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        user: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
