"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RoadmapData } from "@/types";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "./page.module.css";

// Extend Window interface for webkit speech recognition
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface SavedRoadmapRecord {
  id: string;
  transcript: string;
  career_title: string;
  required_skills?: string[];
  steps_count?: number;
  roadmap_data?: RoadmapData;
  created_at: string;
}

export default function VoiceRoadmapPage(): React.JSX.Element {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [error, setError] = useState<string>("");
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [savedRoadmaps, setSavedRoadmaps] = useState<SavedRoadmapRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [activeRoadmapId, setActiveRoadmapId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string>("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);

  // Helper to get storage key per user
  const getStorageKey = (uid: string | null): string => {
    return uid ? `nextgen_saved_roadmaps_${uid}` : "nextgen_saved_roadmaps_guest";
  };

  // Fetch saved roadmaps strictly isolated per user
  const fetchUserHistory = async (userId: string | null): Promise<void> => {
    setIsLoadingHistory(true);
    setSavedRoadmaps([]); // Clean slate immediately

    // Remove legacy unpartitioned storage key if present
    try {
      localStorage.removeItem("nextgen_saved_roadmaps");
    } catch {
      // ignore
    }

    let remoteRecords: SavedRoadmapRecord[] = [];

    if (userId) {
      try {
        const response = await fetch(`/api/user-roadmaps?userId=${userId}`);
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          remoteRecords = data.data;
        }
      } catch (err) {
        console.warn("Failed to fetch remote history:", err);
      }
    }

    // Read user-specific local storage cache
    try {
      const storageKey = getStorageKey(userId);
      const localDataStr = localStorage.getItem(storageKey);
      if (localDataStr) {
        const localRecords: SavedRoadmapRecord[] = JSON.parse(localDataStr);
        const combined = [...remoteRecords];
        localRecords.forEach((localRec) => {
          if (
            !combined.some(
              (r) =>
                r.id === localRec.id ||
                (r.transcript === localRec.transcript &&
                  r.created_at === localRec.created_at)
            )
          ) {
            combined.push(localRec);
          }
        });
        setSavedRoadmaps(combined);
      } else {
        setSavedRoadmaps(remoteRecords);
      }
    } catch {
      setSavedRoadmaps(remoteRecords);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setSpeechSupported(false);
    }

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      // 1. Initial session load
      supabase.auth.getSession().then(({ data: { session } }) => {
        const uid = session?.user?.id || null;
        setActiveUserId(uid);
        fetchUserHistory(uid);
      });

      // 2. Auth state change listener (switches history when user logs in/out)
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        const uid = session?.user?.id || null;
        setActiveUserId(uid);
        fetchUserHistory(uid);
      });

      return () => {
        subscription.unsubscribe();
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort?.() || recognitionRef.current.stop();
          } catch {
            // ignore
          }
        }
      };
    } else {
      fetchUserHistory(null);
    }

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort?.() || recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const transcriptRef = useRef<string>("");

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const stopListening = useCallback((): void => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const resetSilenceTimer = useCallback((): void => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      stopListening();
    }, 3000);
  }, [stopListening]);

  const startListening = useCallback((): void => {
    setError("");
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    const initialText = transcriptRef.current;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let speechText = "";
      for (let i = 0; i < event.results.length; i++) {
        speechText += event.results[i][0].transcript;
      }
      setTranscript(
        initialText +
          (initialText && !initialText.endsWith(" ") ? " " : "") +
          speechText
      );
      // Reset the 3-second silence timer whenever speech is detected
      resetSilenceTimer();
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // "aborted" occurs when reset/stopped manually; "no-speech" occurs on quiet timeouts.
      if (event.error === "aborted" || event.error === "no-speech") {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        setIsListening(false);
        return;
      }

      console.warn("Speech recognition notice:", event.error);
      if (event.error === "not-allowed") {
        setError(
          "Microphone access denied. Please allow microphone permissions in your browser."
        );
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    // Start initial 3s silence countdown
    resetSilenceTimer();
  }, [resetSilenceTimer]);

  const generateRoadmap = async (): Promise<void> => {
    if (!transcript.trim()) {
      setError("Please speak or type something about your career interests.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setRoadmap(null);
    setToastMsg("");

    try {
      const supabase = getSupabaseBrowserClient();
      let userId: string | undefined = activeUserId || undefined;
      if (supabase && !userId) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
        setActiveUserId(userId || null);
      }

      const response = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript.trim(), userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate roadmap");
      }

      const generatedData = data.data as RoadmapData;
      setRoadmap(generatedData);

      // Add to saved records list for this user
      const newRecord: SavedRoadmapRecord = {
        id: data.sessionId || `local-${Date.now()}`,
        transcript: transcript.trim(),
        career_title: generatedData.careerTitle,
        required_skills: generatedData.requiredSkills,
        steps_count: generatedData.roadmapSteps.length,
        roadmap_data: generatedData,
        created_at: new Date().toISOString(),
      };

      setActiveRoadmapId(newRecord.id);

      const updatedHistory = [
        newRecord,
        ...savedRoadmaps.filter((r) => r.id !== newRecord.id),
      ];
      setSavedRoadmaps(updatedHistory);
      try {
        localStorage.setItem(
          getStorageKey(userId || null),
          JSON.stringify(updatedHistory)
        );
      } catch {
        // storage quota
      }

      setToastMsg(
        `✨ Roadmap for "${generatedData.careerTitle}" created and auto-saved!`
      );
      setTimeout(() => setToastMsg(""), 4000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewRoadmap = (record: SavedRoadmapRecord): void => {
    setTranscript(record.transcript);
    setActiveRoadmapId(record.id);
    if (record.roadmap_data) {
      setRoadmap(record.roadmap_data);
    } else {
      // Reconstruct basic roadmap if only summary/skills available
      setRoadmap({
        careerTitle: record.career_title,
        summary: `Career roadmap generated from your query: "${record.transcript}"`,
        roadmapSteps: [],
        requiredSkills: record.required_skills || [],
        industryOutlook: "Refer to steps for industry outlook in Malaysia.",
      });
    }
    setError("");
    setToastMsg(`📂 Loaded saved roadmap: ${record.career_title}`);
    setTimeout(() => setToastMsg(""), 3500);

    // Scroll to roadmap view
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleDeleteRoadmap = async (
    recordId: string,
    careerTitle: string
  ): Promise<void> => {
    if (
      !confirm(
        `Are you sure you want to delete the saved roadmap for "${careerTitle}"?`
      )
    ) {
      return;
    }

    setDeletingId(recordId);
    try {
      await fetch(
        `/api/user-roadmaps?id=${recordId}${
          activeUserId ? `&userId=${activeUserId}` : ""
        }`,
        {
          method: "DELETE",
        }
      );

      const updated = savedRoadmaps.filter((r) => r.id !== recordId);
      setSavedRoadmaps(updated);
      try {
        localStorage.setItem(
          getStorageKey(activeUserId),
          JSON.stringify(updated)
        );
      } catch {
        // quota
      }

      // If the currently displayed roadmap was the one just deleted, clear the display & transcript
      if (activeRoadmapId === recordId || roadmap?.careerTitle === careerTitle) {
        setRoadmap(null);
        setActiveRoadmapId(null);
        const deletedItem = savedRoadmaps.find((r) => r.id === recordId);
        if (deletedItem && transcript === deletedItem.transcript) {
          setTranscript("");
          transcriptRef.current = "";
        }
      }

      setToastMsg(`🗑️ Deleted roadmap for "${careerTitle}".`);
      setTimeout(() => setToastMsg(""), 3500);
    } catch (err) {
      setError(`Failed to delete roadmap: ${(err as Error).message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const resetAll = (): void => {
    // If speech recognition is actively running, abort and stop immediately
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort?.() || recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript("");
    transcriptRef.current = "";
    setRoadmap(null);
    setActiveRoadmapId(null);
    setError("");
    setToastMsg("");
    setIsProcessing(false);
  };

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "Recently";
    }
  };

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <span className="badge badge-accent">Module 1</span>
          <h1 className={styles.heroTitle}>
            Voice-to-Roadmap <span className="text-gradient">AI Assistant</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Click the microphone and tell us about your dream career, interests,
            or background. Our AI will generate a personalized career roadmap
            instantly.
          </p>
        </div>
      </section>

      {/* Voice Input Section */}
      <section className={styles.voiceSection}>
        <div className="container">
          <div className={styles.voiceCard}>
            {/* Mic Button */}
            <div className={styles.micContainer}>
              {!speechSupported ? (
                <div className={styles.unsupported}>
                  <p>
                    ⚠️ Your browser does not support the Web Speech API. Please
                    use Chrome, Edge, or Safari.
                  </p>
                </div>
              ) : (
                <>
                  <button
                    className={`${styles.micButton} ${
                      isListening ? styles.listening : ""
                    }`}
                    onClick={isListening ? stopListening : startListening}
                    disabled={isProcessing}
                    id="mic-button"
                  >
                    {isListening && (
                      <>
                        <span className={styles.pulseRing} />
                        <span className={styles.pulseRing2} />
                      </>
                    )}
                    <span className={styles.micIcon}>
                      {isListening ? (
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className={styles.stopIcon}
                        >
                          <rect
                            x="4"
                            y="4"
                            width="16"
                            height="16"
                            rx="4"
                            fill="url(#brightAccentGrad)"
                          />
                          <defs>
                            <linearGradient
                              id="brightAccentGrad"
                              x1="4"
                              y1="4"
                              x2="20"
                              y2="20"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#00F2FE" />
                              <stop offset="1" stopColor="#4FACFE" />
                            </linearGradient>
                          </defs>
                        </svg>
                      ) : (
                        "🎤"
                      )}
                    </span>
                  </button>
                  <p className={styles.micLabel}>
                    {isListening
                      ? "Listening... Click to stop"
                      : "Click to start speaking"}
                  </p>
                </>
              )}
            </div>

            {/* Transcript */}
            <div className={styles.transcriptArea}>
              <label className={styles.fieldLabel}>
                Your voice transcript (editable):
              </label>
              <textarea
                className="textarea"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Your spoken words will appear here... Or type directly! Try saying something like: 'I love technology and data. I want to become a data scientist working in the financial sector in Malaysia.'"
                rows={5}
                id="transcript-input"
              />
            </div>

            {/* Actions */}
            <div className={styles.voiceActions}>
              <button
                className="btn btn-primary btn-lg"
                onClick={generateRoadmap}
                disabled={isProcessing || !transcript.trim()}
                id="generate-btn"
              >
                {isProcessing ? (
                  <>
                    <span className="spinner" /> Generating Roadmap...
                  </>
                ) : (
                  "✨ Generate My Roadmap"
                )}
              </button>
              <button
                className="btn btn-ghost"
                onClick={resetAll}
                id="reset-btn"
              >
                Reset
              </button>
            </div>

            {toastMsg && (
              <div className={styles.toastSuccess}>
                <span>✓</span> {toastMsg}
              </div>
            )}

            {error && (
              <div className={styles.errorMsg}>
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Saved Roadmaps History (Review & Delete) */}
            <div className={styles.historySection}>
              <div className={styles.historyHeader}>
                <div className={styles.historyTitle}>
                  <span>📜</span> Your Previous Roadmap Records
                  <span className={styles.historyCountBadge}>
                    {savedRoadmaps.length}{" "}
                    {savedRoadmaps.length === 1 ? "Record" : "Records"}
                  </span>
                </div>
              </div>

              {isLoadingHistory ? (
                <div className={styles.historyLoading}>
                  <div className="spinner" />
                  <span>Loading previous roadmap records...</span>
                </div>
              ) : savedRoadmaps.length === 0 ? (
                <div className={styles.emptyHistory}>
                  No previous roadmap records found. Speak or type your career
                  interests above to generate and auto-save your first roadmap!
                </div>
              ) : (
                <div className={styles.historyList}>
                  {savedRoadmaps.map((rec) => (
                    <div key={rec.id} className={styles.historyCard}>
                      <div className={styles.historyCardTop}>
                        <div className={styles.historyCardTitle}>
                          <span>🎯</span> {rec.career_title}
                        </div>
                        <div className={styles.historyCardMeta}>
                          {rec.steps_count ? (
                            <span className="badge badge-primary">
                              {rec.steps_count} Steps
                            </span>
                          ) : null}
                          <span className={styles.historyCardDate}>
                            🕒 {formatDate(rec.created_at)}
                          </span>
                        </div>
                      </div>

                      <div
                        className={styles.historyTranscriptSnippet}
                        title={rec.transcript}
                      >
                        &ldquo;{rec.transcript}&rdquo;
                      </div>

                      {rec.required_skills &&
                        rec.required_skills.length > 0 && (
                          <div className={styles.historySkillsRow}>
                            {rec.required_skills
                              .slice(0, 4)
                              .map((skill, idx) => (
                                <span
                                  key={idx}
                                  className={styles.historySkillPill}
                                >
                                  {skill}
                                </span>
                              ))}
                            {rec.required_skills.length > 4 && (
                              <span className={styles.historySkillPill}>
                                +{rec.required_skills.length - 4} more
                              </span>
                            )}
                          </div>
                        )}

                      <div className={styles.historyCardActions}>
                        <button
                          type="button"
                          className={`btn btn-secondary btn-sm ${styles.reviewBtn}`}
                          onClick={() => handleReviewRoadmap(rec)}
                          id={`review-btn-${rec.id}`}
                        >
                          👁️ Review / Load
                        </button>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() =>
                            handleDeleteRoadmap(rec.id, rec.career_title)
                          }
                          disabled={deletingId === rec.id}
                          id={`delete-btn-${rec.id}`}
                        >
                          {deletingId === rec.id ? (
                            <>
                              <span
                                className="spinner"
                                style={{ width: 12, height: 12 }}
                              />{" "}
                              Deleting...
                            </>
                          ) : (
                            "🗑️ Delete"
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap Results */}
      {roadmap && (
        <section className={styles.results} ref={resultsRef}>
          <div className="container">
            {/* Career Header */}
            <div className={styles.resultHeader}>
              <span className="badge badge-success">Roadmap Generated ✓</span>
              <h2 className={styles.careerTitle}>{roadmap.careerTitle}</h2>
              <p className={styles.careerSummary}>{roadmap.summary}</p>
              {roadmap.industryOutlook && (
                <div className={styles.outlookBadge}>
                  <span>📈</span> {roadmap.industryOutlook}
                </div>
              )}
            </div>

            {/* Roadmap Timeline */}
            <div className={styles.timeline}>
              {roadmap.roadmapSteps.map((step, i) => (
                <div
                  key={i}
                  className={styles.timelineItem}
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <div className={styles.timelineDot}>
                    <span>{step.step}</span>
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <h3>{step.title}</h3>
                      <span className="badge badge-primary">
                        {step.duration}
                      </span>
                    </div>
                    <p>{step.description}</p>
                    {step.skills && step.skills.length > 0 && (
                      <div className={styles.skillTags}>
                        {step.skills.map((skill) => (
                          <span key={skill} className={styles.skillTag}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Required Skills */}
            {roadmap.requiredSkills && roadmap.requiredSkills.length > 0 && (
              <div className={styles.skillsSummary}>
                <h3>📋 All Required Skills</h3>
                <div className={styles.skillCloud}>
                  {roadmap.requiredSkills.map((skill) => (
                    <span key={skill} className={styles.skillCloudTag}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Next Step CTA */}
            <div className={styles.nextStep}>
              <div className={styles.nextStepCard}>
                <h3>📊 Ready for Step 2?</h3>
                <p>
                  Paste your resume into the Skill-Gap Analyzer to see how your
                  current skills match up against this roadmap.
                </p>
                <Link
                  href={{
                    pathname: "/skill-analyzer",
                    query: { roadmap: JSON.stringify(roadmap) },
                  }}
                  className="btn btn-primary"
                  id="next-step-btn"
                >
                  Analyze My Skills →
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
