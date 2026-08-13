"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "../page.module.css";

export default function ForgotPasswordPage(): React.JSX.Element {
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const handleResetRequest = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
      });

      if (error) {
        throw error;
      }

      setSuccess("A password reset link has been sent to your email address!");
      setEmail("");
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
            <span className={styles.authLogoIcon}>⚡</span>
            <span className={styles.authLogoText}>
              Next<span className={styles.authLogoHighlight}>Talent</span>
            </span>
          </Link>
          <h1 className={styles.authTitle}>Reset Password</h1>
          <p className={styles.authSubtitle}>
            Enter your email to receive a password reset link
          </p>
        </div>

        <form className={styles.authForm} onSubmit={handleResetRequest}>
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
            id="reset-submit-btn"
          >
            {isLoading ? (
              <>
                <span className="spinner" /> Sending Link...
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        <div className={styles.authFooter}>
          <p>
            Remembered your password? <Link href="/auth">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
