"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AuthCallbackPage(): React.JSX.Element {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      router.push("/auth?error=supabase_not_configured");
      return;
    }

    const nextParam = new URL(window.location.href).searchParams.get("next") || "/";
    const code = new URL(window.location.href).searchParams.get("code");

    if (code) {
      // Exchange the PKCE code for a session
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          console.error("Callback session exchange error:", error.message);
          setErrorMsg(error.message);
          router.push(`/auth?error=${encodeURIComponent(error.message)}`);
        } else {
          router.push(nextParam);
        }
      });
    } else {
      // If no code, check for existing session
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.error("Callback session check error:", error.message);
          setErrorMsg(error.message);
          router.push(`/auth?error=${encodeURIComponent(error.message)}`);
        } else if (session) {
          router.push(nextParam);
        } else {
          router.push("/");
        }
      });
    }
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--surface-0)",
        color: "white",
        fontFamily: "var(--font-primary)",
      }}
    >
      <div className="spinner spinner-lg" style={{ marginBottom: "20px" }} />
      <p style={{ color: "var(--gray-400)", fontSize: "0.9375rem" }}>
        {errorMsg ? `Error: ${errorMsg}` : "Completing login, redirecting you..."}
      </p>
    </div>
  );
}
