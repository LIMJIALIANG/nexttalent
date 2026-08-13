"use client";

import { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConfirmModal, { ConfirmModalProps } from "@/components/ConfirmModal";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Leave page confirmation states
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState<string | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);

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

  // Resume File & Preview states
  const [resumeFilePreview, setResumeFilePreview] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeFileType, setResumeFileType] = useState<string | null>(null);
  const [resumeFileSize, setResumeFileSize] = useState<number | null>(null);
  const [isModalPreviewOpen, setIsModalPreviewOpen] = useState<boolean>(false);

  // Save / Dirty / Confirmation States — snapshot-based comparison
  const emptySnapshot = JSON.stringify({ pName: "", obj: "", edu: [], exp: [], proj: [], sk: [], ach: [], fName: null, fType: null, fSize: null });
  const savedSnapshotRef = useRef<string>(emptySnapshot);
  const [isSavingResume, setIsSavingResume] = useState<boolean>(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string>("");

  // Build a deterministic JSON string from all editable resume fields
  const buildResumeSnapshot = (
    pName: string, obj: string,
    edu: ResumeEducation[], exp: ResumeExperience[],
    proj: ResumeProject[], sk: string[], ach: string[],
    fName: string | null, fType: string | null, fSize: number | null,
  ): string => {
    return JSON.stringify({ pName, obj, edu, exp, proj, sk, ach, fName, fType, fSize });
  };

  const currentSnapshot = useMemo(
    () => buildResumeSnapshot(
      personalName, objective, educationList, experienceList,
      projectsList, skillsList, achievementsList,
      resumeFileName, resumeFileType, resumeFileSize,
    ),
    [personalName, objective, educationList, experienceList,
     projectsList, skillsList, achievementsList,
     resumeFileName, resumeFileType, resumeFileSize]
  );

  // isDirty is true only when current fields genuinely differ from saved state
  const isDirty = currentSnapshot !== savedSnapshotRef.current;

  // Helper to mark current state as the "saved" baseline
  const markAsSaved = (): void => {
    savedSnapshotRef.current = currentSnapshot;
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemName?: string;
    itemIcon?: string;
    confirmLabel: string;
    cancelLabel?: string;
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

  // Scanning & analysis states
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanSuccess, setScanSuccess] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<SkillAnalysis | null>(null);
  const [error, setError] = useState<string>("");

  // Track resume snapshot at time of last analysis — for "resume changed" detection
  const analysisSnapshotRef = useRef<string | null>(null);
  const resumeChangedSinceAnalysis =
    analysis !== null &&
    analysisSnapshotRef.current !== null &&
    currentSnapshot !== analysisSnapshotRef.current;

  const getStorageKey = (uid: string | null): string => {
    return uid ? `nexttalent_saved_roadmaps_${uid}` : "nexttalent_saved_roadmaps_guest";
  };

  const getResumeCacheKey = (uid: string | null): string => {
    return uid ? `nexttalent_cached_resume_${uid}` : "nexttalent_cached_resume_guest";
  };

  const getAnalysisCacheKey = (uid: string | null, career?: string): string => {
    const careerSuffix = career ? `_${career.toLowerCase().replace(/[^a-z0-9]/g, "_")}` : "";
    return uid ? `nexttalent_cached_analysis_${uid}${careerSuffix}` : `nexttalent_cached_analysis_guest${careerSuffix}`;
  };

  const formatFileSize = (bytes?: number | null): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const loadAnalysisCache = (uid: string | null, career?: string): void => {
    try {
      const key = getAnalysisCacheKey(uid, career);
      const cachedStr = localStorage.getItem(key);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached.analysisData) {
          setAnalysis(cached.analysisData);
          analysisSnapshotRef.current = cached.resumeSnapshot || null;
        }
      }
    } catch {
      // ignore
    }
  };

  const loadResumeCache = (uid: string | null): void => {
    try {
      const key = getResumeCacheKey(uid);
      const cachedStr = localStorage.getItem(key);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached.personalName) setPersonalName(cached.personalName);
        if (cached.objective) setObjective(cached.objective);
        if (cached.educationList && Array.isArray(cached.educationList)) setEducationList(cached.educationList);
        if (cached.experienceList && Array.isArray(cached.experienceList)) setExperienceList(cached.experienceList);
        if (cached.projectsList && Array.isArray(cached.projectsList)) setProjectsList(cached.projectsList);
        if (cached.skillsList && Array.isArray(cached.skillsList)) setSkillsList(cached.skillsList);
        if (cached.achievementsList && Array.isArray(cached.achievementsList)) setAchievementsList(cached.achievementsList);
        if (cached.resumeFilePreview) setResumeFilePreview(cached.resumeFilePreview);
        if (cached.resumeFileName) setResumeFileName(cached.resumeFileName);
        if (cached.resumeFileType) setResumeFileType(cached.resumeFileType);
        if (cached.resumeFileSize) setResumeFileSize(cached.resumeFileSize);
        // Set the saved baseline from cache so isDirty starts as false
        savedSnapshotRef.current = buildResumeSnapshot(
          cached.personalName || "", cached.objective || "",
          cached.educationList || [], cached.experienceList || [],
          cached.projectsList || [], cached.skillsList || [],
          cached.achievementsList || [],
          cached.resumeFileName || null, cached.resumeFileType || null,
          cached.resumeFileSize || null,
        );
      }
    } catch {
      // ignore
    }
  };

  const fetchUserResume = async (userId: string | null): Promise<void> => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/user-resume?userId=${userId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          const dbResume = json.data;
          if (dbResume.personal_name) setPersonalName(dbResume.personal_name);
          if (dbResume.objective) setObjective(dbResume.objective);
          if (dbResume.education && Array.isArray(dbResume.education)) setEducationList(dbResume.education);
          if (dbResume.experience && Array.isArray(dbResume.experience)) setExperienceList(dbResume.experience);
          if (dbResume.projects && Array.isArray(dbResume.projects)) setProjectsList(dbResume.projects);
          if (dbResume.skills && Array.isArray(dbResume.skills)) setSkillsList(dbResume.skills);
          if (dbResume.achievements && Array.isArray(dbResume.achievements)) setAchievementsList(dbResume.achievements);
          if (dbResume.resume_file_name) setResumeFileName(dbResume.resume_file_name);
          if (dbResume.resume_file_type) setResumeFileType(dbResume.resume_file_type);
          if (dbResume.resume_file_size) setResumeFileSize(dbResume.resume_file_size);
          // Set saved baseline from DB data so isDirty correctly starts as false
          savedSnapshotRef.current = buildResumeSnapshot(
            dbResume.personal_name || "", dbResume.objective || "",
            dbResume.education || [], dbResume.experience || [],
            dbResume.projects || [], dbResume.skills || [],
            dbResume.achievements || [],
            dbResume.resume_file_name || null, dbResume.resume_file_type || null,
            dbResume.resume_file_size || null,
          );
        }
      }
    } catch (e) {
      console.warn("Could not fetch DB resume:", e);
    }
  };

  const fetchSavedAnalysis = async (userId: string | null, careerTitle?: string): Promise<void> => {
    // 1. Check local cache first for instant response
    loadAnalysisCache(userId, careerTitle);

    if (!userId) return;
    setIsLoadingAnalysis(true);
    try {
      let url = `/api/user-analysis?userId=${userId}`;
      if (careerTitle) url += `&careerTitle=${encodeURIComponent(careerTitle)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.analysis_data) {
          setAnalysis(json.data.analysis_data);
          analysisSnapshotRef.current = json.data.resume_snapshot || null;
          // Sync to local storage
          const key = getAnalysisCacheKey(userId, careerTitle || json.data.career_title);
          localStorage.setItem(
            key,
            JSON.stringify({
              analysisData: json.data.analysis_data,
              resumeSnapshot: json.data.resume_snapshot || null,
              careerTitle: json.data.career_title,
              savedAt: new Date().toISOString(),
            })
          );
        }
      }
    } catch (e) {
      console.warn("Could not fetch saved analysis:", e);
    } finally {
      setIsLoadingAnalysis(false);
    }
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
        fetchSavedAnalysis(userId, parsed.careerTitle);
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
      fetchSavedAnalysis(userId, first.career_title);
    } else {
      fetchSavedAnalysis(userId);
    }
  };

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const uid = session?.user?.id || null;
        setActiveUserId(uid);
        fetchUserHistory(uid);
        loadResumeCache(uid);
        fetchUserResume(uid);
        fetchSavedAnalysis(uid);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        const uid = session?.user?.id || null;
        setActiveUserId(uid);
        fetchUserHistory(uid);
        loadResumeCache(uid);
        fetchUserResume(uid);
        fetchSavedAnalysis(uid);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      fetchUserHistory(null);
      loadResumeCache(null);
    }
  }, [searchParams]);

  // Persist form & resume cache on changes
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const key = getResumeCacheKey(activeUserId);
        const payload = {
          personalName,
          objective,
          educationList,
          experienceList,
          projectsList,
          skillsList,
          achievementsList,
          resumeFilePreview,
          resumeFileName,
          resumeFileType,
          resumeFileSize,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify(payload));
      } catch (err) {
        console.warn("Could not cache resume data:", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    activeUserId,
    personalName,
    objective,
    educationList,
    experienceList,
    projectsList,
    skillsList,
    achievementsList,
    resumeFilePreview,
    resumeFileName,
    resumeFileType,
    resumeFileSize,
  ]);

  // Prompt confirmation on leaving if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes in your resume profile.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Intercept in-app link navigation to prompt user to save or discard
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (!isDirty) return;

      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      if (
        href.startsWith("#") ||
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      const currentPath = window.location.pathname;
      if (href === currentPath || href === "/skill-analyzer") {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      setPendingNavigationUrl(href);
      setIsLeaveModalOpen(true);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [isDirty]);

  const handleSaveResume = async (): Promise<boolean> => {
    setIsSavingResume(true);
    setSaveStatusMessage("");
    setError("");

    try {
      const resumePayload = {
        personalName,
        objective,
        educationList,
        experienceList,
        projectsList,
        skillsList,
        achievementsList,
        resumeFileName,
        resumeFileType,
        resumeFileSize,
      };

      // 1. Save to Database via API
      if (activeUserId) {
        await fetch("/api/user-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: activeUserId, resumeData: resumePayload }),
        });
      }

      // 2. Cache to local storage
      const key = getResumeCacheKey(activeUserId);
      localStorage.setItem(
        key,
        JSON.stringify({
          ...resumePayload,
          resumeFilePreview,
          savedAt: new Date().toISOString(),
        })
      );

      markAsSaved();
      setSaveStatusMessage("✓ Resume saved to database & local profile!");
      setTimeout(() => setSaveStatusMessage(""), 4000);
      return true;
    } catch (err) {
      console.error("Save resume error:", err);
      setError("Failed to save resume to database.");
      return false;
    } finally {
      setIsSavingResume(false);
    }
  };

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
      // Fetch saved analysis for the newly selected career
      setAnalysis(null);
      analysisSnapshotRef.current = null;
      fetchSavedAnalysis(activeUserId, found.career_title);
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

          // Set file preview and metadata
          setResumeFilePreview(base64String);
          setResumeFileName(file.name);
          setResumeFileType(mimeType);
          setResumeFileSize(file.size);

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
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };
    } catch (err) {
      setError((err as Error).message);
      setIsScanning(false);
    }
  };

  const handleRemoveResume = (): void => {
    setResumeFilePreview(null);
    setResumeFileName(null);
    setResumeFileType(null);
    setResumeFileSize(null);
    setScanSuccess("");

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

  // Section Clear Handlers
  const handleClearPersonal = (): void => {
    setPersonalName("");
    setObjective("");

  };

  const handleClearEducation = (): void => {
    setEducationList([]);

  };

  const handleClearExperience = (): void => {
    setExperienceList([]);

  };

  const handleClearProjects = (): void => {
    setProjectsList([]);

  };

  const handleClearSkills = (): void => {
    setSkillsList([]);

  };

  const handleClearAchievements = (): void => {
    setAchievementsList([]);

  };

  const promptClearAll = (): void => {
    setConfirmModal({
      isOpen: true,
      title: "Clear All Resume Sections?",
      message:
        "Are you sure you want to reset all candidate inputs across all sections? This action will empty all personal, education, experience, project, skill, and certificate fields.",
      itemName: "Entire Resume Profile",
      itemIcon: "🧹",
      confirmLabel: "Yes, Clear All",
      cancelLabel: "Keep Data",
      variant: "danger",
      onConfirm: () => {
        setPersonalName("");
        setObjective("");
        setEducationList([]);
        setExperienceList([]);
        setProjectsList([]);
        setSkillsList([]);
        setAchievementsList([]);

        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
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
          resumeSnapshot: currentSnapshot,
          roadmapId: selectedRoadmapId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setAnalysis(data.data as SkillAnalysis);
      // Record the resume snapshot at time of analysis
      analysisSnapshotRef.current = currentSnapshot;

      // Also cache analysis locally for instant persistence
      try {
        const key = getAnalysisCacheKey(activeUserId, roadmap.careerTitle);
        localStorage.setItem(
          key,
          JSON.stringify({
            analysisData: data.data,
            resumeSnapshot: currentSnapshot,
            careerTitle: roadmap.careerTitle,
            savedAt: new Date().toISOString(),
          })
        );
      } catch (cacheErr) {
        console.warn("Failed to cache analysis locally:", cacheErr);
      }
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

          {/* 1. PDF / Image Resume Scanner & Viewer */}
          <div className={styles.scannerCard}>
            <div className={styles.scannerTitle}>📷 AI Resume File Scanner</div>
            <div className={styles.scannerDesc}>
              Upload your resume as a <strong>PDF or PNG/JPG image</strong> to automatically
              extract details, prefill all form fields, and view your document.
            </div>

            <input
              type="file"
              ref={fileInputRef}
              className={styles.fileInput}
              accept="application/pdf,image/png,image/jpeg"
              onChange={handleFileUpload}
              disabled={isScanning}
            />

            {resumeFilePreview ? (
              <div className={styles.resumeViewerCard}>
                <div className={styles.resumeViewerHeader}>
                  <div className={styles.resumeFileDetails}>
                    <span className={styles.resumeFileIcon}>
                      {resumeFileType === "application/pdf" || resumeFilePreview.startsWith("data:application/pdf")
                        ? "📄"
                        : "🖼️"}
                    </span>
                    <div>
                      <div className={styles.resumeFileName}>{resumeFileName || "Uploaded Resume"}</div>
                      <div className={styles.resumeFileMeta}>
                        <span className={styles.resumeFileBadge}>
                          {resumeFileType === "application/pdf" || resumeFilePreview.startsWith("data:application/pdf")
                            ? "PDF Document"
                            : "Image"}
                        </span>
                        {resumeFileSize ? <span>• {formatFileSize(resumeFileSize)}</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className={styles.resumeActions}>
                    <button
                      type="button"
                      className={styles.reuploadBtn}
                      onClick={triggerFileSelect}
                      disabled={isScanning}
                      id="reupload-resume-btn"
                    >
                      <span>🔄</span> Re-upload / Replace
                    </button>
                    <button
                      type="button"
                      className={styles.previewActionBtn}
                      onClick={() => setIsModalPreviewOpen(true)}
                      title="View Fullscreen"
                      id="view-fullscreen-resume-btn"
                    >
                      <span>🔍</span> Zoom
                    </button>
                    <button
                      type="button"
                      className={styles.removeResumeBtn}
                      onClick={handleRemoveResume}
                      title="Remove Uploaded File"
                      id="remove-resume-btn"
                    >
                      <span>🗑️</span> Remove
                    </button>
                  </div>
                </div>

                {/* Document Viewer Frame */}
                <div className={styles.documentPreviewBox}>
                  {resumeFileType === "application/pdf" || resumeFilePreview.startsWith("data:application/pdf") ? (
                    <iframe
                      src={resumeFilePreview}
                      className={styles.resumePdfFrame}
                      title="Resume PDF Viewer"
                    />
                  ) : (
                    <div className={styles.imagePreviewWrapper}>
                      <img
                        src={resumeFilePreview}
                        alt="Uploaded Resume"
                        className={styles.resumeImagePreview}
                        onClick={() => setIsModalPreviewOpen(true)}
                        title="Click to zoom / view fullscreen"
                      />
                    </div>
                  )}
                </div>

                <div className={styles.cachedNotice}>
                  <span>💾</span> Resume cached in your session. All extracted form fields are prefilled below and can be edited anytime.
                </div>
              </div>
            ) : (
              <div className={styles.fileUploadArea} onClick={triggerFileSelect}>
                <span className={styles.fileUploadIcon}>📁</span>
                <span>{isScanning ? "Scanning Document with Gemini AI..." : "Click or Drag to Upload Resume File"}</span>
              </div>
            )}

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
            {/* Form Top Toolbar */}
            <div className={styles.formToolbar}>
              <div className={styles.formToolbarHeader}>
                <h3 className={styles.formToolbarTitle}>📋 Candidate Resume Profile</h3>
                {isDirty ? (
                  <span className={`${styles.dirtyBadge} ${styles.dirtyBadgeUnsaved}`} title="You have unsaved changes">
                    ⚠️ Unsaved Changes
                  </span>
                ) : (
                  <span className={`${styles.dirtyBadge} ${styles.dirtyBadgeSaved}`} title="All changes saved">
                    ✓ Saved
                  </span>
                )}
              </div>

              <div className={styles.formToolbarActions}>
                <button
                  type="button"
                  className={styles.saveResumeBtn}
                  onClick={handleSaveResume}
                  disabled={isSavingResume}
                  id="save-resume-profile-btn"
                  title="Save resume to database & profile"
                >
                  {isSavingResume ? (
                    <>
                      <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Save Resume</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className={styles.clearAllBtn}
                  onClick={promptClearAll}
                  id="clear-all-resume-btn"
                  title="Reset all form sections"
                >
                  <span>🧹</span>
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            {saveStatusMessage && (
              <div className={styles.scanSuccess} style={{ margin: "0 0 var(--space-4) 0" }}>
                {saveStatusMessage}
              </div>
            )}

            {/* Personal Details */}
            <div className={styles.formSection}>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>👤 Personal Details</h3>
                <button
                  type="button"
                  className={styles.clearSectionBtn}
                  onClick={handleClearPersonal}
                  title="Clear Personal Details"
                >
                  🧹 Clear Section
                </button>
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
                <div className={styles.sectionActions}>
                  <button
                    type="button"
                    className={styles.clearSectionBtn}
                    onClick={handleClearEducation}
                    title="Clear Education Section"
                  >
                    🧹 Clear Section
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={addEducation}
                  >
                    ➕ Add Education
                  </button>
                </div>
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
                <div className={styles.sectionActions}>
                  <button
                    type="button"
                    className={styles.clearSectionBtn}
                    onClick={handleClearExperience}
                    title="Clear Experience Section"
                  >
                    🧹 Clear Section
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={addExperience}
                  >
                    ➕ Add Experience
                  </button>
                </div>
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
                <div className={styles.sectionActions}>
                  <button
                    type="button"
                    className={styles.clearSectionBtn}
                    onClick={handleClearProjects}
                    title="Clear Projects Section"
                  >
                    🧹 Clear Section
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={addProject}
                  >
                    ➕ Add Project
                  </button>
                </div>
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
                <button
                  type="button"
                  className={styles.clearSectionBtn}
                  onClick={handleClearSkills}
                  title="Clear Skills Section"
                >
                  🧹 Clear Section
                </button>
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
                <div className={styles.sectionActions}>
                  <button
                    type="button"
                    className={styles.clearSectionBtn}
                    onClick={handleClearAchievements}
                    title="Clear Achievements Section"
                  >
                    🧹 Clear Section
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={addAchievement}
                  >
                    ➕ Add Achievement
                  </button>
                </div>
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
            {resumeChangedSinceAnalysis && (
              <div className={styles.resumeChangedBanner}>
                <span className={styles.resumeChangedIcon}>🔄</span>
                <div className={styles.resumeChangedText}>
                  <strong>Resume profile has changed</strong> since your last analysis. Click below to re-analyze and get updated results.
                </div>
              </div>
            )}

            {isLoadingAnalysis && !analysis && (
              <div className={styles.scanStatus}>
                <div className="spinner" />
                <span className={styles.scannerDesc}>Restoring your previous analysis...</span>
              </div>
            )}

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
              ) : resumeChangedSinceAnalysis ? (
                "🔄 Re-Analyze My Skill Gap"
              ) : analysis ? (
                "🔍 Re-Analyze My Skill Gap"
              ) : (
                "🔍 Analyze My Skill Gap"
              )}
            </button>

            {analysis && !resumeChangedSinceAnalysis && (
              <div className={styles.analysisSavedNotice}>
                <span>💾</span> Analysis results saved to your profile. They will persist across sessions.
              </div>
            )}
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

      {/* Fullscreen Resume Preview Modal */}
      {isModalPreviewOpen && resumeFilePreview && (
        <div
          className={styles.previewModalOverlay}
          onClick={() => setIsModalPreviewOpen(false)}
        >
          <div
            className={styles.previewModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.previewModalHeader}>
              <div className={styles.previewModalTitle}>
                <span>
                  {resumeFileType === "application/pdf" ||
                  resumeFilePreview.startsWith("data:application/pdf")
                    ? "📄"
                    : "🖼️"}
                </span>
                <span>{resumeFileName || "Resume Document"}</span>
              </div>
              <button
                type="button"
                className={styles.previewModalCloseBtn}
                onClick={() => setIsModalPreviewOpen(false)}
                aria-label="Close Preview"
              >
                ✕
              </button>
            </div>
            <div className={styles.previewModalBody}>
              {resumeFileType === "application/pdf" ||
              resumeFilePreview.startsWith("data:application/pdf") ? (
                <iframe
                  src={resumeFilePreview}
                  className={styles.previewModalPdf}
                  title="Fullscreen PDF Viewer"
                />
              ) : (
                <img
                  src={resumeFilePreview}
                  alt="Fullscreen Resume"
                  className={styles.previewModalImage}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* General Action Confirmation Prompt Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        itemName={confirmModal.itemName}
        itemIcon={confirmModal.itemIcon}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Navigation Leave Page Confirmation Prompt Modal */}
      <ConfirmModal
        isOpen={isLeaveModalOpen}
        title="Unsaved Resume Changes"
        message="You have unsaved changes in your resume profile. Would you like to save your changes before leaving this page?"
        itemName="Candidate Resume Profile"
        itemIcon="📝"
        confirmLabel="💾 Save & Leave"
        secondaryConfirmLabel="Leave Without Saving"
        cancelLabel="Stay on Page"
        variant="save"
        isLoading={isSavingResume}
        onConfirm={async () => {
          const success = await handleSaveResume();
          if (success) {
            setIsLeaveModalOpen(false);
            if (pendingNavigationUrl) {
              router.push(pendingNavigationUrl);
            }
          }
        }}
        onSecondaryConfirm={() => {
          markAsSaved();
          setIsLeaveModalOpen(false);
          if (pendingNavigationUrl) {
            router.push(pendingNavigationUrl);
          }
        }}
        onCancel={() => {
          setIsLeaveModalOpen(false);
          setPendingNavigationUrl(null);
        }}
      />

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
