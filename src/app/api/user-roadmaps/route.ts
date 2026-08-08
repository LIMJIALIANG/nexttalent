import { NextResponse, NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!supabase) {
      return NextResponse.json({ success: true, data: [] });
    }

    if (!userId || userId === "undefined" || userId === "null") {
      return NextResponse.json({ success: true, data: [] });
    }

    const { data, error } = await supabase
      .from("roadmap_sessions")
      .select("id, transcript, career_title, required_skills, steps_count, roadmap_data, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Fetch user roadmaps error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user roadmaps." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!supabase) {
      return NextResponse.json({ success: true, message: "Deleted locally" });
    }

    if (!id) {
      return NextResponse.json(
        { error: "Roadmap record ID is required for deletion." },
        { status: 400 }
      );
    }

    let query = supabase.from("roadmap_sessions").delete().eq("id", id);
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: "Roadmap deleted successfully." });
  } catch (error) {
    console.error("Delete user roadmap error:", error);
    return NextResponse.json(
      { error: "Failed to delete roadmap." },
      { status: 500 }
    );
  }
}
