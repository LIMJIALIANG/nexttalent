"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useTheme } from "@/context/ThemeContext";
import styles from "./Navbar.module.css";

interface NavLink {
  href: string;
  label: string;
}

interface UserInfo {
  email: string;
  name: string;
  avatarUrl: string | null;
}

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/voice-roadmap", label: "🎤 Voice Roadmap" },
  { href: "/skill-analyzer", label: "📊 Skill Analyzer" },
  { href: "/learn", label: "📚 Learn" },
  { href: "/dashboard", label: "📈 Dashboard" },
];

export default function Navbar(): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = (): void => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  // Fetch user session
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const mapUserSession = (sessionUser: any) => {
      const meta = sessionUser.user_metadata;
      
      // Resolve avatar: Custom Upload -> Google OAuth Picture -> Google Email Avatar -> Initials Fallback
      let avatar = meta?.custom_avatar_url || null;
      if (!avatar) {
        avatar = meta?.picture || meta?.avatar_url || null;
      }
      
      // Filter out standard Google default avatar paths if we can fetch the fresh one by email
      const isGmail = sessionUser.email?.toLowerCase().endsWith("@gmail.com");
      if (!avatar && isGmail) {
        avatar = `https://profiles.google.com/s2/photos/profile/${sessionUser.email}`;
      }

      setUser({
        email: sessionUser.email || "",
        name:
          meta?.full_name ||
          meta?.name ||
          `${meta?.first_name || ""} ${meta?.last_name || ""}`.trim() ||
          sessionUser.email ||
          "",
        avatarUrl: avatar,
      });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        mapUserSession(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        mapUserSession(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async (): Promise<void> => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
      setDropdownOpen(false);
      router.push("/");
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.navInner}>
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
          <span className={styles.logoText}>
            Next<span className={styles.logoHighlight}>Talent</span>
          </span>
        </Link>

        <div className={`${styles.navLinks} ${menuOpen ? styles.open : ""}`}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${
                pathname === link.href ? styles.active : ""
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Auth section (visible on mobile inside menu) */}
          <div className={styles.navAuthMobile}>
            {user ? (
              <>
                <Link href="/profile" className={styles.navLink}>
                  👤 My Profile
                </Link>
                <button
                  className={`${styles.navLink} ${styles.logoutLink}`}
                  onClick={handleLogout}
                >
                  🚪 Logout
                </button>
              </>
            ) : (
              <Link href="/auth" className={styles.navLink}>
                🔑 Login / Register
              </Link>
            )}

            {/* Theme Toggle — mobile */}
            <button
              className={styles.themeToggleMobile}
              onClick={toggleTheme}
              aria-label="Toggle theme"
              id="theme-toggle-mobile"
            >
              {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>
          </div>
        </div>

        {/* Auth section (visible on desktop) */}
        <div className={styles.navAuth}>
          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            id="theme-toggle-btn"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {user ? (
            <div className={styles.userMenu}>
              <button
                className={styles.avatarBtn}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                id="user-avatar-btn"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className={styles.avatarImg}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user.name
                      )}&background=0d8bd9&color=fff&size=38`;
                    }}
                  />
                ) : (
                  <span className={styles.avatarInitials}>
                    {getInitials(user.name)}
                  </span>
                )}
              </button>

              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownName}>{user.name}</div>
                    <div className={styles.dropdownEmail}>{user.email}</div>
                  </div>
                  <div className={styles.dropdownDivider} />
                  <Link href="/profile" className={styles.dropdownItem} id="profile-dropdown-link">
                    👤 My Profile
                  </Link>
                  <button
                    className={styles.dropdownItem}
                    onClick={handleLogout}
                    id="logout-btn"
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth" className={styles.loginBtn} id="login-nav-btn">
              Sign In
            </Link>
          )}
        </div>

        <button
          className={`${styles.hamburger} ${menuOpen ? styles.open : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          id="navbar-toggle"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}
