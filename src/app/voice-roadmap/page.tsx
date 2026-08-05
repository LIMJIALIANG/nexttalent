"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RoadmapData } from "@/types";
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

export default function VoiceRoadmapPage(): React.JSX.Element {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [error, setError] = useState<string>("");
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setSpeechSupported(false);
    }
  }, []);

  const startListening = useCallback((): void => {
    setError("");
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = transcript;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setError(
          "Microphone access denied. Please allow microphone permissions in your browser."
        );
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [transcript]);

  const stopListening = useCallback((): void => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const generateRoadmap = async (): Promise<void> => {
    if (!transcript.trim()) {
      setError("Please speak or type something about your career interests.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setRoadmap(null);

    try {
      const response = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate roadmap");
      }

      setRoadmap(data.data as RoadmapData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = (): void => {
    setTranscript("");
    setRoadmap(null);
    setError("");
    setIsProcessing(false);
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
                      {isListening ? "⏹" : "🎤"}
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
              <button className="btn btn-ghost" onClick={resetAll} id="reset-btn">
                Reset
              </button>
            </div>

            {error && (
              <div className={styles.errorMsg}>
                <span>⚠️</span> {error}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Roadmap Results */}
      {roadmap && (
        <section className={styles.results}>
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
