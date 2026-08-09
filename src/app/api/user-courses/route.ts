import { NextResponse, NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { Course } from "@/types";

interface RecordCourseBody {
  userId?: string | null;
  course: Course;
  skillCategory?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId, course, skillCategory } = (await request.json()) as RecordCourseBody;

    if (!course || !course.title || !course.url) {
      return NextResponse.json(
        { error: "Course object with title and url is required." },
        { status: 400 }
      );
    }

    if (!supabase) {
      // Local development or no DB connected - return success
      return NextResponse.json({ success: true, storedLocally: true });
    }

    if (userId && userId !== "undefined" && userId !== "null") {
      // Check if this course is already recorded for the user
      const { data: existing } = await supabase
        .from("user_seen_courses")
        .select("id, click_count")
        .eq("user_id", userId)
        .eq("course_title", course.title)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Update viewed_at timestamp and increment click_count
        const { error: updateError } = await supabase
          .from("user_seen_courses")
          .update({
            viewed_at: new Date().toISOString(),
            click_count: (existing.click_count || 1) + 1,
            course_id: course.id,
            provider: course.provider,
            url: course.url,
            level: course.level,
            duration: course.duration,
            keywords: course.keywords || [],
            skill_category: skillCategory || null,
          })
          .eq("id", existing.id);

        if (updateError) {
          console.warn("Failed to update seen course timestamp:", updateError.message);
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from("user_seen_courses")
          .insert({
            user_id: userId,
            course_id: course.id,
            course_title: course.title,
            provider: course.provider,
            url: course.url,
            level: course.level,
            duration: course.duration,
            keywords: course.keywords || [],
            skill_category: skillCategory || null,
            viewed_at: new Date().toISOString(),
            click_count: 1,
          });

        if (insertError) {
          console.warn("Failed to insert seen course:", insertError.message);
        }
      }
    } else {
      // Guest user — insert anonymous log record
      try {
        await supabase.from("user_seen_courses").insert({
          user_id: null,
          course_id: course.id,
          course_title: course.title,
          provider: course.provider,
          url: course.url,
          level: course.level,
          duration: course.duration,
          keywords: course.keywords || [],
          skill_category: skillCategory || null,
          viewed_at: new Date().toISOString(),
          click_count: 1,
        });
      } catch (err) {
        console.warn("Failed to log guest course view:", (err as Error).message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Record course error:", error);
    return NextResponse.json(
      { error: "Failed to record course interaction." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const daysParam = searchParams.get("days"); // '7', '15', '30', or 'all'

    if (!supabase) {
      return NextResponse.json({ success: true, data: [] });
    }

    if (!userId || userId === "undefined" || userId === "null") {
      return NextResponse.json({ success: true, data: [] });
    }

    let query = supabase
      .from("user_seen_courses")
      .select("*")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false });

    // Apply timeframe filter if numeric days specified
    if (daysParam && daysParam !== "all") {
      const days = parseInt(daysParam, 10);
      if (!isNaN(days) && days > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        query = query.gte("viewed_at", cutoffDate.toISOString());
      }
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Could not fetch user seen courses:", error.message);
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Fetch seen courses error:", error);
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const recordId = searchParams.get("id");
    const clearAll = searchParams.get("clearAll") === "true";

    if (!supabase) {
      return NextResponse.json({ success: true });
    }

    if (!userId || userId === "undefined" || userId === "null") {
      return NextResponse.json({ success: true });
    }

    if (clearAll) {
      await supabase.from("user_seen_courses").delete().eq("user_id", userId);
      return NextResponse.json({ success: true, message: "History cleared." });
    }

    if (recordId) {
      await supabase
        .from("user_seen_courses")
        .delete()
        .eq("id", recordId)
        .eq("user_id", userId);
      return NextResponse.json({ success: true, message: "Record removed." });
    }

    return NextResponse.json({ error: "Missing id or clearAll param." }, { status: 400 });
  } catch (error) {
    console.error("Delete course history error:", error);
    return NextResponse.json({ error: "Failed to delete course history." }, { status: 500 });
  }
}
