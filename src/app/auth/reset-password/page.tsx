"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "../page.module.css";

export default function ResetPasswordPage(): React.JSX.Element {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Ensure user is actually logged in (session is set from redirect callback)
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError("Invalid or expired reset session. Please request a new password reset.");
      }
    });
  }, [supabase]);

  const handlePasswordUpdate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!password.trim() || !confirmPassword.trim()) {
      setError("Please fill in both password fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) {
        throw error;
      }

      setSuccess("Your password has been successfully updated!");
      setPassword("");
      setConfirmPassword("");

      // Redirect to home after 2 seconds
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className={styles.authTitle}>New Password</h1>
          <p className={styles.authSubtitle}>
            Enter your new secure password below
          </p>
        </div>

        <form className={styles.authForm} onSubmit={handlePasswordUpdate}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="password">
              New Password
            </label>
            <input
              id="password"
              type="password"
              className={styles.formInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="confirm-password">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              className={styles.formInput}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
            />
          </div>

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
            id="update-password-submit-btn"
          >
            {isLoading ? (
              <>
                <span className="spinner" /> Updating...
              </>
            ) : (
              "Update Password"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
