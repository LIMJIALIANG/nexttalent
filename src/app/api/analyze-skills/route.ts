import { NextResponse, NextRequest } from "next/server";
import { generateGeminiContent } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";
import { RoadmapData, SkillAnalysis } from "@/types";

interface AnalyzeSkillsBody {
  resumeText: string;
  roadmapData: RoadmapData;
  userId?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { resumeText, roadmapData, userId } = (await request.json()) as AnalyzeSkillsBody;

    if (!resumeText || !roadmapData) {
      return NextResponse.json(
        { error: "Resume text and roadmap data are required." },
        { status: 400 }
      );
    }

    const prompt = `You are a skill-gap analysis AI for Malaysian university students. Analyze the following resume/bio against the career roadmap requirements.

Resume/Bio:
"${resumeText}"

Target Career: ${roadmapData.careerTitle}
Required Skills: ${JSON.stringify(roadmapData.requiredSkills)}
Roadmap Steps: ${JSON.stringify(roadmapData.roadmapSteps.map((s) => s.title))}

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "overallMatchPercentage": 65,
  "matchedSkills": [
    {
      "skill": "Skill name",
      "proficiencyLevel": "strong|moderate|basic",
      "evidence": "Brief evidence from resume"
    }
  ],
  "missingSkills": [
    {
      "skill": "Skill name",
      "importance": "critical|important|nice-to-have",
      "recommendation": "Brief recommendation on how to acquire this"
    }
  ],
  "strengthsSummary": "2-3 sentences about the student's strengths",
  "gapsSummary": "2-3 sentences about key gaps to address",
  "priorityActions": ["Action 1", "Action 2", "Action 3"]
}

Be encouraging but honest. Focus on actionable advice for the Malaysian context.`;

    const text = await generateGeminiContent(prompt);

    let cleanedText = text;
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const analysisData: SkillAnalysis = JSON.parse(cleanedText);

    // Store in Supabase if available (for analytics)
    if (supabase) {
      try {
        await supabase.from("skill_analyses").insert({
          user_id: userId || null,
          career_title: roadmapData.careerTitle,
          match_percentage: analysisData.overallMatchPercentage,
          matched_skills_count: analysisData.matchedSkills.length,
          missing_skills: analysisData.missingSkills.map((s) => s.skill),
          created_at: new Date().toISOString(),
        });
      } catch (dbError) {
        console.warn("Failed to store analytics data:", (dbError as Error).message);
      }
    }

    return NextResponse.json({ success: true, data: analysisData });
  } catch (error) {
    console.error("Skill analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze skills. Please try again." },
      { status: 500 }
    );
  }
}
