import { NextResponse, NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const careerTitle = searchParams.get("careerTitle");

    if (!supabase) {
      return NextResponse.json({ success: true, data: null });
    }

    if (!userId || userId === "undefined" || userId === "null") {
      return NextResponse.json({ success: true, data: null });
    }

    let query = supabase
      .from("skill_analyses")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    // If a specific career title is provided, filter by it
    if (careerTitle) {
      query = query.eq("career_title", careerTitle);
    }

    const { data, error } = await query.limit(1).single();

    if (error) {
      // Row not found or table issue — return null safely
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Fetch user analysis error:", error);
    return NextResponse.json({ success: true, data: null });
  }
}
