// ===== Module 1: Voice-to-Roadmap =====

export interface RoadmapStep {
  step: number;
  title: string;
  description: string;
  duration: string;
  skills: string[];
}

export interface RoadmapData {
  careerTitle: string;
  summary: string;
  roadmapSteps: RoadmapStep[];
  requiredSkills: string[];
  industryOutlook: string;
}

// ===== Module 2: Skill-Gap Analyzer =====

export interface MatchedSkill {
  skill: string;
  proficiencyLevel: "strong" | "moderate" | "basic";
  evidence: string;
}

export interface MissingSkill {
  skill: string;
  importance: "critical" | "important" | "nice-to-have";
  recommendation: string;
}

export interface SkillAnalysis {
  overallMatchPercentage: number;
  matchedSkills: MatchedSkill[];
  missingSkills: MissingSkill[];
  strengthsSummary: string;
  gapsSummary: string;
  priorityActions: string[];
}

// ===== Module 3: Course Recommendations =====

export interface Course {
  id: number;
  title: string;
  provider: string;
  url: string;
  keywords: string[];
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
}

export interface CourseRecommendations {
  recommendations: Record<string, Course[]>;
  totalCoursesFound: number;
  skillsCovered: number;
  skillsWithoutCourses: string[];
}

// ===== Module 4: Analytics Dashboard =====

export interface CareerCount {
  career: string;
  count: number;
}

export interface SkillCount {
  skill: string;
  count: number;
}

export interface MatchDistribution {
  range: string;
  count: number;
}

export interface WeeklyTrend {
  week: string;
  sessions: number;
  analyses: number;
}

export interface UniversityBreakdown {
  university: string;
  users: number;
}

export interface AnalyticsData {
  totalSessions: number;
  totalAnalyses: number;
  averageMatchPercentage: number;
  topCareers: CareerCount[];
  topMissingSkills: SkillCount[];
  matchDistribution: MatchDistribution[];
  weeklyTrend: WeeklyTrend[];
  universityBreakdown: UniversityBreakdown[];
}

// ===== API Response Types =====

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  isLiveData?: boolean;
}
