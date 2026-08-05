"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RoadmapData, SkillAnalysis, MatchedSkill, MissingSkill } from "@/types";
import styles from "./page.module.css";

function SkillAnalyzerContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<SkillAnalysis | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const roadmapParam = searchParams.get("roadmap");
    if (roadmapParam) {
      try {
        setRoadmap(JSON.parse(roadmapParam) as RoadmapData);
      } catch {
        console.warn("Invalid roadmap data in URL");
      }
    }
  }, [searchParams]);

  const analyzeSkills = async (): Promise<void> => {
    if (!resumeText.trim()) {
      setError("Please paste your resume or bio text.");
      return;
    }

    if (!roadmap) {
      setError(
        "No roadmap data found. Please generate a roadmap first in Module 1."
      );
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setAnalysis(null);

    try {
      const response = await fetch("/api/analyze-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: resumeText.trim(), roadmapData: roadmap }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysis(data.data as SkillAnalysis);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getMatchColor = (percentage: number): string => {
    if (percentage >= 75) return "var(--success)";
    if (percentage >= 50) return "var(--warning)";
    return "var(--danger)";
  };

  const getProficiencyColor = (level: MatchedSkill["proficiencyLevel"]): string => {
    if (level === "strong") return "badge-success";
    if (level === "moderate") return "badge-gold";
    return "badge-primary";
  };

  const getImportanceColor = (importance: MissingSkill["importance"]): string => {
    if (importance === "critical") return "badge-danger";
    if (importance === "important") return "badge-gold";
    return "badge-primary";
  };

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <span className="badge badge-primary">Module 2</span>
          <h1 className={styles.heroTitle}>
            Automated <span className="text-gradient">Skill-Gap</span> Analyzer
          </h1>
          <p className={styles.heroSubtitle}>
            Paste your resume or a short bio. The AI compares your current
            skills against your career roadmap and highlights exactly what you
            need.
          </p>
        </div>
      </section>

      {/* Analyzer Section */}
      <section className={styles.analyzerSection}>
        <div className="container">
          {/* Roadmap Context */}
          {roadmap ? (
            <div className={styles.contextCard}>
              <div className={styles.contextIcon}>🎯</div>
              <div>
                <h3 className={styles.contextTitle}>
                  Target Career: {roadmap.careerTitle}
                </h3>
                <p className={styles.contextDesc}>{roadmap.summary}</p>
              </div>
            </div>
          ) : (
            <div className={styles.noRoadmap}>
              <p>
                ⚠️ No roadmap loaded. Please{" "}
                <Link href="/voice-roadmap">generate a roadmap first</Link>, or
                paste one below manually.
              </p>
              <textarea
                className="textarea"
                placeholder='Paste your roadmap JSON data here, or go to Module 1 to generate one. Example: {"careerTitle": "Data Scientist", "requiredSkills": ["Python", "Machine Learning", "SQL"], "roadmapSteps": [{"title": "Learn Python", "step": 1}]}'
                rows={4}
                onChange={(e) => {
                  try {
                    setRoadmap(JSON.parse(e.target.value) as RoadmapData);
                    setError("");
                  } catch {
                    // Keep typing
                  }
                }}
                id="roadmap-json-input"
              />
            </div>
          )}

          {/* Resume Input */}
          <div className={styles.resumeCard}>
            <label className={styles.fieldLabel}>
              📄 Paste your resume or short bio:
            </label>
            <textarea
              className="textarea"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder={`Example: I am a third-year Computer Science student at Universiti Malaya. I have experience in HTML, CSS, and basic JavaScript. I completed an internship at a local startup where I helped build a simple website. I know a little bit about Python and have completed an online course on data visualization. I am familiar with Git and basic project management tools. I also participated in a university hackathon.`}
              rows={8}
              id="resume-input"
            />
            <div className={styles.resumeMeta}>
              <span>{resumeText.split(/\s+/).filter(Boolean).length} words</span>
            </div>
          </div>

          {/* Analyze Button */}
          <div className={styles.analyzeActions}>
            <button
              className="btn btn-primary btn-lg"
              onClick={analyzeSkills}
              disabled={isAnalyzing || !resumeText.trim() || !roadmap}
              id="analyze-btn"
            >
              {isAnalyzing ? (
                <>
                  <span className="spinner" /> Analyzing Skills...
                </>
              ) : (
                "🔍 Analyze My Skill Gap"
              )}
            </button>
          </div>

          {error && (
            <div className={styles.errorMsg}>
              <span>⚠️</span> {error}
            </div>
          )}
        </div>
      </section>

      {/* Analysis Results */}
      {analysis && (
        <section className={styles.results}>
          <div className="container">
            {/* Overall Match */}
            <div className={styles.matchCard}>
              <div className={styles.matchHeader}>
                <h2>Overall Skill Match</h2>
                <div
                  className={styles.matchPercentage}
                  style={{ color: getMatchColor(analysis.overallMatchPercentage) }}
                >
                  {analysis.overallMatchPercentage}%
                </div>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${analysis.overallMatchPercentage}%`,
                    background: `linear-gradient(90deg, ${getMatchColor(
                      analysis.overallMatchPercentage
                    )}, var(--accent-400))`,
                  }}
                />
              </div>
              <div className={styles.matchSummaries}>
                <div className={styles.summaryBox}>
                  <h4>💪 Your Strengths</h4>
                  <p>{analysis.strengthsSummary}</p>
                </div>
                <div className={styles.summaryBox}>
                  <h4>🎯 Key Gaps</h4>
                  <p>{analysis.gapsSummary}</p>
                </div>
              </div>
            </div>

            {/* Two Columns: Matched vs Missing */}
            <div className={styles.skillsGrid}>
              {/* Matched Skills */}
              <div className={styles.skillsColumn}>
                <h3 className={styles.columnTitle}>
                  ✅ Matched Skills ({analysis.matchedSkills.length})
                </h3>
                <div className={styles.skillsList}>
                  {analysis.matchedSkills.map((s, i) => (
                    <div key={i} className={styles.skillItem}>
                      <div className={styles.skillItemHeader}>
                        <span className={styles.skillName}>{s.skill}</span>
                        <span className={`badge ${getProficiencyColor(s.proficiencyLevel)}`}>
                          {s.proficiencyLevel}
                        </span>
                      </div>
                      <p className={styles.skillEvidence}>{s.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing Skills */}
              <div className={styles.skillsColumn}>
                <h3 className={styles.columnTitle}>
                  ❌ Missing Skills ({analysis.missingSkills.length})
                </h3>
                <div className={styles.skillsList}>
                  {analysis.missingSkills.map((s, i) => (
                    <div key={i} className={styles.skillItem}>
                      <div className={styles.skillItemHeader}>
                        <span className={styles.skillName}>{s.skill}</span>
                        <span className={`badge ${getImportanceColor(s.importance)}`}>
                          {s.importance}
                        </span>
                      </div>
                      <p className={styles.skillEvidence}>{s.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Priority Actions */}
            {analysis.priorityActions && analysis.priorityActions.length > 0 && (
              <div className={styles.priorityCard}>
                <h3>🚀 Priority Actions</h3>
                <ol className={styles.priorityList}>
                  {analysis.priorityActions.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Next Step */}
            <div className={styles.nextStep}>
              <div className={styles.nextStepCard}>
                <h3>📚 Ready for Step 3?</h3>
                <p>
                  Get curated course recommendations to close every skill gap
                  identified above.
                </p>
                <Link
                  href={{
                    pathname: "/learn",
                    query: {
                      missingSkills: JSON.stringify(analysis.missingSkills),
                    },
                  }}
                  className="btn btn-primary"
                  id="next-step-learn-btn"
                >
                  Get Course Recommendations →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </>
  );
}

export default function SkillAnalyzerPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            background: "var(--surface-0)",
          }}
        >
          <div className="spinner spinner-lg" />
        </div>
      }
    >
      <SkillAnalyzerContent />
    </Suspense>
  );
}
