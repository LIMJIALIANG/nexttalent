import { NextResponse, NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

// Mock memory storage for offline mode so developers can test admin additions/removals
let offlineAdmins: string[] = ["onlytheone1092@gmail.com"];

export async function GET(): Promise<NextResponse> {
  try {
    if (!supabase) {
      return NextResponse.json({ success: true, data: offlineAdmins });
    }

    const { data, error } = await supabase
      .from("admin_users")
      .select("email")
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const dbAdmins = (data || []).map((row) => row.email);
    // Guarantee super-admin is always in the list
    if (!dbAdmins.includes("onlytheone1092@gmail.com")) {
      dbAdmins.unshift("onlytheone1092@gmail.com");
    }

    return NextResponse.json({ success: true, data: dbAdmins });
  } catch (error) {
    console.error("Fetch admins error:", error);
    return NextResponse.json({ success: true, data: offlineAdmins });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { email } = await request.json();
    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 }
      );
    }

    if (!supabase) {
      if (!offlineAdmins.includes(cleanEmail)) {
        offlineAdmins.push(cleanEmail);
      }
      return NextResponse.json({ success: true, data: offlineAdmins });
    }

    const { error } = await supabase
      .from("admin_users")
      .insert([{ email: cleanEmail }]);

    if (error) {
      // Ignore duplicate key error (already admin)
      if (error.code !== "23505") {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add admin error:", error);
    return NextResponse.json(
      { error: "Failed to add admin user." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === "onlytheone1092@gmail.com") {
      return NextResponse.json(
        { error: "Cannot delete the super-admin account." },
        { status: 400 }
      );
    }

    if (!supabase) {
      offlineAdmins = offlineAdmins.filter((e) => e !== cleanEmail);
      return NextResponse.json({ success: true, data: offlineAdmins });
    }

    const { error } = await supabase
      .from("admin_users")
      .delete()
      .eq("email", cleanEmail);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete admin error:", error);
    return NextResponse.json(
      { error: "Failed to delete admin user." },
      { status: 500 }
    );
  }
}
