"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AnalyticsData } from "@/types";
import ConfirmModal from "@/components/ConfirmModal";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "./page.module.css";

// We use Chart.js via dynamic import to avoid SSR issues
type ChartType = import("chart.js").Chart;

export default function DashboardPage(): React.JSX.Element {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLiveData, setIsLiveData] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(true);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Admin access management states
  const [activeTab, setActiveTab] = useState<"analytics" | "admins">("analytics");
  const [adminsList, setAdminsList] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState<string>("");
  const [adminActionLoading, setAdminActionLoading] = useState<boolean>(false);
  const [adminError, setAdminError] = useState<string>("");
  const [adminSuccess, setAdminSuccess] = useState<string>("");

  // ConfirmModal states
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [adminToRevoke, setAdminToRevoke] = useState<string>("");

  const barChartRef = useRef<HTMLCanvasElement | null>(null);
  const doughnutChartRef = useRef<HTMLCanvasElement | null>(null);
  const skillBarChartRef = useRef<HTMLCanvasElement | null>(null);
  const uniBarChartRef = useRef<HTMLCanvasElement | null>(null);

  const barChartInstance = useRef<ChartType | null>(null);
  const doughnutChartInstance = useRef<ChartType | null>(null);
  const skillBarChartInstance = useRef<ChartType | null>(null);
  const uniBarChartInstance = useRef<ChartType | null>(null);

  const destroyCharts = (): void => {
    [barChartInstance, doughnutChartInstance, skillBarChartInstance, uniBarChartInstance].forEach(
      (ref) => {
        if (ref.current) {
          ref.current.destroy();
          ref.current = null;
        }
      }
    );
  };

  const loadCharts = async (): Promise<void> => {
    if (!analytics) return;

    // Dynamically import chart.js
    const {
      Chart,
      BarElement,
      CategoryScale,
      LinearScale,
      ArcElement,
      Tooltip,
      Legend,
      BarController,
      DoughnutController,
    } = await import("chart.js");

    Chart.register(
      BarElement,
      CategoryScale,
      LinearScale,
      ArcElement,
      Tooltip,
      Legend,
      BarController,
      DoughnutController
    );

    destroyCharts();

    const chartDefaults = {
      color: "#94a3b8",
      borderColor: "rgba(255,255,255,0.08)",
    };

    // 1. Top Careers Bar Chart
    if (barChartRef.current) {
      const ctx = barChartRef.current.getContext("2d");
      if (ctx) {
        barChartInstance.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: analytics.topCareers.map((c) => c.career),
            datasets: [
              {
                label: "Searches",
                data: analytics.topCareers.map((c) => c.count),
                backgroundColor: [
                  "rgba(0, 212, 160, 0.7)",
                  "rgba(13, 139, 217, 0.7)",
                  "rgba(240, 180, 41, 0.7)",
                  "rgba(139, 92, 246, 0.7)",
                  "rgba(239, 68, 68, 0.7)",
                  "rgba(59, 130, 246, 0.7)",
                  "rgba(16, 185, 129, 0.7)",
                  "rgba(245, 158, 11, 0.7)",
                  "rgba(168, 85, 247, 0.7)",
                  "rgba(236, 72, 153, 0.7)",
                ],
                borderRadius: 6,
                borderSkipped: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "rgba(17, 24, 39, 0.95)",
                titleColor: "#fff",
                bodyColor: "#94a3b8",
                borderColor: "rgba(255,255,255,0.1)",
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
              },
            },
            scales: {
              x: {
                grid: { color: chartDefaults.borderColor },
                ticks: { color: chartDefaults.color },
              },
              y: {
                grid: { display: false },
                ticks: { color: chartDefaults.color, font: { size: 11 } },
              },
            },
          },
        });
      }
    }

    // 2. Match Distribution Doughnut
    if (doughnutChartRef.current) {
      const ctx = doughnutChartRef.current.getContext("2d");
      if (ctx) {
        doughnutChartInstance.current = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: analytics.matchDistribution.map((d) => d.range),
            datasets: [
              {
                data: analytics.matchDistribution.map((d) => d.count),
                backgroundColor: [
                  "rgba(239, 68, 68, 0.8)",
                  "rgba(245, 158, 11, 0.8)",
                  "rgba(240, 180, 41, 0.8)",
                  "rgba(13, 139, 217, 0.8)",
                  "rgba(0, 212, 160, 0.8)",
                ],
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "65%",
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  color: chartDefaults.color,
                  padding: 16,
                  usePointStyle: true,
                  pointStyleWidth: 10,
                },
              },
              tooltip: {
                backgroundColor: "rgba(17, 24, 39, 0.95)",
                titleColor: "#fff",
                bodyColor: "#94a3b8",
                cornerRadius: 8,
                padding: 12,
              },
            },
          },
        });
      }
    }

    // 3. Top Missing Skills Bar Chart
    if (skillBarChartRef.current) {
      const ctx = skillBarChartRef.current.getContext("2d");
      if (ctx) {
        skillBarChartInstance.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: analytics.topMissingSkills.map((s) => s.skill),
            datasets: [
              {
                label: "Gap Count",
                data: analytics.topMissingSkills.map((s) => s.count),
                backgroundColor: "rgba(239, 68, 68, 0.6)",
                borderRadius: 6,
                borderSkipped: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "rgba(17, 24, 39, 0.95)",
                cornerRadius: 8,
                padding: 12,
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: {
                  color: chartDefaults.color,
                  font: { size: 10 },
                  maxRotation: 45,
                },
              },
              y: {
                grid: { color: chartDefaults.borderColor },
                ticks: { color: chartDefaults.color },
              },
            },
          },
        });
      }
    }

    // 4. University Breakdown
    if (uniBarChartRef.current) {
      const ctx = uniBarChartRef.current.getContext("2d");
      if (ctx) {
        uniBarChartInstance.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: analytics.universityBreakdown.map((u) => u.university),
            datasets: [
              {
                label: "Users",
                data: analytics.universityBreakdown.map((u) => u.users),
                backgroundColor: "rgba(13, 139, 217, 0.6)",
                borderRadius: 6,
                borderSkipped: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "rgba(17, 24, 39, 0.95)",
                cornerRadius: 8,
                padding: 12,
              },
            },
            scales: {
              x: {
                grid: { color: chartDefaults.borderColor },
                ticks: { color: chartDefaults.color },
              },
              y: {
                grid: { display: false },
                ticks: { color: chartDefaults.color, font: { size: 10 } },
              },
            },
          },
        });
      }
    }
  };

  const fetchAnalytics = async (): Promise<void> => {
    try {
      const response = await fetch("/api/analytics");
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data as AnalyticsData);
        setIsLiveData(!!data.isLiveData);
      }
    } catch {
      setError("Failed to load analytics data.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdminsList = async (): Promise<void> => {
    try {
      const response = await fetch("/api/admins");
      const resData = await response.json();
      if (resData.success) {
        setAdminsList(resData.data);
      }
    } catch {
      setAdminError("Failed to fetch admin list.");
    }
  };

  const handleAddAdmin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;

    setAdminActionLoading(true);
    setAdminError("");
    setAdminSuccess("");

    try {
      const response = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newAdminEmail.trim() }),
      });
      const resData = await response.json();
      if (resData.success) {
        setAdminSuccess(`Successfully added ${newAdminEmail.trim()} as administrator.`);
        setNewAdminEmail("");
        fetchAdminsList();
      } else {
        setAdminError(resData.error || "Failed to add administrator.");
      }
    } catch {
      setAdminError("Network error. Failed to add administrator.");
    } finally {
      setAdminActionLoading(false);
    }
  };

  const triggerRevokeConfirmation = (email: string) => {
    setAdminToRevoke(email);
    setIsConfirmModalOpen(true);
  };

  const handleRemoveAdmin = async (emailToRemove: string): Promise<void> => {
    if (emailToRemove === "onlytheone1092@gmail.com") return;

    setAdminActionLoading(true);
    setAdminError("");
    setAdminSuccess("");

    try {
      const response = await fetch(`/api/admins?email=${encodeURIComponent(emailToRemove)}`, {
        method: "DELETE",
      });
      const resData = await response.json();
      if (resData.success) {
        setAdminSuccess(`Successfully revoked administrator access for ${emailToRemove}.`);
        fetchAdminsList();
      } else {
        setAdminError(resData.error || "Failed to revoke permissions.");
      }
    } catch {
      setAdminError("Network error. Failed to revoke permissions.");
    } finally {
      setAdminActionLoading(false);
      setIsConfirmModalOpen(false);
    }
  };

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (!supabase) {
      setIsAdmin(true);
      setCheckingAuth(false);
      fetchAnalytics();
      fetchAdminsList();
      return;
    }

    const checkSession = async (session: any) => {
      const email = session?.user?.email?.toLowerCase();
      if (!email) {
        setIsAdmin(false);
        setIsLoading(false);
        setCheckingAuth(false);
        return;
      }

      // Super admin bypass
      if (email === "onlytheone1092@gmail.com") {
        setIsAdmin(true);
        fetchAnalytics();
        fetchAdminsList();
        setCheckingAuth(false);
        return;
      }

      // Check remote API list
      try {
        const response = await fetch("/api/admins");
        const resData = await response.json();
        if (resData.success && Array.isArray(resData.data)) {
          const list = resData.data.map((e: string) => e.toLowerCase());
          if (list.includes(email)) {
            setIsAdmin(true);
            fetchAnalytics();
            fetchAdminsList();
          } else {
            setIsAdmin(false);
            setIsLoading(false);
          }
        } else {
          setIsAdmin(false);
          setIsLoading(false);
        }
      } catch {
        setIsAdmin(false);
        setIsLoading(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    // 1. Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkSession(session);
    });

    // 2. Auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      checkSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (analytics && activeTab === "analytics") {
      const timer = setTimeout(() => {
        loadCharts();
      }, 50);
      return () => {
        clearTimeout(timer);
        destroyCharts();
      };
    }
  }, [analytics, activeTab]);

  if (checkingAuth || isLoading) {
    return (
      <>
        <Navbar />
        <div className={styles.loadingState}>
          <div className="spinner spinner-lg" />
          <p>
            {checkingAuth
              ? "Verifying authorization..."
              : "Loading analytics dashboard..."}
          </p>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Navbar />
        <div className={styles.accessDeniedContainer}>
          <div className={styles.deniedCard}>
            <div className={styles.deniedIcon}>🔒</div>
            <h1 className={styles.deniedTitle}>Access Denied</h1>
            <p className={styles.deniedText}>
              You do not have permission to view the analytics dashboard. This area
              is restricted to administrators only.
            </p>
            <div className={styles.deniedInfo}>
              <span>Authorized Administrator:</span>
              <strong>onlytheone1092@gmail.com</strong>
            </div>
            <div className={styles.deniedActions}>
              <Link href="/" className="btn btn-secondary">
                Go Back Home
              </Link>
              <Link href="/auth" className="btn btn-primary">
                Sign In as Admin
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Analytics <span className="text-gradient">Dashboard</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Aggregated insights for universities and policymakers. Discover
            trending careers, common skill gaps, and platform usage.
          </p>
          {!isLiveData && (
            <div className={styles.sampleBadge}>
              <span>📊</span> Displaying sample data — connect Supabase for live
              analytics
            </div>
          )}
        </div>
      </section>

      {/* Dashboard Sub Tabs */}
      <div className="container">
        <div className={styles.subTabContainer}>
          <button
            className={`${styles.subTab} ${
              activeTab === "analytics" ? styles.subTabActive : ""
            }`}
            onClick={() => setActiveTab("analytics")}
          >
            📊 Analytics Overview
          </button>
          <button
            className={`${styles.subTab} ${
              activeTab === "admins" ? styles.subTabActive : ""
            }`}
            onClick={() => setActiveTab("admins")}
          >
            👥 Manage Admins
          </button>
        </div>
      </div>

      <div style={{ display: activeTab === "analytics" ? "block" : "none" }}>
          {error && (
            <div className="container">
              <div className={styles.errorMsg}>
                <span>⚠️</span> {error}
              </div>
            </div>
          )}

          {analytics && (
            <>
              {/* KPI Cards */}
              <section className={styles.kpiSection}>
                <div className="container">
                  <div className={styles.kpiGrid}>
                    <div className={styles.kpiCard}>
                      <div className={styles.kpiIcon}>🎤</div>
                      <div className={styles.kpiValue}>
                        {analytics.totalSessions.toLocaleString()}
                      </div>
                      <div className={styles.kpiLabel}>Voice Sessions</div>
                    </div>
                    <div className={styles.kpiCard}>
                      <div className={styles.kpiIcon}>📊</div>
                      <div className={styles.kpiValue}>
                        {analytics.totalAnalyses.toLocaleString()}
                      </div>
                      <div className={styles.kpiLabel}>Skill Analyses</div>
                    </div>
                    <div className={styles.kpiCard}>
                      <div className={styles.kpiIcon}>📈</div>
                      <div className={styles.kpiValue}>
                        {analytics.averageMatchPercentage}%
                      </div>
                      <div className={styles.kpiLabel}>Avg. Skill Match</div>
                    </div>
                    <div className={styles.kpiCard}>
                      <div className={styles.kpiIcon}>🏫</div>
                      <div className={styles.kpiValue}>
                        {analytics.universityBreakdown.length}
                      </div>
                      <div className={styles.kpiLabel}>Universities</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Charts Grid */}
              <section className={styles.chartsSection}>
                <div className="container">
                  <div className={styles.chartsGrid}>
                    {/* Top Careers */}
                    <div className={styles.chartCard}>
                      <h3 className={styles.chartTitle}>
                        🔥 Most Searched Careers
                      </h3>
                      <p className={styles.chartDesc}>
                        Top career paths students are exploring via voice assistant
                      </p>
                      <div className={styles.chartContainer}>
                        <canvas ref={barChartRef} id="top-careers-chart" />
                      </div>
                    </div>

                    {/* Match Distribution */}
                    <div className={styles.chartCard}>
                      <h3 className={styles.chartTitle}>
                        🎯 Skill Match Distribution
                      </h3>
                      <p className={styles.chartDesc}>
                        How well students match their target careers
                      </p>
                      <div
                        className={styles.chartContainer}
                        style={{ maxHeight: 320 }}
                      >
                        <canvas ref={doughnutChartRef} id="match-dist-chart" />
                      </div>
                    </div>

                    {/* Missing Skills */}
                    <div className={styles.chartCard}>
                      <h3 className={styles.chartTitle}>
                        ❌ Top Missing Skills Nationwide
                      </h3>
                      <p className={styles.chartDesc}>
                        Most common skill gaps across all student analyses
                      </p>
                      <div className={styles.chartContainer}>
                        <canvas ref={skillBarChartRef} id="missing-skills-chart" />
                      </div>
                    </div>

                    {/* University Breakdown */}
                    <div className={styles.chartCard}>
                      <h3 className={styles.chartTitle}>
                        🏫 University Breakdown
                      </h3>
                      <p className={styles.chartDesc}>
                        Platform usage across Malaysian universities
                      </p>
                      <div className={styles.chartContainer}>
                        <canvas ref={uniBarChartRef} id="university-chart" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Weekly Trend Table */}
              <section className={styles.trendSection}>
                <div className="container">
                  <div className={styles.trendCard}>
                    <h3 className={styles.chartTitle}>📅 Weekly Activity Trend</h3>
                    <div className={styles.tableWrapper}>
                      <table className={styles.trendTable}>
                        <thead>
                          <tr>
                            <th>Period</th>
                            <th>Voice Sessions</th>
                            <th>Skill Analyses</th>
                            <th>Conversion Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.weeklyTrend.map((week) => (
                            <tr key={week.week}>
                              <td>{week.week}</td>
                              <td>{week.sessions}</td>
                              <td>{week.analyses}</td>
                              <td>
                                <span className="badge badge-accent">
                                  {Math.round(
                                    (week.analyses / week.sessions) * 100
                                  )}
                                  %
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>

              {/* Policy Insights */}
              <section className={styles.insightsSection}>
                <div className="container">
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                      💡 Policy <span className="text-gradient">Insights</span>
                    </h2>
                  </div>
                  <div className={styles.insightsGrid}>
                    <div className={styles.insightCard}>
                      <div className={styles.insightIcon}>🤖</div>
                      <h4>AI & Tech Demand Surge</h4>
                      <p>
                        AI/ML Engineer and Data Scientist are the top 2 searched
                        careers, indicating massive student interest in AI-related
                        fields. Universities should expand AI curriculum.
                      </p>
                    </div>
                    <div className={styles.insightCard}>
                      <div className={styles.insightIcon}>🐍</div>
                      <h4>Python is #1 Gap</h4>
                      <p>
                        Python is the most common missing skill across all analyses.
                        This suggests a critical need for Python programming courses
                        in university curricula nationwide.
                      </p>
                    </div>
                    <div className={styles.insightCard}>
                      <div className={styles.insightIcon}>📉</div>
                      <h4>58% Average Match</h4>
                      <p>
                        Students average only 58% skill match with their target
                        careers, highlighting a significant education-industry gap
                        that needs policy intervention.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
      </div>

      <div style={{ display: activeTab === "admins" ? "block" : "none" }}>
        <section className={styles.adminManagementSection}>
          <div className="container">
            <div className={styles.adminCard}>
              <h3 className={styles.adminCardTitle}>👥 Admin Access List</h3>
              <p className={styles.adminCardDesc}>
                Add or remove emails that have permission to view this Workforce Analytics Dashboard.
              </p>

              {/* Add Admin Form */}
              <form onSubmit={handleAddAdmin} className={styles.addAdminForm}>
                <div className={styles.formInputGroup}>
                  <input
                    type="email"
                    placeholder="Enter email address (e.g. jia.liang@university.edu)"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    required
                    className={styles.adminEmailInput}
                    disabled={adminActionLoading}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={adminActionLoading || !newAdminEmail.trim()}
                  >
                    {adminActionLoading ? "Adding..." : "Add Admin"}
                  </button>
                </div>
              </form>

              {/* Status Messages */}
              {adminError && (
                <div className={styles.adminErrorMsg}>
                  <span>⚠️</span> {adminError}
                </div>
              )}
              {adminSuccess && (
                <div className={styles.adminSuccessMsg}>
                  <span>✅</span> {adminSuccess}
                </div>
              )}

              {/* List of Admins */}
              <div className={styles.adminListWrapper}>
                <table className={styles.adminListTable}>
                  <thead>
                    <tr>
                      <th>Email Address</th>
                      <th>Role / Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminsList.map((emailAddress) => (
                      <tr key={emailAddress}>
                        <td className={styles.adminEmailCol}>{emailAddress}</td>
                        <td>
                          {emailAddress === "onlytheone1092@gmail.com" ? (
                            <span className="badge badge-primary">Super Admin</span>
                          ) : (
                            <span className="badge badge-accent">Authorized Admin</span>
                          )}
                        </td>
                        <td>
                          {emailAddress !== "onlytheone1092@gmail.com" ? (
                            <button
                              onClick={() => triggerRevokeConfirmation(emailAddress)}
                              className="badge badge-danger"
                              style={{
                                cursor: "pointer",
                                transition: "all 0.2s",
                                display: "inline-flex",
                                fontFamily: "inherit"
                              }}
                              disabled={adminActionLoading}
                            >
                              Revoke Access
                            </button>
                          ) : (
                            <span
                              className="badge"
                              style={{
                                opacity: 0.5,
                                border: "1px dashed var(--gray-500)",
                                color: "var(--gray-500)",
                                display: "inline-flex"
                              }}
                            >
                              Protected
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        title="Revoke Admin Access"
        message="Are you sure you want to revoke administrator access for this user? They will no longer be able to view or manage the workforce analytics dashboard."
        itemName={adminToRevoke}
        itemIcon="👥"
        confirmLabel="Revoke Access"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={adminActionLoading}
        onConfirm={() => handleRemoveAdmin(adminToRevoke)}
        onCancel={() => setIsConfirmModalOpen(false)}
      />

      <Footer />
    </>
  );
}
