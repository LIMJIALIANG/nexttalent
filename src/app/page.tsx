"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

interface ModuleInfo {
  icon: string;
  title: string;
  description: string;
  href: string;
  color: string;
  tag: string;
}

interface StatInfo {
  value: string;
  label: string;
}

const MODULES: ModuleInfo[] = [
  {
    icon: "🎤",
    title: "Voice-to-Roadmap AI",
    description:
      "Speak your dream career and get an instant, personalized step-by-step roadmap powered by Gemini AI.",
    href: "/voice-roadmap",
    color: "accent",
    tag: "Module 1",
  },
  {
    icon: "📊",
    title: "Skill-Gap Analyzer",
    description:
      "Paste your resume and see exactly which skills you need to acquire for your target career path.",
    href: "/skill-analyzer",
    color: "primary",
    tag: "Module 2",
  },
  {
    icon: "📚",
    title: "Micro-Learning Hub",
    description:
      "Get curated free course recommendations to close your skill gaps with actionable learning paths.",
    href: "/learn",
    color: "gold",
    tag: "Module 3",
  },
  {
    icon: "📈",
    title: "Workforce Dashboard",
    description:
      "Analytics view for universities and policymakers — see trending careers and common skill gaps.",
    href: "/dashboard",
    color: "info",
    tag: "Module 4",
  },
];

const STATS: StatInfo[] = [
  { value: "30s", label: "Average Roadmap Time" },
  { value: "AI", label: "Gemini 2.5 Flash" },
  { value: "25+", label: "Courses Database" },
  { value: "4", label: "Integrated Modules" },
];

export default function HomePage(): React.JSX.Element {
  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroParticles}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.particle} />
          ))}
        </div>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            URIIS Student Biz Innov Challenge 2026
          </div>
          <h1 className={styles.heroTitle}>
            Voice-Activated
            <br />
            <span className="text-gradient">Future Talent</span>
            <br />
            Ecosystem
          </h1>
          <p className={styles.heroSubtitle}>
            Speak your dream career. Get an AI-generated roadmap. Analyze your
            skill gaps. Start learning — all in under 60 seconds.
          </p>
          <div className={styles.heroActions}>
            <Link href="/voice-roadmap" className="btn btn-primary btn-lg" id="hero-start-btn">
              🎤 Start Speaking
            </Link>
            <Link href="/dashboard" className="btn btn-secondary btn-lg" id="hero-dashboard-btn">
              View Dashboard →
            </Link>
          </div>
          <div className={styles.heroTech}>
            <span>Built with:</span>
            <span className={styles.techTag}>Web Speech API</span>
            <span className={styles.techTag}>Gemini AI</span>
            <span className={styles.techTag}>Next.js</span>
            <span className={styles.techTag}>Supabase</span>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className={styles.statsBar}>
        <div className={styles.statsInner}>
          {STATS.map((stat) => (
            <div key={stat.label} className={styles.statItem}>
              <div className={styles.statValue}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Problem Statement */}
      <section className={styles.problem}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="badge badge-gold">Problem Statement #3</span>
            <h2 className={styles.sectionTitle}>
              Future Talent Ecosystem:{" "}
              <span className="text-gradient">AI for Employment & Skills</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              How might we leverage AI to build a future-ready talent ecosystem
              that bridges the gap between education and employment by improving
              skills matching, career readiness, workforce planning, and
              lifelong learning for Malaysians?
            </p>
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section className={styles.modules}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="badge badge-accent">4-Module System</span>
            <h2 className={styles.sectionTitle}>
              How It <span className="text-gradient">Works</span>
            </h2>
            <p className={styles.sectionSubtitle}>
              A comprehensive journey from career discovery to skill mastery,
              powered by voice AI and real-time analytics.
            </p>
          </div>

          <div className={styles.modulesGrid}>
            {MODULES.map((mod, index) => (
              <Link
                key={mod.title}
                href={mod.href}
                className={`${styles.moduleCard} glass-card`}
                style={{ animationDelay: `${index * 0.1}s` }}
                id={`module-card-${index + 1}`}
              >
                <div className={styles.moduleTag}>
                  <span className={`badge badge-${mod.color}`}>{mod.tag}</span>
                </div>
                <div className={styles.moduleIcon}>{mod.icon}</div>
                <h3 className={styles.moduleTitle}>{mod.title}</h3>
                <p className={styles.moduleDesc}>{mod.description}</p>
                <div className={styles.moduleArrow}>→</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Flow Section */}
      <section className={styles.flow}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <span className="badge badge-primary">User Journey</span>
            <h2 className={styles.sectionTitle}>
              From Voice to{" "}
              <span className="text-gradient">Career Clarity</span>
            </h2>
          </div>

          <div className={styles.flowSteps}>
            {[
              {
                step: "01",
                title: "Speak",
                desc: "Click the microphone and describe your interests or dream career in your own words.",
              },
              {
                step: "02",
                title: "Generate",
                desc: "AI transcribes your voice and generates a personalized career roadmap instantly.",
              },
              {
                step: "03",
                title: "Analyze",
                desc: "Paste your resume to see a skill-gap analysis comparing your current abilities vs. requirements.",
              },
              {
                step: "04",
                title: "Learn",
                desc: "Get free course recommendations to close every identified skill gap.",
              },
            ].map((item, i) => (
              <div key={item.step} className={styles.flowStep}>
                <div className={styles.flowStepNumber}>{item.step}</div>
                <div className={styles.flowStepContent}>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
                {i < 3 && <div className={styles.flowConnector} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className="container">
          <div className={styles.ctaCard}>
            <div className={styles.ctaGlow} />
            <h2>Ready to discover your future career?</h2>
            <p>
              Start by speaking to our AI assistant. It takes less than 30
              seconds to get your personalized roadmap.
            </p>
            <Link href="/voice-roadmap" className="btn btn-primary btn-lg" id="cta-start-btn">
              🎤 Try It Now — It&apos;s Free
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
