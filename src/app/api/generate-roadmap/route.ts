import { NextResponse, NextRequest } from "next/server";
import { generateGeminiContent } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";
import { RoadmapData } from "@/types";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { transcript, userId } = (await request.json()) as { transcript: string; userId?: string };

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: "No transcript provided." },
        { status: 400 }
      );
    }

    const prompt = `You are a career guidance AI assistant for Malaysian university students. Based on the following voice transcript from a student describing their interests, background, or dream job, generate a personalized career roadmap.

Student's Input: "${transcript}"

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "careerTitle": "The recommended career path title",
  "summary": "A brief 2-sentence summary of why this career suits them",
  "roadmapSteps": [
    {
      "step": 1,
      "title": "Step title",
      "description": "Detailed description of what to do in this step",
      "duration": "Estimated time (e.g., '3 months')",
      "skills": ["skill1", "skill2"]
    }
  ],
  "requiredSkills": ["List of all key skills needed for this career path"],
  "industryOutlook": "A brief statement about the industry outlook in Malaysia"
}

Generate between 5 and 8 roadmap steps. Be specific to the Malaysian job market context. Include both technical and soft skills.`;

    const text = await generateGeminiContent(prompt);

    // Clean potential markdown code fences
    let cleanedText = text;
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const roadmapData: RoadmapData = JSON.parse(cleanedText);

    // Store in Supabase if available (for analytics)
    if (supabase) {
      try {
        await supabase.from("roadmap_sessions").insert({
          user_id: userId || null,
          transcript: transcript,
          career_title: roadmapData.careerTitle,
          required_skills: roadmapData.requiredSkills,
          steps_count: roadmapData.roadmapSteps.length,
          created_at: new Date().toISOString(),
        });
      } catch (dbError) {
        console.warn("Failed to store analytics data:", (dbError as Error).message);
      }
    }

    return NextResponse.json({ success: true, data: roadmapData });
  } catch (error) {
    console.error("Roadmap generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate roadmap. Please try again." },
      { status: 500 }
    );
  }
}
