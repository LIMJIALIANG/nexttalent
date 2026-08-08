"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  RoadmapData,
  SkillAnalysis,
  MatchedSkill,
  MissingSkill,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ParsedResumeData,
} from "@/types";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "./page.module.css";

interface SavedRoadmapRecord {
  id: string;
  transcript: string;
  career_title: string;
  required_skills?: string[];
  steps_count?: number;
  roadmap_data?: RoadmapData;
  created_at: string;
}

function SkillAnalyzerContent(): React.JSX.Element {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Roadmap details
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [savedRoadmaps, setSavedRoadmaps] = useState<SavedRoadmapRecord[]>([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isLoadingRoadmaps, setIsLoadingRoadmaps] = useState<boolean>(true);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  // Resume form states
  const [personalName, setPersonalName] = useState<string>("");
  const [objective, setObjective] = useState<string>("");
  const [educationList, setEducationList] = useState<ResumeEducation[]>([]);
  const [experienceList, setExperienceList] = useState<ResumeExperience[]>([]);
  const [projectsList, setProjectsList] = useState<ResumeProject[]>([]);
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState<string>("");
  const [achievementsList, setAchievementsList] = useState<string[]>([]);

  // Scanning & analysis states
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanSuccess, setScanSuccess] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<SkillAnalysis | null>(null);
  const [error, setError] = useState<string>("");

  const getStorageKey = (uid: string | null): string => {
    return uid ? `nextgen_saved_roadmaps_${uid}` : "nextgen_saved_roadmaps_guest";
  };

  const fetchUserHistory = async (userId: string | null): Promise<void> => {
    setIsLoadingRoadmaps(true);
    let loadedRecords: SavedRoadmapRecord[] = [];

    // 1. Check local storage partitioned by user
    try {
      const cached = localStorage.getItem(getStorageKey(userId));
      if (cached) {
        loadedRecords = JSON.parse(cached) as SavedRoadmapRecord[];
        setSavedRoadmaps(loadedRecords);
      }
    } catch {
      // ignore
    }

    // 2. Fetch server database records for authenticated user
    if (userId) {
      try {
        const res = await fetch(`/api/user-roadmaps?userId=${userId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            loadedRecords = json.data as SavedRoadmapRecord[];
            setSavedRoadmaps(loadedRecords);
            try {
              localStorage.setItem(
                getStorageKey(userId),
                JSON.stringify(loadedRecords)
              );
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // network error
      }
    }

    setIsLoadingRoadmaps(false);

    // If searchParam passed a roadmap
    const roadmapParam = searchParams.get("roadmap");
    if (roadmapParam) {
      try {
        const parsed = JSON.parse(roadmapParam) as RoadmapData;
        setRoadmap(parsed);
        const matched = loadedRecords.find(
          (r) =>
            r.career_title.toLowerCase() === parsed.careerTitle.toLowerCase()
        );
        setSelectedRoadmapId(matched ? matched.id : "custom");
        return;
      } catch {
        // ignore
      }
    }

    // Otherwise if we have saved roadmaps and no roadmap is chosen, default to the first one
    if (loadedRecords.length > 0) {
      const first = loadedRecords[0];
      setSelectedRoadmapId(first.id);
      if (first.roadmap_data) {
        setRoadmap(first.roadmap_data);
      } else {
        setRoadmap({
          careerTitle: first.career_title,
          summary: `Target career roadmap for ${first.career_title}`,
          roadmapSteps: [],
          requiredSkills: first.required_skills || [],
          industryOutlook: "Refer to steps for industry outlook in Malaysia.",
        });
      }
    }
  };

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const uid = session?.user?.id || null;
        setActiveUserId(uid);
        fetchUserHistory(uid);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        const uid = session?.user?.id || null;
        setActiveUserId(uid);
        fetchUserHistory(uid);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      fetchUserHistory(null);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDropdownOpen]);

  const handleSelectRoadmap = (recordId: string): void => {
    setSelectedRoadmapId(recordId);
    setIsDropdownOpen(false);
    const found = savedRoadmaps.find((r) => r.id === recordId);
    if (found) {
      if (found.roadmap_data) {
        setRoadmap(found.roadmap_data);
      } else {
        setRoadmap({
          careerTitle: found.career_title,
          summary: `Target career roadmap for ${found.career_title}`,
          roadmapSteps: [],
          requiredSkills: found.required_skills || [],
          industryOutlook: "Refer to steps for industry outlook in Malaysia.",
        });
      }
      setError("");
    }
  };

  // File Upload and Gemini OCR Parser
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setError("");
    setScanSuccess("");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64String = reader.result as string;
          const base64Data = base64String.split(",")[1];
          const mimeType = file.type;

          const response = await fetch("/api/parse-resume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileData: base64Data, mimeType }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Failed to parse resume");
          }

          const parsed = data.data as ParsedResumeData;

          // Populate States
          setPersonalName(parsed.personal?.name || "");
          setObjective(parsed.personal?.objective || "");
          setEducationList(parsed.education || []);
          setExperienceList(parsed.experience || []);
          setProjectsList(parsed.projects || []);
          setSkillsList(parsed.skills || []);
          setAchievementsList(parsed.achievements || []);

          setScanSuccess(`Successfully scanned and parsed resume: ${file.name}`);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setIsScanning(false);
        }
      };
    } catch (err) {
      setError((err as Error).message);
      setIsScanning(false);
    }
  };

  const triggerFileSelect = (): void => {
    fileInputRef.current?.click();
  };

  // Form manipulation utilities
  const addEducation = (): void => {
    setEducationList([
      ...educationList,
      { institution: "", degree: "", details: "", duration: "" },
    ]);
  };
  const removeEducation = (index: number): void => {
    setEducationList(educationList.filter((_, i) => i !== index));
  };
  const updateEducation = (
    index: number,
    field: keyof ResumeEducation,
    value: string
  ): void => {
    const updated = [...educationList];
    updated[index] = { ...updated[index], [field]: value };
    setEducationList(updated);
  };

  const addExperience = (): void => {
    setExperienceList([
      ...experienceList,
      { company: "", role: "", description: "", duration: "" },
    ]);
  };
  const removeExperience = (index: number): void => {
    setExperienceList(experienceList.filter((_, i) => i !== index));
  };
  const updateExperience = (
    index: number,
    field: keyof ResumeExperience,
    value: string
  ): void => {
    const updated = [...experienceList];
    updated[index] = { ...updated[index], [field]: value };
    setExperienceList(updated);
  };

  const addProject = (): void => {
    setProjectsList([...projectsList, { title: "", description: "" }]);
  };
  const removeProject = (index: number): void => {
    setProjectsList(projectsList.filter((_, i) => i !== index));
  };
  const updateProject = (
    index: number,
    field: keyof ResumeProject,
    value: string
  ): void => {
    const updated = [...projectsList];
    updated[index] = { ...updated[index], [field]: value };
    setProjectsList(updated);
  };

  const addSkill = (): void => {
    if (newSkill.trim() && !skillsList.includes(newSkill.trim())) {
      setSkillsList([...skillsList, newSkill.trim()]);
      setNewSkill("");
    }
  };
  const removeSkill = (skill: string): void => {
    setSkillsList(skillsList.filter((s) => s !== skill));
  };

  const addAchievement = (): void => {
    setAchievementsList([...achievementsList, ""]);
  };
  const removeAchievement = (index: number): void => {
    setAchievementsList(achievementsList.filter((_, i) => i !== index));
  };
  const updateAchievement = (index: number, value: string): void => {
    const updated = [...achievementsList];
    updated[index] = value;
    setAchievementsList(updated);
  };

  // Compile fields to plain text for API analysis
  const compileResumeText = (): string => {
    let text = `Candidate Name: ${personalName}\n`;
    if (objective) text += `Objective / Summary: ${objective}\n\n`;

    if (educationList.length > 0) {
      text += `Education:\n`;
      educationList.forEach((e) => {
        text += `- ${e.degree} at ${e.institution} (${e.duration})\n`;
        if (e.details) text += `  Details/Achievements: ${e.details}\n`;
      });
      text += `\n`;
    }

    if (experienceList.length > 0) {
      text += `Work Experience:\n`;
      experienceList.forEach((w) => {
        text += `- ${w.role} at ${w.company} (${w.duration})\n`;
        if (w.description) text += `  Description: ${w.description}\n`;
      });
      text += `\n`;
    }

    if (projectsList.length > 0) {
      text += `Project Involvement:\n`;
      projectsList.forEach((p) => {
        text += `- ${p.title}\n`;
        if (p.description) text += `  Description: ${p.description}\n`;
      });
      text += `\n`;
    }

    if (skillsList.length > 0) {
      text += `Skills:\n- ${skillsList.join(", ")}\n\n`;
    }

    if (achievementsList.length > 0) {
      text += `Achievements & Certificates:\n`;
      achievementsList.forEach((a) => {
        text += `- ${a}\n`;
      });
      text += `\n`;
    }

    return text.trim();
  };

  const analyzeSkills = async (): Promise<void> => {
    const resumeText = compileResumeText();

    if (!resumeText.replace(/Candidate Name:\s*\n?/i, "").trim()) {
      setError("Please fill in some resume details or upload your resume.");
      return;
    }

    if (!roadmap) {
      setError(
        "No target roadmap selected. Please generate or select a roadmap from the Voice-to-Roadmap section."
      );
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setAnalysis(null);

    try {
      const supabase = getSupabaseBrowserClient();
      let userId: string | undefined;
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      }

      const response = await fetch("/api/analyze-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resumeText.trim(),
          roadmapData: roadmap,
          userId,
        }),
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
          <span className="badge badge-primary">Skill-Gap Analysis</span>
          <h1 className={styles.heroTitle}>
            Automated <span className="text-gradient">Skill-Gap</span> Analyzer
          </h1>
          <p className={styles.heroSubtitle}>
            Scan your resume (PDF/Image) or fill in the form fields. The AI
            compares your profile details against the target career requirements.
          </p>
        </div>
      </section>

      {/* Analyzer Section */}
      <section className={styles.analyzerSection}>
        <div className="container">
          {/* Target Roadmap Context & Selector */}
          {roadmap ? (
            <div className={styles.contextCard}>
              <div className={styles.contextTopRow}>
                <div className={styles.contextMain}>
                  <div className={styles.contextIcon}>🎯</div>
                  <div>
                    <h3 className={styles.contextTitle}>
                      Target Career: {roadmap.careerTitle}
                    </h3>
                    <p className={styles.contextDesc}>{roadmap.summary}</p>
                  </div>
                </div>

                <div className={styles.selectorContainer}>
                  <div className={styles.dropdownWrapper} ref={dropdownRef}>
                    <button
                      type="button"
                      className={`${styles.dropdownTrigger} ${
                        isDropdownOpen ? styles.dropdownTriggerActive : ""
                      }`}
                      onClick={() => setIsDropdownOpen((prev) => !prev)}
                      aria-expanded={isDropdownOpen}
                      id="switch-roadmap-dropdown-btn"
                    >
                      <div className={styles.dropdownTriggerText}>
                        <span>🎯</span>
                        <span className={styles.dropdownTriggerTitle}>
                          {roadmap.careerTitle}
                        </span>
                      </div>
                      <span
                        className={`${styles.dropdownChevron} ${
                          isDropdownOpen ? styles.dropdownChevronOpen : ""
                        }`}
                      >
                        ▼
                      </span>
                    </button>

                      {isDropdownOpen && (
                        <div className={styles.dropdownMenu}>
                          <div className={styles.dropdownHeader}>
                            <span>Your Saved Roadmaps ({savedRoadmaps.length})</span>
                          </div>
                          <div className={styles.dropdownList}>
                            {savedRoadmaps.map((rec) => {
                              const isSelected =
                                selectedRoadmapId === rec.id ||
                                (!selectedRoadmapId &&
                                  rec.career_title.toLowerCase() ===
                                    roadmap.careerTitle.toLowerCase());
                              return (
                                <button
                                  key={rec.id}
                                  type="button"
                                  className={`${styles.dropdownItem} ${
                                    isSelected ? styles.dropdownItemActive : ""
                                  }`}
                                  onClick={() => handleSelectRoadmap(rec.id)}
                                >
                                  <span className={styles.dropdownItemIcon}>
                                    🎯
                                  </span>
                                  <div className={styles.dropdownItemContent}>
                                    <div className={styles.dropdownItemTitleRow}>
                                      <span className={styles.dropdownItemTitle}>
                                        {rec.career_title}
                                      </span>
                                    </div>
                                    {rec.required_skills &&
                                      rec.required_skills.length > 0 && (
                                        <div className={styles.dropdownItemSkills}>
                                          {rec.required_skills.slice(0, 3).join(", ")}
                                          {rec.required_skills.length > 3
                                            ? ` +${rec.required_skills.length - 3} more`
                                            : ""}
                                        </div>
                                      )}
                                  </div>
                                  {isSelected && (
                                    <span className={styles.dropdownCheck}>
                                      ✓
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          <div className={styles.dropdownFooter}>
                            <Link
                              href="/voice-roadmap"
                              className={styles.dropdownCreateBtn}
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <span>➕</span> Generate New Roadmap with Voice AI →
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                </div>
              </div>

              {roadmap.requiredSkills && roadmap.requiredSkills.length > 0 && (
                <div className={styles.roadmapSkillsList}>
                  <span className={styles.roadmapSkillsLabel}>Benchmark Skills:</span>
                  {roadmap.requiredSkills.map((skill, idx) => (
                    <span key={idx} className={styles.roadmapSkillPill}>
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.emptyRoadmapCard}>
              <div className={styles.emptyRoadmapIcon}>🎯</div>
              <div className={styles.emptyRoadmapContent}>
                <h3 className={styles.emptyRoadmapTitle}>Target Career Roadmap Required</h3>
                <p className={styles.emptyRoadmapDesc}>
                  To analyze your resume's skill gaps and generate personalized recommendations, you need a career roadmap first. Head over to the Voice-to-Roadmap section to speak or type your career goals and generate your roadmap.
                </p>
                <Link href="/voice-roadmap" className={styles.emptyRoadmapCta} id="generate-roadmap-cta">
                  🎤 Generate Roadmap in Voice Assistant →
                </Link>
              </div>
            </div>
          )}

          {/* 1. PDF / Image Resume Scanner */}
          <div className={styles.scannerCard}>
            <div className={styles.scannerTitle}>📷 AI Resume File Scanner</div>
            <div className={styles.scannerDesc}>
              Upload your resume as a **PDF or PNG/JPG image** to automatically
              extract details, prefill all form fields, and correct any inputs
              before matching.
            </div>

            <div className={styles.fileUploadArea} onClick={triggerFileSelect}>
              <span className={styles.fileUploadIcon}>📁</span>
              <span>{isScanning ? "Scanning Document with Gemini AI..." : "Click or Drag to Upload Resume File"}</span>
              <input
                type="file"
                ref={fileInputRef}
                className={styles.fileInput}
                accept="application/pdf,image/png,image/jpeg"
                onChange={handleFileUpload}
                disabled={isScanning}
              />
            </div>

            {isScanning && (
              <div className={styles.scanStatus}>
                <div className="spinner" />
                <span className={styles.scannerDesc}>Reading file context & generating structured fields...</span>
              </div>
            )}

            {scanSuccess && (
              <div className={styles.scanSuccess}>
                ✓ {scanSuccess}
              </div>
            )}
          </div>

          {/* 2. Structured Form fields */}
          <div className={styles.formCard}>
            {/* Personal Details */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>👤 Personal Details</h3>
              </div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="name-input">Candidate Name</label>
                  <input
                    type="text"
                    id="name-input"
                    className="input"
                    value={personalName}
                    onChange={(e) => setPersonalName(e.target.value)}
                    placeholder="e.g. Lim Jia Liang"
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="objective-input">Career Objective / Professional Summary</label>
                <textarea
                  id="objective-input"
                  className="textarea"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="e.g. Software Engineering student seeking a full-time role..."
                  rows={3}
                />
              </div>
            </div>

            {/* Education Section */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>🏫 Education</h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={addEducation}
                >
                  ➕ Add Education
                </button>
              </div>

              {educationList.length === 0 ? (
                <p className={styles.scannerDesc}>No education history added yet. Click Add Education to insert one.</p>
              ) : (
                <div className={styles.inputList}>
                  {educationList.map((edu, index) => (
                    <div key={index} className={styles.inputListItem}>
                      <button
                        type="button"
                        className={styles.listItemDeleteBtn}
                        onClick={() => removeEducation(index)}
                        title="Remove"
                      >
                        ✕
                      </button>
                      <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                          <label>Institution Name</label>
                          <input
                            type="text"
                            className="input"
                            value={edu.institution}
                            onChange={(e) =>
                              updateEducation(index, "institution", e.target.value)
                            }
                            placeholder="e.g. Universiti Sains Malaysia (USM)"
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Degree / Qualification</label>
                          <input
                            type="text"
                            className="input"
                            value={edu.degree}
                            onChange={(e) =>
                              updateEducation(index, "degree", e.target.value)
                            }
                            placeholder="e.g. Bachelor in Computer Science"
                          />
                        </div>
                      </div>
                      <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                          <label>Details (CGPA / Achievements)</label>
                          <input
                            type="text"
                            className="input"
                            value={edu.details}
                            onChange={(e) =>
                              updateEducation(index, "details", e.target.value)
                            }
                            placeholder="e.g. CGPA: 3.78, Major in Software Engineering"
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Duration</label>
                          <input
                            type="text"
                            className="input"
                            value={edu.duration}
                            onChange={(e) =>
                              updateEducation(index, "duration", e.target.value)
                            }
                            placeholder="e.g. 2022 - Present"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Work Experience Section */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>💼 Work Experience</h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={addExperience}
                >
                  ➕ Add Experience
                </button>
              </div>

              {experienceList.length === 0 ? (
                <p className={styles.scannerDesc}>No work experience added yet. Click Add Experience to insert one.</p>
              ) : (
                <div className={styles.inputList}>
                  {experienceList.map((exp, index) => (
                    <div key={index} className={styles.inputListItem}>
                      <button
                        type="button"
                        className={styles.listItemDeleteBtn}
                        onClick={() => removeExperience(index)}
                        title="Remove"
                      >
                        ✕
                      </button>
                      <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                          <label>Company / Organisation</label>
                          <input
                            type="text"
                            className="input"
                            value={exp.company}
                            onChange={(e) =>
                              updateExperience(index, "company", e.target.value)
                            }
                            placeholder="e.g. Vitrox Technologies Sdn Bhd"
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Role / Position</label>
                          <input
                            type="text"
                            className="input"
                            value={exp.role}
                            onChange={(e) =>
                              updateExperience(index, "role", e.target.value)
                            }
                            placeholder="e.g. Software R&D Engineer Intern"
                          />
                        </div>
                      </div>
                      <div className={styles.formGrid}>
                        <div className={styles.formGroup} style={{ gridColumn: "span 2" }}>
                          <label>Description & Responsibilities</label>
                          <textarea
                            className="textarea"
                            value={exp.description}
                            onChange={(e) =>
                              updateExperience(index, "description", e.target.value)
                            }
                            placeholder="Describe your role responsibilities..."
                            rows={3}
                          />
                        </div>
                      </div>
                      <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                          <label>Duration</label>
                          <input
                            type="text"
                            className="input"
                            value={exp.duration}
                            onChange={(e) =>
                              updateExperience(index, "duration", e.target.value)
                            }
                            placeholder="e.g. March 2025 - September 2025"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Project Involvement Section */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>🛠️ Project Involvement</h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={addProject}
                >
                  ➕ Add Project
                </button>
              </div>

              {projectsList.length === 0 ? (
                <p className={styles.scannerDesc}>No projects added yet. Click Add Project to insert one.</p>
              ) : (
                <div className={styles.inputList}>
                  {projectsList.map((proj, index) => (
                    <div key={index} className={styles.inputListItem}>
                      <button
                        type="button"
                        className={styles.listItemDeleteBtn}
                        onClick={() => removeProject(index)}
                        title="Remove"
                      >
                        ✕
                      </button>
                      <div className={styles.formGroup}>
                        <label>Project Title</label>
                        <input
                          type="text"
                          className="input"
                          value={proj.title}
                          onChange={(e) =>
                            updateProject(index, "title", e.target.value)
                          }
                          placeholder="e.g. Care4U Chain (Blockchain Platform)"
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Project Details / Technologies Used</label>
                        <textarea
                          className="textarea"
                          value={proj.description}
                          onChange={(e) =>
                            updateProject(index, "description", e.target.value)
                          }
                          placeholder="e.g. Built full-stack charity platform using Solidity, Next.js, and Supabase..."
                          rows={3}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skills Tags Section */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>🏷️ Skills & Competencies</h3>
              </div>
              <div className={styles.tagInputWrapper}>
                <input
                  type="text"
                  className="input"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="e.g. TypeScript, React, Python (Press Enter or Click +)"
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={addSkill}
                >
                  ➕ Add
                </button>
              </div>
              <div className={styles.tagList}>
                {skillsList.map((skill) => (
                  <span key={skill} className={styles.tagItem}>
                    {skill}
                    <button
                      type="button"
                      className={styles.tagRemoveBtn}
                      onClick={() => removeSkill(skill)}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Achievements & Certificates Section */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>🏆 Achievements & Certificates</h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={addAchievement}
                >
                  ➕ Add Achievement
                </button>
              </div>

              {achievementsList.length === 0 ? (
                <p className={styles.scannerDesc}>No achievements added yet. Click Add Achievement to insert one.</p>
              ) : (
                <div className={styles.inputList}>
                  {achievementsList.map((ach, index) => (
                    <div key={index} className={styles.inputListItem} style={{ padding: "10px 45px 10px 15px" }}>
                      <button
                        type="button"
                        className={styles.listItemDeleteBtn}
                        onClick={() => removeAchievement(index)}
                        title="Remove"
                        style={{ top: "8px", right: "8px" }}
                      >
                        ✕
                      </button>
                      <input
                        type="text"
                        className="input"
                        value={ach}
                        onChange={(e) => updateAchievement(index, e.target.value)}
                        placeholder="e.g. USM PiXEL Hackathon Bronze Award"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Analyze Button */}
          <div className={styles.analyzeActions}>
            <button
              className="btn btn-primary btn-lg"
              onClick={analyzeSkills}
              disabled={isAnalyzing || isScanning || !roadmap}
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
                <h3>📚 Ready for Next Step?</h3>
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
