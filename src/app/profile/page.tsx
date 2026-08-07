"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import styles from "./page.module.css";

interface UserProfile {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  university: string;
  bio: string;
  avatarUrl: string | null;
  googleAvatarUrl: string | null;
  hasPassword: boolean;
}

export default function ProfilePage(): React.JSX.Element {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Form edit states
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [university, setUniversity] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  // Password change states
  const [currentPassword, setCurrentPassword] = useState<string>(""); // Optional verification depending on config
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  // Loading & Msg states
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [securityErrorMsg, setSecurityErrorMsg] = useState<string>("");
  const [securitySuccessMsg, setSecuritySuccessMsg] = useState<string>("");

  useEffect(() => {
    if (!supabase) {
      setIsInitializing(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/auth");
      } else {
        const meta = session.user.user_metadata;
        const identities = session.user.identities || [];
        const hasPassword = identities.some((id) => id.provider === "email");

        const profileData: UserProfile = {
          email: session.user.email || "",
          firstName: meta?.first_name || "",
          lastName: meta?.last_name || "",
          phone: meta?.phone || "",
          university: meta?.university || "",
          bio: meta?.bio || "",
          avatarUrl: meta?.custom_avatar_url || null,
          googleAvatarUrl: meta?.picture || meta?.avatar_url || null,
          hasPassword,
        };

        setUser(profileData);
        setFirstName(profileData.firstName);
        setLastName(profileData.lastName);
        setPhone(profileData.phone);
        setUniversity(profileData.university);
        setBio(profileData.bio);
        setEmail(profileData.email);
        setIsInitializing(false);
      }
    });
  }, [supabase, router]);

  if (isInitializing) {
    return (
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
    );
  }

  if (!supabase || !user) {
    return (
      <div className={styles.profilePage}>
        <div className="container" style={{ textAlign: "center", padding: "100px 0" }}>
          <h2 className="text-gradient">Supabase is not configured</h2>
          <p style={{ marginTop: "20px", color: "var(--gray-400)" }}>
            Please enable Supabase to view your profile settings.
          </p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: "30px" }}>
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  // Helper to resolve the correct avatar
  const getDisplayAvatar = (): string => {
    if (user.avatarUrl) return user.avatarUrl; // Custom upload (base64)
    if (user.googleAvatarUrl) return user.googleAvatarUrl; // Google avatar
    
    // Fallback: Google email avatar photo if email is Gmail
    const isGmail = user.email.toLowerCase().endsWith("@gmail.com");
    if (isGmail) {
      return `https://profiles.google.com/s2/photos/profile/${user.email}`;
    }

    const name = `${firstName} ${lastName}`.trim() || user.email;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=0d8bd9&color=fff&size=150`;
  };

  // Profile Picture Upload (resizes to max 150px and converts to Base64)
  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = async () => {
          // Resize image using Canvas to keep the base64 payload light
          const canvas = document.createElement("canvas");
          const max_size = 150;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Get resized base64
          const resizedBase64 = canvas.toDataURL("image/jpeg", 0.75);

          // Update metadata in Supabase Auth
          const { error } = await supabase.auth.updateUser({
            data: {
              custom_avatar_url: resizedBase64,
            },
          });

          if (error) throw error;

          setUser({ ...user, avatarUrl: resizedBase64 });
          setSuccessMsg("Profile picture updated successfully!");
          setIsUploadingAvatar(false);
        };
      };
    } catch (err) {
      setErrorMsg((err as Error).message);
      setIsUploadingAvatar(false);
    }
  };

  const triggerFileSelect = (): void => {
    fileInputRef.current?.click();
  };

  // Save profile info fields
  const handleSaveProfile = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSavingProfile(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // 1. Update Profile Metadata
      const { data, error: profileError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          university: university.trim(),
          bio: bio.trim(),
        },
      });

      if (profileError) throw profileError;

      // 2. Update Email if changed
      if (email.trim().toLowerCase() !== user.email.toLowerCase()) {

        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim(),
        });

        if (emailError) throw emailError;

        setSuccessMsg(
          "Profile saved! A verification email has been sent to your new email address to complete the update."
        );
      } else {
        setSuccessMsg("Profile updated successfully!");
      }

      setUser({
        ...user,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        university: university.trim(),
        bio: bio.trim(),
      });
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Save security password change
  const handleSaveSecurity = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!newPassword.trim() || !confirmPassword.trim()) {
      setSecurityErrorMsg("Please enter and confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityErrorMsg("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setSecurityErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setIsSavingSecurity(true);
    setSecurityErrorMsg("");
    setSecuritySuccessMsg("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) throw error;

      setSecuritySuccessMsg("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      
      setUser((prev) => {
        if (!prev) return null;
        return { ...prev, hasPassword: true };
      });
    } catch (err) {
      setSecurityErrorMsg((err as Error).message);
    } finally {
      setIsSavingSecurity(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className={styles.profilePage}>
        <div className={styles.profileGlow} />
        <div className={styles.profileGlow2} />

        <div className="container">
          <h1 className={styles.pageTitle}>Account Settings</h1>
          <p className={styles.pageSubtitle}>
            Manage your personal details, credentials, and profile options.
          </p>

          <div className={styles.profileLayout}>
            {/* Left Column: Avatar & Summary Card */}
            <div className={styles.avatarCard}>
              <div className={styles.avatarContainer}>
                <img
                  src={getDisplayAvatar()}
                  alt="Profile Avatar"
                  className={styles.avatarImg}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const name = `${firstName} ${lastName}`.trim() || user.email;
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      name
                    )}&background=0d8bd9&color=fff&size=150`;
                  }}
                />
                <button
                  className={styles.avatarEditBtn}
                  onClick={triggerFileSelect}
                  disabled={isUploadingAvatar}
                  title="Upload avatar"
                  id="avatar-upload-trigger"
                >
                  📷
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/png, image/jpeg"
                  onChange={handleAvatarChange}
                />
              </div>

              {isUploadingAvatar && <div className="spinner" style={{ margin: "10px auto" }} />}

              <h2 className={styles.userName}>
                {`${firstName} ${lastName}`.trim() || "User Settings"}
              </h2>


              <div className={styles.providerInfo}>
                Registered Email:<br />
                <strong>{user.email}</strong>
              </div>
            </div>

            {/* Right Column: Edit Forms */}
            <div className={styles.formsContainer}>
              {/* Profile Details Form */}
              <div className={styles.profileCard}>
                <h3 className={styles.cardTitle}>👤 Profile Information</h3>
                <form className={styles.form} onSubmit={handleSaveProfile}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label htmlFor="first-name-input">First Name</label>
                      <input
                        type="text"
                        id="first-name-input"
                        className="input"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jia Liang"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="last-name-input">LastName</label>
                      <input
                        type="text"
                        id="last-name-input"
                        className="input"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Lim"
                      />
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label htmlFor="phone-input">Phone Number</label>
                      <input
                        type="text"
                        id="phone-input"
                        className="input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+6010-856 6500"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="university-input">University / Institution</label>
                      <input
                        type="text"
                        id="university-input"
                        className="input"
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        placeholder="Universiti Sains Malaysia (USM)"
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="bio-input">Professional Biography / Bio</label>
                    <textarea
                      id="bio-input"
                      className="textarea"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Share a short bio about your career path..."
                      rows={4}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="email-input">Email Address</label>
                    <input
                      type="email"
                      id="email-input"
                      className="input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@university.edu.my"
                    />
                  </div>

                  {errorMsg && <div className={styles.errorMsg}>⚠️ {errorMsg}</div>}
                  {successMsg && <div className={styles.successMsg}>✅ {successMsg}</div>}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSavingProfile}
                    id="save-profile-btn"
                  >
                    {isSavingProfile ? <span className="spinner" /> : "Save Profile Details"}
                  </button>
                </form>
              </div>

              {/* Password / Security Form */}
              <div className={styles.profileCard}>
                <h3 className={styles.cardTitle}>
                  {!user.hasPassword
                    ? "🔒 Secure Account with Password"
                    : "🔒 Change Password"}
                </h3>
                <form className={styles.form} onSubmit={handleSaveSecurity}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label htmlFor="new-pass-input">
                        {!user.hasPassword ? "Set Password" : "New Password"}
                      </label>
                      <input
                        type="password"
                        id="new-pass-input"
                        className="input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="confirm-pass-input">Confirm New Password</label>
                      <input
                        type="password"
                        id="confirm-pass-input"
                        className="input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                      />
                    </div>
                  </div>

                  {securityErrorMsg && <div className={styles.errorMsg}>⚠️ {securityErrorMsg}</div>}
                  {securitySuccessMsg && <div className={styles.successMsg}>✅ {securitySuccessMsg}</div>}

                  <button
                    type="submit"
                    className="btn btn-secondary"
                    disabled={isSavingSecurity}
                    id="change-password-btn"
                  >
                    {isSavingSecurity ? (
                      <span className="spinner" />
                    ) : !user.hasPassword ? (
                      "Secure Account with Password"
                    ) : (
                      "Change Account Password"
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
