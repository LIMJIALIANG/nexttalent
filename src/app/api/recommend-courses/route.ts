import { NextResponse, NextRequest } from "next/server";
import { findCoursesForSkills } from "@/lib/courses-data";
import { MissingSkill } from "@/types";

interface RecommendCoursesBody {
  missingSkills: (string | MissingSkill)[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { missingSkills } = (await request.json()) as RecommendCoursesBody;

    if (!missingSkills || !Array.isArray(missingSkills) || missingSkills.length === 0) {
      return NextResponse.json(
        { error: "Missing skills array is required." },
        { status: 400 }
      );
    }

    // Extract skill names from the missing skills objects
    const skillNames: string[] = missingSkills.map((s) =>
      typeof s === "string" ? s : s.skill
    );

    const recommendations = findCoursesForSkills(skillNames);

    return NextResponse.json({
      success: true,
      data: {
        recommendations,
        totalCoursesFound: Object.values(recommendations).flat().length,
        skillsCovered: Object.keys(recommendations).filter(
          (k) => recommendations[k].length > 0
        ).length,
        skillsWithoutCourses: Object.keys(recommendations).filter(
          (k) => recommendations[k].length === 0
        ),
      },
    });
  } catch (error) {
    console.error("Course recommendation error:", error);
    return NextResponse.json(
      { error: "Failed to fetch course recommendations." },
      { status: 500 }
    );
  }
}
