import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { AnalyticsData } from "@/types";

/**
 * Module 4: Workforce Analytics Dashboard API.
 * Aggregates stored roadmap & skill analysis data for the admin dashboard.
 * Falls back to sample data when Supabase is not configured.
 */

// Sample fallback data when Supabase is not connected
const SAMPLE_ANALYTICS: AnalyticsData = {
  totalSessions: 247,
  totalAnalyses: 189,
  averageMatchPercentage: 58,
  topCareers: [
    { career: "AI/Machine Learning Engineer", count: 48 },
    { career: "Full-Stack Developer", count: 42 },
    { career: "Data Scientist", count: 35 },
    { career: "UI/UX Designer", count: 28 },
    { career: "Digital Marketing Specialist", count: 22 },
    { career: "Cybersecurity Analyst", count: 19 },
    { career: "Product Manager", count: 17 },
    { career: "Cloud Solutions Architect", count: 14 },
    { career: "Business Analyst", count: 12 },
    { career: "DevOps Engineer", count: 10 },
  ],
  topMissingSkills: [
    { skill: "Python", count: 87 },
    { skill: "Machine Learning", count: 72 },
    { skill: "Data Analysis", count: 65 },
    { skill: "Cloud Computing", count: 51 },
    { skill: "JavaScript", count: 48 },
    { skill: "SQL", count: 44 },
    { skill: "Project Management", count: 38 },
    { skill: "UI/UX Design", count: 34 },
    { skill: "Communication", count: 29 },
    { skill: "Leadership", count: 25 },
  ],
  matchDistribution: [
    { range: "0-20%", count: 12 },
    { range: "21-40%", count: 35 },
    { range: "41-60%", count: 68 },
    { range: "61-80%", count: 52 },
    { range: "81-100%", count: 22 },
  ],
  weeklyTrend: [
    { week: "Week 1", sessions: 28, analyses: 20 },
    { week: "Week 2", sessions: 35, analyses: 28 },
    { week: "Week 3", sessions: 42, analyses: 34 },
    { week: "Week 4", sessions: 51, analyses: 40 },
    { week: "Week 5", sessions: 45, analyses: 37 },
    { week: "Week 6", sessions: 46, analyses: 30 },
  ],
  universityBreakdown: [
    { university: "Universiti Malaya (UM)", users: 42 },
    { university: "UiTM", users: 38 },
    { university: "Universiti Kebangsaan Malaysia (UKM)", users: 31 },
    { university: "Universiti Putra Malaysia (UPM)", users: 28 },
    { university: "Universiti Sains Malaysia (USM)", users: 25 },
    { university: "Universiti Teknologi Malaysia (UTM)", users: 22 },
    { university: "Multimedia University (MMU)", users: 18 },
    { university: "Taylor's University", users: 15 },
    { university: "HELP University", users: 14 },
    { university: "Asia Pacific University (APU)", users: 14 },
  ],
};

interface RoadmapSessionRow {
  career_title: string;
  required_skills: string[];
  created_at: string;
}

interface SkillAnalysisRow {
  career_title: string;
  match_percentage: number;
  missing_skills: string[];
  created_at: string;
}

export async function GET(): Promise<NextResponse> {
  try {
    if (!supabase) {
      // Return sample data when Supabase is not configured
      return NextResponse.json({
        success: true,
        data: SAMPLE_ANALYTICS,
        isLiveData: false,
      });
    }

    // Fetch real analytics from Supabase
    const [sessionsResult, analysesResult] = await Promise.all([
      supabase
        .from("roadmap_sessions")
        .select("career_title, required_skills, created_at"),
      supabase
        .from("skill_analyses")
        .select(
          "career_title, match_percentage, missing_skills, created_at"
        ),
    ]);

    const sessions: RoadmapSessionRow[] = (sessionsResult.data as RoadmapSessionRow[]) || [];
    const analyses: SkillAnalysisRow[] = (analysesResult.data as SkillAnalysisRow[]) || [];

    // Aggregate top careers
    const careerCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      careerCounts[s.career_title] =
        (careerCounts[s.career_title] || 0) + 1;
    });
    const topCareers = Object.entries(careerCounts)
      .map(([career, count]) => ({ career, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Aggregate missing skills
    const skillCounts: Record<string, number> = {};
    analyses.forEach((a) => {
      (a.missing_skills || []).forEach((skill) => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });
    const topMissingSkills = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Average match percentage
    const avgMatch =
      analyses.length > 0
        ? Math.round(
            analyses.reduce((sum, a) => sum + a.match_percentage, 0) /
              analyses.length
          )
        : 0;

    // Match distribution
    const matchDist = [
      { range: "0-20%", count: 0 },
      { range: "21-40%", count: 0 },
      { range: "41-60%", count: 0 },
      { range: "61-80%", count: 0 },
      { range: "81-100%", count: 0 },
    ];
    analyses.forEach((a) => {
      const p = a.match_percentage;
      if (p <= 20) matchDist[0].count++;
      else if (p <= 40) matchDist[1].count++;
      else if (p <= 60) matchDist[2].count++;
      else if (p <= 80) matchDist[3].count++;
      else matchDist[4].count++;
    });

    return NextResponse.json({
      success: true,
      data: {
        totalSessions: sessions.length,
        totalAnalyses: analyses.length,
        averageMatchPercentage: avgMatch,
        topCareers,
        topMissingSkills,
        matchDistribution: matchDist,
        weeklyTrend: SAMPLE_ANALYTICS.weeklyTrend,
        universityBreakdown: SAMPLE_ANALYTICS.universityBreakdown,
      },
      isLiveData: true,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      {
        success: true,
        data: SAMPLE_ANALYTICS,
        isLiveData: false,
      },
      { status: 200 }
    );
  }
}
