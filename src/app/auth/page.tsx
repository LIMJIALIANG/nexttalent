"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "./page.module.css";

type AuthMode = "login" | "register";

function AuthContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Check if already logged in
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/");
      }
    });
  }, [supabase, router]);

  // Show callback error if present
  useEffect(() => {
    const callbackError = searchParams.get("error");
    if (callbackError) {
      setError("Authentication failed. Please try again.");
    }
  }, [searchParams]);

  // No Supabase configured — show info
  if (!supabase) {
    return (
      <div className={styles.authPage}>
        <div className={styles.authGlow} />
        <div className={styles.authGlow2} />
        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <Link href="/" className={styles.authLogo}>
              <img
                src="/nexttalent-logo/nexttalent-logo-only-dark.png"
                alt="NextTalent"
                className={styles.authLogoImage}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const sibling = e.currentTarget.nextElementSibling;
                  if (sibling) (sibling as HTMLElement).style.display = "inline";
                }}
              />
              <span className={styles.authLogoIcon} style={{ display: "none" }}>⚡</span>
              <span className={styles.authLogoText}>
                Next<span className={styles.authLogoHighlight}>Talent</span>
              </span>
            </Link>
            <h1 className={styles.authTitle}>Authentication</h1>
          </div>
          <div className={styles.errorMsg}>
            <span>⚠️</span>
            Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and
            NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file to enable
            login and registration.
          </div>
          <div className={styles.authFooter}>
            <p>
              <Link href="/">← Back to Home</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Google OAuth Login
  const handleGoogleLogin = async (): Promise<void> => {
    setIsGoogleLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      setError((err as Error).message);
      setIsGoogleLoading(false);
    }
  };

  // Manual Email/Password Login
  const handleEmailLogin = async (): Promise<void> => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        throw error;
      }

      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual Email/Password Register
  const handleEmailRegister = async (): Promise<void> => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      setSuccess(
        "Account created! Please check your email to verify your account, then log in."
      );
      setMode("login");
      setPassword("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (mode === "login") {
      handleEmailLogin();
    } else {
      handleEmailRegister();
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authGlow} />
      <div className={styles.authGlow2} />

      <div className={styles.authCard}>
        {/* Header */}
        <div className={styles.authHeader}>
          <Link href="/" className={styles.authLogo}>
            <img
              src="/nexttalent-logo/nexttalent-logo-only-dark.png"
              alt="NextTalent"
              className={styles.authLogoImage}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const sibling = e.currentTarget.nextElementSibling;
                if (sibling) (sibling as HTMLElement).style.display = "inline";
              }}
            />
            <span className={styles.authLogoIcon} style={{ display: "none" }}>⚡</span>
            <span className={styles.authLogoText}>
              Next<span className={styles.authLogoHighlight}>Talent</span>
            </span>
          </Link>
          <h1 className={styles.authTitle}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className={styles.authSubtitle}>
            {mode === "login"
              ? "Sign in to access your career ecosystem"
              : "Join the NextTalent platform"}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className={styles.tabSwitcher}>
          <button
            className={`${styles.tab} ${mode === "login" ? styles.tabActive : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
              setSuccess("");
            }}
            id="tab-login"
          >
            Sign In
          </button>
          <button
            className={`${styles.tab} ${mode === "register" ? styles.tabActive : ""}`}
            onClick={() => {
              setMode("register");
              setError("");
              setSuccess("");
            }}
            id="tab-register"
          >
            Register
          </button>
        </div>

        {/* Google OAuth Button */}
        <button
          className={styles.googleBtn}
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          id="google-login-btn"
        >
          {isGoogleLoading ? (
            <span className="spinner" />
          ) : (
            <svg className={styles.googleIcon} viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          {isGoogleLoading
            ? "Redirecting to Google..."
            : mode === "login"
            ? "Sign in with Google"
            : "Sign up with Google"}
        </button>

        {/* Divider */}
        <div className={styles.divider}>
          <div className={styles.dividerLine} />
          <span className={styles.dividerText}>or</span>
          <div className={styles.dividerLine} />
        </div>

        {/* Email/Password Form */}
        <form className={styles.authForm} onSubmit={handleSubmit}>
          {/* Name fields (register only) */}
          {mode === "register" && (
            <div className={styles.nameRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="first-name">
                  First Name
                </label>
                <input
                  id="first-name"
                  type="text"
                  className={styles.formInput}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jia Liang"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="last-name">
                  Last Name
                </label>
                <input
                  id="last-name"
                  type="text"
                  className={styles.formInput}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Lim"
                />
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className={styles.formInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu.my"
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className={styles.formLabel} htmlFor="password">
                Password
              </label>
              {mode === "login" && (
                <Link
                  href="/auth/forgot-password"
                  style={{ fontSize: "0.8125rem", color: "var(--accent-400)" }}
                  id="forgot-password-link"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <input
              id="password"
              type="password"
              className={styles.formInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                mode === "register" ? "Min. 6 characters" : "Enter your password"
              }
              required
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </div>

          {/* Error / Success Messages */}
          {error && (
            <div className={styles.errorMsg}>
              <span>⚠️</span> {error}
            </div>
          )}
          {success && (
            <div className={styles.successMsg}>
              <span>✅</span> {success}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isLoading}
            id="submit-btn"
          >
            {isLoading ? (
              <>
                <span className="spinner" />{" "}
                {mode === "login" ? "Signing in..." : "Creating account..."}
              </>
            ) : mode === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className={styles.authFooter}>
          {mode === "login" ? (
            <p>
              Don&apos;t have an account?{" "}
              <a
                onClick={() => {
                  setMode("register");
                  setError("");
                  setSuccess("");
                }}
              >
                Register here
              </a>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <a
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccess("");
                }}
              >
                Sign in
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(): React.JSX.Element {
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
      <AuthContent />
    </Suspense>
  );
}
