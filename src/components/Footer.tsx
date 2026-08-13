"use client";

import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import styles from "./Footer.module.css";

export default function Footer(): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerGrid}>
          {/* Brand */}
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.logo}>
              <img
                src="/nexttalent-logo/nexttalent-logo-only-dark.png"
                alt="NextTalent"
                className={styles.logoImage}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const sibling = e.currentTarget.nextElementSibling;
                  if (sibling) (sibling as HTMLElement).style.display = "inline";
                }}
              />
              <span className={styles.logoIcon} style={{ display: "none" }}>⚡</span>
              <span className={styles.logoText}>NextTalent</span>
            </Link>
            <p className={styles.tagline}>
              Voice-Activated Future Talent Ecosystem — Empowering
              students with AI-driven career guidance.
            </p>
          </div>

          {/* Navigation */}
          <div className={styles.footerCol}>
            <h4 className={styles.colTitle}>Platform</h4>
            <Link href="/voice-roadmap" className={styles.footerLink}>
              🎤 Voice Roadmap
            </Link>
            <Link href="/skill-analyzer" className={styles.footerLink}>
              📊 Skill Analyzer
            </Link>
            <Link href="/learn" className={styles.footerLink}>
              📚 Learning Hub
            </Link>
            <Link href="/dashboard" className={styles.footerLink}>
              📈 Analytics Dashboard
            </Link>
          </div>

          {/* Contact */}
          <div className={styles.footerCol}>
            <h4 className={styles.colTitle}>Contact</h4>
            <a
              href="mailto:support@kolaxus.net"
              className={styles.footerLink}
            >
              support@kolaxus.net
            </a>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>© 2026 NextTalent. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
