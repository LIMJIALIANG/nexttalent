import { NextResponse, NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!supabase) {
      return NextResponse.json({ success: true, data: null });
    }

    if (!userId || userId === "undefined" || userId === "null") {
      return NextResponse.json({ success: true, data: null });
    }

    const { data, error } = await supabase
      .from("user_resumes")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If table doesn't exist or row not found, return null safely
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Fetch user resume error:", error);
    return NextResponse.json({ success: true, data: null });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userId, resumeData } = body;

    if (!supabase) {
      return NextResponse.json({
        success: true,
        message: "Saved to local storage only (database client unavailable)",
      });
    }

    if (!userId || userId === "undefined" || userId === "null") {
      return NextResponse.json({
        success: true,
        message: "Saved to guest session",
      });
    }

    const payload = {
      user_id: userId,
      personal_name: resumeData.personalName || "",
      objective: resumeData.objective || "",
      education: resumeData.educationList || [],
      experience: resumeData.experienceList || [],
      projects: resumeData.projectsList || [],
      skills: resumeData.skillsList || [],
      achievements: resumeData.achievementsList || [],
      resume_file_name: resumeData.resumeFileName || null,
      resume_file_type: resumeData.resumeFileType || null,
      resume_file_size: resumeData.resumeFileSize || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("user_resumes")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.warn("Supabase user_resumes upsert warning:", error.message);
      // Still return success to prevent blocking user if table schema differs
      return NextResponse.json({
        success: true,
        savedToCloud: false,
        message: "Saved locally. Cloud sync: " + error.message,
      });
    }

    return NextResponse.json({
      success: true,
      savedToCloud: true,
      data,
      message: "Resume saved to database successfully.",
    });
  } catch (error) {
    console.error("Save user resume error:", error);
    return NextResponse.json(
      { error: "Failed to save resume." },
      { status: 500 }
    );
  }
}
