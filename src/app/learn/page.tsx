"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConfirmModal from "@/components/ConfirmModal";
import {
  MissingSkill,
  Course,
  CourseRecommendations,
  SeenCourseRecord,
  HistoryTimeframe,
} from "@/types";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "./page.module.css";

function formatRelativeTime(dateStr: string): string {
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "Just now";

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return "1 month ago";
    return `${diffMonths} months ago`;
  } catch {
    return dateStr;
  }
}

function LearnContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const [missingSkills, setMissingSkills] = useState<MissingSkill[]>([]);
  const [recommendations, setRecommendations] = useState<CourseRecommendations | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [manualSkills, setManualSkills] = useState<string>("");

  // History & Tracking states
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [allSeenCourses, setAllSeenCourses] = useState<SeenCourseRecord[]>([]);
  const [displayedSeenCourses, setDisplayedSeenCourses] = useState<SeenCourseRecord[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<HistoryTimeframe>(7); // Default: 7 days ago
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false); // Collapsed by default

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: "danger" | "warning" | "info" | "save";
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    variant: "danger",
    onConfirm: () => {},
  });

  const getSeenCoursesCacheKey = (uid: string | null): string => {
    return uid ? `nexttalent_seen_courses_${uid}` : "nexttalent_seen_courses_guest";
  };

  const filterCoursesByTimeframe = useCallback(
    (courses: SeenCourseRecord[], timeframe: HistoryTimeframe): SeenCourseRecord[] => {
      if (timeframe === "all") return courses;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - timeframe);
      return courses.filter((c) => new Date(c.viewed_at).getTime() >= cutoff.getTime());
    },
    []
  );

  const loadLocalSeenCourses = useCallback(
    (uid: string | null, timeframe: HistoryTimeframe): SeenCourseRecord[] => {
      try {
        const key = getSeenCoursesCacheKey(uid);
        const cachedStr = localStorage.getItem(key);
        if (cachedStr) {
          const parsed = JSON.parse(cachedStr) as SeenCourseRecord[];
          setAllSeenCourses(parsed);
          const filtered = filterCoursesByTimeframe(parsed, timeframe);
          setDisplayedSeenCourses(filtered);
          return parsed;
        }
      } catch {
        // ignore
      }
      return [];
    },
    [filterCoursesByTimeframe]
  );

  const fetchSeenCourses = useCallback(
    async (userId: string | null, timeframe: HistoryTimeframe): Promise<void> => {
      loadLocalSeenCourses(userId, timeframe);
      if (!userId) {
        setIsLoadingHistory(false);
        return;
      }

      setIsLoadingHistory(true);
      try {
        const url = `/api/user-courses?userId=${userId}&days=${timeframe}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            const dbRecords = json.data as SeenCourseRecord[];
            setDisplayedSeenCourses(dbRecords);

            // Also fetch all records for comprehensive local sync
            const allRes = await fetch(`/api/user-courses?userId=${userId}&days=all`);
            if (allRes.ok) {
              const allJson = await allRes.json();
              if (allJson.data && Array.isArray(allJson.data)) {
                setAllSeenCourses(allJson.data);
                try {
                  localStorage.setItem(
                    getSeenCoursesCacheKey(userId),
                    JSON.stringify(allJson.data)
                  );
                } catch {
                  // ignore
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch remote seen courses:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [loadLocalSeenCourses]
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const uid = session?.user?.id || null;
        setActiveUserId(uid);
        fetchSeenCourses(uid, selectedTimeframe);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        const uid = session?.user?.id || null;
        setActiveUserId(uid);
        fetchSeenCourses(uid, selectedTimeframe);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      loadLocalSeenCourses(null, selectedTimeframe);
      setIsLoadingHistory(false);
    }
  }, [fetchSeenCourses, loadLocalSeenCourses, selectedTimeframe]);

  const handleTimeframeChange = (timeframe: HistoryTimeframe): void => {
    setSelectedTimeframe(timeframe);
    const filtered = filterCoursesByTimeframe(allSeenCourses, timeframe);
    setDisplayedSeenCourses(filtered);
    if (activeUserId) {
      fetchSeenCourses(activeUserId, timeframe);
    }
  };

  const handleCourseClick = (course: Course, skillCategory?: string): void => {
    const now = new Date().toISOString();
    try {
      const key = getSeenCoursesCacheKey(activeUserId);
      const cachedStr = localStorage.getItem(key);
      let cachedList: SeenCourseRecord[] = cachedStr ? JSON.parse(cachedStr) : [];

      const existingIndex = cachedList.findIndex(
        (c) => c.course_title.toLowerCase() === course.title.toLowerCase()
      );

      let updatedRecord: SeenCourseRecord;
      if (existingIndex >= 0) {
        const existing = cachedList[existingIndex];
        updatedRecord = {
          ...existing,
          viewed_at: now,
          click_count: (existing.click_count || 1) + 1,
          skill_category: skillCategory || existing.skill_category,
        };
        cachedList.splice(existingIndex, 1);
        cachedList.unshift(updatedRecord);
      } else {
        updatedRecord = {
          id: `local_${Date.now()}`,
          user_id: activeUserId,
          course_id: course.id,
          course_title: course.title,
          provider: course.provider,
          url: course.url,
          level: course.level,
          duration: course.duration,
          keywords: course.keywords || [],
          skill_category: skillCategory,
          viewed_at: now,
          click_count: 1,
        };
        cachedList.unshift(updatedRecord);
      }

      localStorage.setItem(key, JSON.stringify(cachedList));
      setAllSeenCourses(cachedList);
      setDisplayedSeenCourses(filterCoursesByTimeframe(cachedList, selectedTimeframe));
    } catch (err) {
      console.warn("Failed to store seen course locally:", err);
    }

    // Fire API request in background
    try {
      fetch("/api/user-courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeUserId,
          course,
          skillCategory,
        }),
      }).catch((e) => console.warn("API record course failed:", e));
    } catch {
      // ignore
    }
  };

  const handleClearHistory = (): void => {
    setConfirmModal({
      isOpen: true,
      title: "Clear Course History",
      message: "Are you sure you want to clear your entire course viewing history? This cannot be undone.",
      confirmLabel: "Clear All History",
      variant: "danger",
      onConfirm: async () => {
        try {
          const key = getSeenCoursesCacheKey(activeUserId);
          localStorage.removeItem(key);
          setAllSeenCourses([]);
          setDisplayedSeenCourses([]);

          if (activeUserId) {
            await fetch(`/api/user-courses?userId=${activeUserId}&clearAll=true`, {
              method: "DELETE",
            });
          }
        } catch (err) {
          console.warn("Failed to clear history:", err);
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDeleteHistoryItem = (e: React.MouseEvent, record: SeenCourseRecord): void => {
    e.preventDefault();
    e.stopPropagation();

    const updated = allSeenCourses.filter(
      (c) =>
        c.id !== record.id &&
        c.course_title.toLowerCase() !== record.course_title.toLowerCase()
    );
    setAllSeenCourses(updated);
    setDisplayedSeenCourses(filterCoursesByTimeframe(updated, selectedTimeframe));

    try {
      const key = getSeenCoursesCacheKey(activeUserId);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (activeUserId && record.id && !record.id.startsWith("local_")) {
      fetch(`/api/user-courses?userId=${activeUserId}&id=${record.id}`, {
        method: "DELETE",
      }).catch((err) => console.warn("Failed to delete record:", err));
    }
  };

  const fetchRecommendations = async (
    skills: MissingSkill[] | Array<{ skill: string }>
  ): Promise<void> => {
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
    setMissingSkills(
      skills.map((s) => ({
        skill: s,
        importance: "important" as const,
        recommendation: "",
      }))
    );
    fetchRecommendations(skills.map((s) => ({ skill: s })));
  };

  const getLevelColor = (level: Course["level"] | string): string => {
    if (level === "Beginner") return "badge-success";
    if (level === "Intermediate") return "badge-gold";
    return "badge-danger";
  };

  // Filter seen courses by search query if user types in search box
  const filteredHistory = displayedSeenCourses.filter((course) => {
    if (!historySearchQuery.trim()) return true;
    const q = historySearchQuery.toLowerCase();
    return (
      course.course_title.toLowerCase().includes(q) ||
      course.provider.toLowerCase().includes(q) ||
      (course.skill_category && course.skill_category.toLowerCase().includes(q)) ||
      course.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  const getTimeframeLabel = (tf: HistoryTimeframe): string => {
    if (tf === 7) return "7 Days Ago";
    if (tf === 15) return "15 Days Ago";
    if (tf === 30) return "1 Month Ago";
    return "All Time";
  };

  return (
    <>
      <Navbar />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Micro-Learning <span className="text-gradient">Recommender</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Close your skill gaps with curated, free online courses. Track your
            learning journey and review previously visited courses anytime.
          </p>
        </div>
      </section>

      {/* ===== SECTION: Previously Seen Courses History (Collapsible, collapsed by default) ===== */}
      <section className={styles.historySection}>
        <div className="container">
          <div className={`${styles.historyCard} ${!isHistoryExpanded ? styles.historyCardCollapsed : ""}`}>
            {/* Header / Accordion Trigger */}
            <div
              className={styles.historyHeaderToggle}
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsHistoryExpanded(!isHistoryExpanded);
                }
              }}
              id="history-toggle-header"
            >
              <div className={styles.historyTitleGroup}>
                <div className={styles.historyIcon}>🕒</div>
                <div>
                  <div className={styles.historyTitleRow}>
                    <h2 className={styles.historyTitle}>Recently Viewed Courses</h2>
                    <span className={styles.historyCountBadge}>
                      {displayedSeenCourses.length} {displayedSeenCourses.length === 1 ? "course" : "courses"} (
                      {getTimeframeLabel(selectedTimeframe)})
                    </span>
                  </div>
                  <p className={styles.historySubtitle}>
                    {isHistoryExpanded
                      ? "Review courses you have previously clicked and explored"
                      : "Click to expand your course viewing history across 7, 15, or 30 days"}
                  </p>
                </div>
              </div>

              <div className={styles.historyToggleAction}>
                <button
                  type="button"
                  className={`btn ${isHistoryExpanded ? "btn-secondary" : "btn-primary"} btn-sm ${styles.toggleExpandBtn}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsHistoryExpanded(!isHistoryExpanded);
                  }}
                  id="history-toggle-btn"
                >
                  {isHistoryExpanded ? "▲ Hide History" : "▼ Show History"}
                </button>
              </div>
            </div>

            {/* Collapsible Content Body */}
            {isHistoryExpanded && (
              <div className={styles.historyBody}>
                {/* Timeframe Filter Selector */}
                <div className={styles.timeframeFilterRow}>
                  <div className={styles.timeframeFilterGroup}>
                    <span className={styles.filterLabel}>Timeframe:</span>
                    <div className={styles.timeframePills}>
                      <button
                        type="button"
                        className={`${styles.timeframePill} ${
                          selectedTimeframe === 7 ? styles.activeTimeframePill : ""
                        }`}
                        onClick={() => handleTimeframeChange(7)}
                        id="filter-7-days"
                      >
                        📅 7 Days Ago
                        <span className={styles.defaultBadge}>Default</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.timeframePill} ${
                          selectedTimeframe === 15 ? styles.activeTimeframePill : ""
                        }`}
                        onClick={() => handleTimeframeChange(15)}
                        id="filter-15-days"
                      >
                        📅 15 Days Ago
                      </button>
                      <button
                        type="button"
                        className={`${styles.timeframePill} ${
                          selectedTimeframe === 30 ? styles.activeTimeframePill : ""
                        }`}
                        onClick={() => handleTimeframeChange(30)}
                        id="filter-30-days"
                      >
                        📅 1 Month Ago
                      </button>
                      <button
                        type="button"
                        className={`${styles.timeframePill} ${
                          selectedTimeframe === "all" ? styles.activeTimeframePill : ""
                        }`}
                        onClick={() => handleTimeframeChange("all")}
                        id="filter-all-time"
                      >
                        🌐 All Time
                      </button>
                    </div>
                  </div>
                </div>

                {/* History Action & Search Bar */}
                {allSeenCourses.length > 0 && (
                  <div className={styles.historyToolbar}>
                    <div className={styles.historyStats}>
                      <span className={styles.statPill}>
                        Showing <strong>{filteredHistory.length}</strong> of{" "}
                        <strong>{displayedSeenCourses.length}</strong> seen courses (
                        {getTimeframeLabel(selectedTimeframe)})
                      </span>
                    </div>

                    <div className={styles.historyControls}>
                      <div className={styles.historySearchWrapper}>
                        <input
                          type="text"
                          className={`input ${styles.historySearchInput}`}
                          placeholder="Filter viewed courses..."
                          value={historySearchQuery}
                          onChange={(e) => setHistorySearchQuery(e.target.value)}
                        />
                      </div>

                      <button
                        type="button"
                        className={styles.clearHistoryBtn}
                        onClick={handleClearHistory}
                        title="Clear history"
                      >
                        🗑️ Clear History
                      </button>
                    </div>
                  </div>
                )}

                {/* History Content Grid or Empty States */}
                {isLoadingHistory ? (
                  <div className={styles.historyLoading}>
                    <div className="spinner spinner-md" />
                    <p>Loading your course history...</p>
                  </div>
                ) : filteredHistory.length > 0 ? (
                  <div className={styles.historyGrid}>
                    {filteredHistory.map((record) => (
                      <a
                        key={`${record.id}-${record.viewed_at}`}
                        href={record.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.historyCourseCard}
                        onClick={() =>
                          handleCourseClick(
                            {
                              id: record.course_id,
                              title: record.course_title,
                              provider: record.provider,
                              url: record.url,
                              duration: record.duration,
                              level: record.level as Course["level"],
                              keywords: record.keywords,
                            },
                            record.skill_category
                          )
                        }
                      >
                        <div className={styles.historyCardTop}>
                          <div className={styles.historyTimestamp}>
                            <span className={styles.clockIcon}>🕒</span>
                            <span>{formatRelativeTime(record.viewed_at)}</span>
                          </div>
                          <div className={styles.historyCardActions}>
                            {record.click_count && record.click_count > 1 && (
                              <span className={styles.visitedBadge}>
                                Visited {record.click_count}x
                              </span>
                            )}
                            <button
                              type="button"
                              className={styles.removeHistoryItemBtn}
                              onClick={(e) => handleDeleteHistoryItem(e, record)}
                              title="Remove from history"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        <div className={styles.courseProvider}>{record.provider}</div>
                        <h4 className={styles.courseTitle}>{record.course_title}</h4>

                        {record.skill_category && (
                          <div className={styles.categoryBadgeWrapper}>
                            <span className="badge badge-accent">
                              Skill: {record.skill_category}
                            </span>
                          </div>
                        )}

                        <div className={styles.courseMeta}>
                          <span className={`badge ${getLevelColor(record.level)}`}>
                            {record.level}
                          </span>
                          <span className={styles.courseDuration}>
                            ⏱ {record.duration}
                          </span>
                        </div>

                        <div className={styles.courseKeywords}>
                          {record.keywords.slice(0, 3).map((kw) => (
                            <span key={kw} className={styles.keyword}>
                              {kw}
                            </span>
                          ))}
                        </div>

                        <div className={styles.historyCardFooter}>
                          <span className={styles.revisitLink}>
                            Revisit Course ↗
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : allSeenCourses.length > 0 ? (
                  <div className={styles.historyEmpty}>
                    <div className={styles.emptyIcon}>🔍</div>
                    <p>
                      No courses viewed within <strong>{getTimeframeLabel(selectedTimeframe)}</strong>.
                    </p>
                    <div className={styles.emptyActions}>
                      {selectedTimeframe !== 30 && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleTimeframeChange(30)}
                        >
                          View Last 1 Month
                        </button>
                      )}
                      {selectedTimeframe !== "all" && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleTimeframeChange("all")}
                        >
                          View All-Time History ({allSeenCourses.length} courses)
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={styles.historyEmpty}>
                    <div className={styles.emptyIcon}>📖</div>
                    <p>
                      You haven't viewed any courses yet.
                    </p>
                    <span className={styles.emptyHint}>
                      Click on any recommended course below to open the lesson and automatically track it here!
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Manual Search & Recommended Section */}
      <section className={styles.searchSection}>
        <div className="container">
          {missingSkills.length === 0 && (
            <div className={styles.searchCard}>
              <h3>🔍 Search for courses manually</h3>
              <p>
                Enter the skills you want to learn, separated by commas. Or go
                through{" "}
                <Link href="/voice-roadmap">Voice-to-Roadmap</Link> →{" "}
                <Link href="/skill-analyzer">Skill-Gap Analyzer</Link> for AI-powered
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

      {/* Recommendations Results */}
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
                          onClick={() => handleCourseClick(course, skill)}
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
                  Go back to Voice-to-Roadmap and speak a new dream career to generate a
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
