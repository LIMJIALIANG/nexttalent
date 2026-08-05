import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer(): React.JSX.Element {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerGrid}>
          {/* Brand */}
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.logo}>
              <span className={styles.logoIcon}>⚡</span>
              <span className={styles.logoText}>NextGen Talent</span>
            </Link>
            <p className={styles.tagline}>
              Voice-Activated Future Talent Ecosystem — Empowering Malaysian
              students with AI-driven career guidance.
            </p>
            <p className={styles.uriis}>
              Built for{" "}
              <span className={styles.highlight}>
                URIIS Student Biz Innov Challenge 2026
              </span>
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

          {/* Challenge */}
          <div className={styles.footerCol}>
            <h4 className={styles.colTitle}>Challenge</h4>
            <span className={styles.footerText}>
              Theme: Empowering Citizens
            </span>
            <span className={styles.footerText}>
              Problem: Future Talent Ecosystem
            </span>
            <span className={styles.footerText}>
              21–23 September 2026
            </span>
            <span className={styles.footerText}>
              World Trade Centre, KL
            </span>
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
            <span className={styles.footerText}>#URIIS2026</span>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>© 2026 NextGen Talent Matrix. All Rights Reserved.</p>
          <p className={styles.credits}>
            Problem Statement 3: AI for Employment & Skills
          </p>
        </div>
      </div>
    </footer>
  );
}
