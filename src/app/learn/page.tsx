"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MissingSkill, Course, CourseRecommendations } from "@/types";
import styles from "./page.module.css";

function LearnContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const [missingSkills, setMissingSkills] = useState<MissingSkill[]>([]);
  const [recommendations, setRecommendations] = useState<CourseRecommendations | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [manualSkills, setManualSkills] = useState<string>("");

  const fetchRecommendations = async (skills: MissingSkill[] | Array<{ skill: string }>): Promise<void> => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/recommend-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missingSkills: skills }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch recommendations");
      }

      setRecommendations(data.data as CourseRecommendations);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const skillsParam = searchParams.get("missingSkills");
    if (skillsParam) {
      try {
        const parsed = JSON.parse(skillsParam) as MissingSkill[];
        setMissingSkills(parsed);
        fetchRecommendations(parsed);
      } catch {
        console.warn("Invalid missing skills data in URL");
      }
    }
  }, [searchParams]);

  const handleManualSearch = (): void => {
    if (!manualSkills.trim()) return;
    const skills = manualSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setMissingSkills(skills.map((s) => ({ skill: s, importance: "important" as const, recommendation: "" })));
    fetchRecommendations(skills.map((s) => ({ skill: s })));
  };

  const getLevelColor = (level: Course["level"]): string => {
    if (level === "Beginner") return "badge-success";
    if (level === "Intermediate") return "badge-gold";
    return "badge-danger";
  };

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <span className="badge badge-gold">Module 3</span>
          <h1 className={styles.heroTitle}>
            Micro-Learning <span className="text-gradient">Recommender</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Close your skill gaps with curated, free online courses. Get
            personalized recommendations based on your skill analysis results.
          </p>
        </div>
      </section>

      {/* Manual Search */}
      <section className={styles.searchSection}>
        <div className="container">
          {missingSkills.length === 0 && (
            <div className={styles.searchCard}>
              <h3>🔍 Search for courses manually</h3>
              <p>
                Enter the skills you want to learn, separated by commas. Or go
                through{" "}
                <Link href="/voice-roadmap">Module 1</Link> →{" "}
                <Link href="/skill-analyzer">Module 2</Link> for AI-powered
                recommendations.
              </p>
              <div className={styles.searchInput}>
                <input
                  type="text"
                  className="input"
                  value={manualSkills}
                  onChange={(e) => setManualSkills(e.target.value)}
                  placeholder="e.g. Python, Machine Learning, Data Analysis, Leadership"
                  id="manual-skills-input"
                />
                <button
                  className="btn btn-primary"
                  onClick={handleManualSearch}
                  disabled={!manualSkills.trim()}
                  id="search-btn"
                >
                  Find Courses
                </button>
              </div>
            </div>
          )}

          {missingSkills.length > 0 && !recommendations && !isLoading && (
            <div className={styles.loadingCard}>
              <p>Loading recommendations for {missingSkills.length} skills...</p>
            </div>
          )}

          {isLoading && (
            <div className={styles.loadingCard}>
              <div className="spinner spinner-lg" />
              <p>Finding the best courses for you...</p>
            </div>
          )}

          {error && (
            <div className={styles.errorMsg}>
              <span>⚠️</span> {error}
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      {recommendations && (
        <section className={styles.results}>
          <div className="container">
            {/* Summary Stats */}
            <div className={styles.summaryBar}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>
                  {recommendations.totalCoursesFound}
                </span>
                <span className={styles.summaryLabel}>Courses Found</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>
                  {recommendations.skillsCovered}
                </span>
                <span className={styles.summaryLabel}>Skills Covered</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>Free</span>
                <span className={styles.summaryLabel}>100% Cost</span>
              </div>
            </div>

            {/* Skill Sections */}
            {Object.entries(recommendations.recommendations).map(
              ([skill, courses]: [string, Course[]]) => (
                <div key={skill} className={styles.skillSection}>
                  <div className={styles.skillHeader}>
                    <h3>{skill}</h3>
                    <span className="badge badge-accent">
                      {courses.length} course{courses.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {courses.length === 0 ? (
                    <p className={styles.noCourses}>
                      No matching courses found. Try exploring MOOC platforms
                      like Coursera, edX, or Udemy for this skill.
                    </p>
                  ) : (
                    <div className={styles.courseGrid}>
                      {courses.map((course: Course) => (
                        <a
                          key={course.id}
                          href={course.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.courseCard}
                        >
                          <div className={styles.courseProvider}>
                            {course.provider}
                          </div>
                          <h4 className={styles.courseTitle}>{course.title}</h4>
                          <div className={styles.courseMeta}>
                            <span className={`badge ${getLevelColor(course.level)}`}>
                              {course.level}
                            </span>
                            <span className={styles.courseDuration}>
                              ⏱ {course.duration}
                            </span>
                          </div>
                          <div className={styles.courseKeywords}>
                            {course.keywords.slice(0, 4).map((kw: string) => (
                              <span key={kw} className={styles.keyword}>
                                {kw}
                              </span>
                            ))}
                          </div>
                          <div className={styles.courseArrow}>
                            Open Course →
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}

            {/* Back to Start */}
            <div className={styles.backCta}>
              <div className={styles.backCtaCard}>
                <h3>🔄 Want to explore another career?</h3>
                <p>
                  Go back to Module 1 and speak a new dream career to generate a
                  fresh roadmap.
                </p>
                <div className={styles.backCtaActions}>
                  <Link href="/voice-roadmap" className="btn btn-primary">
                    🎤 New Voice Roadmap
                  </Link>
                  <Link href="/dashboard" className="btn btn-secondary">
                    📈 View Analytics
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </>
  );
}

export default function LearnPage(): React.JSX.Element {
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
      <LearnContent />
    </Suspense>
  );
}
