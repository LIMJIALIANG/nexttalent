"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import styles from "./page.module.css";

export default function PrivacyPage(): React.JSX.Element {
  return (
    <>
      <Navbar />

      <main className={styles.pageWrapper}>
        <div className={styles.pageGlow} />
        <div className={styles.container}>
          <Link href="/" className={styles.backButton}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.backIcon}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Back to Home</span>
          </Link>

          <div className={styles.header}>
            <h1 className={styles.title}>Privacy Policy</h1>
            <p className={styles.subtitle}>Last updated: August 15, 2026</p>
          </div>

          <div className={styles.contentCard}>
            <div className={styles.textBlock}>
              <p>
                At NextTalent, we are committed to protecting your privacy and ensuring you have a positive experience on our website and when using our services. This Privacy Policy describes how we collect, use, and safeguard the personal information you provide to us.
              </p>

              <h2>1. Information We Collect</h2>
              <p>
                We collect information to provide better services to our users. The types of information we may collect include:
              </p>
              <ul>
                <li><strong>Account Information:</strong> If you sign up using your email or Google Auth, we collect your name, email address, and profile picture.</li>
                <li><strong>Voice Recordings:</strong> We convert voice input to text using the browser's native Web Speech API. We do not store or transmit raw audio recordings on our servers.</li>
                <li><strong>Resume Data:</strong> When using the Skill-Gap Analyzer, we process the text you submit. This is only stored locally on your device or in your personal database if you are logged in.</li>
                <li><strong>Usage Data:</strong> We collect anonymous data about user interactions with roadmaps, courses, and search terms to populate the workforce analytics dashboard.</li>
              </ul>

              <h2>2. How We Use Information</h2>
              <p>
                We use the information we collect to operate, maintain, and improve our services, including:
              </p>
              <ul>
                <li>To generate personalized career roadmaps and analyze skill gaps.</li>
                <li>To provide free course recommendations based on missing skills.</li>
                <li>To compile aggregate, anonymized workforce and education analytics.</li>
                <li>To personalize your experience and remember your preferences.</li>
              </ul>

              <h2>3. Data Protection and Security</h2>
              <p>
                We implement a variety of industry-standard security measures to maintain the safety of your personal information. If you use Supabase database integrations, your data is protected by Row Level Security (RLS) policies.
              </p>

              <h2>4. Third-Party Services</h2>
              <p>
                Our services integrate third-party applications, such as:
              </p>
              <ul>
                <li><strong>Google Gemini API:</strong> For AI-driven roadmap generation and gap analysis.</li>
                <li><strong>Supabase:</strong> For database and user authentication services.</li>
                <li><strong>External Course Providers:</strong> Such as Coursera, edX, and Udemy (we do not share your private data with these providers).</li>
              </ul>

              <h2>5. Contact Us</h2>
              <p>
                If you have any questions or concerns regarding this Privacy Policy, you may contact us at:
              </p>
              <p>
                ✉️ Email: <a href="mailto:onlytheone1092@gmail.com" style={{ color: "var(--accent-400)", textDecoration: "none", fontWeight: 600 }}>onlytheone1092@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
