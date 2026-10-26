"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DEFAULT_COUNTRY_ISO, PhoneNumberInput, phoneFromParts } from "@/components/auth/phone-number-input";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { submitSignupIdentity } from "@/lib/actions/kyc-actions";
import { compressIdPhoto } from "@/lib/kyc/compress-id-photo";
import { INVALID_PHONE_MESSAGE } from "@/lib/auth/phone";
import { buildAuthCallbackUrl, getEmailAuthOrigin } from "@/lib/auth/callback-url";
import { normalizeEmail, formatAuthErrorMessage } from "@/lib/auth/identifier";
import {
  finalizeRegistrationAfterSignUp,
  isPhoneAvailable,
  signInWithEmailPassword,
} from "@/lib/actions/auth";
import { checkSignupAllowed, linkSignupSecurity } from "@/lib/actions/security";
import { getDeviceId } from "@/lib/security/device-fingerprint";

interface EmailAuthFormProps {
  mode: "login" | "register";
  redirect?: string;
  referralCodeFromUrl?: string | null;
}

function EmailConfirmationNotice({
  email,
  variant,
}: {
  email: string;
  variant: "register" | "login";
}) {
  return (
    <div className="space-y-4 text-center py-2">
      <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
        <Mail className="h-7 w-7 text-[#00E5FF]" />
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">Check your email</p>
        <p className="text-sm text-[#6b6d8f] mt-2">
          We sent a confirmation link to{" "}
          <strong className="text-foreground">{email}</strong>
        </p>
      </div>
      <p className="text-sm text-[#6b6d8f] rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(0, 229, 255,0.1)] p-3 text-left">
        {variant === "register" ? (
          <>
            Your account was created but is <strong className="text-foreground">not active yet</strong>.
            Open the email and click the confirmation link. You&apos;ll be redirected to Casinova Gaming and
            signed in automatically once verified.
          </>
        ) : (
          <>
            Your email is not verified yet. We sent a new confirmation link — click it to verify
            your account and you&apos;ll be signed in automatically.
          </>
        )}
      </p>
      <p className="text-xs text-[#6b6d8f]">
        Open the newest confirmation email and tap the link once. If it expired, use
        Sign In with the same email and password to get a fresh link.
      </p>
      <p className="text-xs text-[#6b6d8f]">Check spam if you don&apos;t see it in 1–2 minutes.</p>
      <Link href="/login" className="inline-block text-sm text-[#00E5FF] hover:underline">
        Go to sign in
      </Link>
    </div>
  );
}

export function EmailAuthForm({ mode, redirect = "/", referralCodeFromUrl }: EmailAuthFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState(referralCodeFromUrl || "");
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      toast.error("Authentication is not configured");
      setLoading(false);
      return;
    }

    if (mode === "login") {
      const normalizedEmail = normalizeEmail(email);
      const result = await signInWithEmailPassword({
        email: normalizedEmail,
        password,
        redirect,
        callbackOrigin: window.location.origin,
      });

      setLoading(false);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (!result.loggedIn) {
        setPendingEmail(result.email);
        setAwaitingConfirmation(true);
        toast.success("Confirmation email sent! Verify your email to continue.");
        return;
      }

      try {
        await supabase.auth.getSession();
        const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
        if (!factorError) {
          const totp = factors?.totp?.find((factor) => factor.status === "verified");
          if (totp) {
            const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (level?.nextLevel === "aal2" && level.currentLevel !== "aal2") {
              setMfaFactorId(totp.id);
              toast.message("Enter the code from your authenticator app.");
              return;
            }
          }
        }
      } catch {
        // Authenticator is optional. A project without MFA still signs in.
      }

      toast.success("Welcome back!");
      router.push(redirect);
      router.refresh();
      return;
    }

    if (!idFile) {
      toast.error("Add a photo of your ID to create an account.");
      setLoading(false);
      return;
    }

    let idPhoto: { name: string; dataUrl: string };
    try {
      idPhoto = await compressIdPhoto(idFile);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that ID photo.");
      setLoading(false);
      return;
    }

    const phone = phoneFromParts(countryIso, phoneLocal);
    if (!phone) {
      toast.error(INVALID_PHONE_MESSAGE);
      setLoading(false);
      return;
    }

    const phoneCheck = await isPhoneAvailable(phone);
    if (!phoneCheck.available) {
      toast.error(phoneCheck.error ?? "This phone number is already registered");
      setLoading(false);
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const deviceId = await getDeviceId();
    const signupCheck = await checkSignupAllowed(deviceId, normalizedEmail);
    if (!signupCheck.allowed) {
      toast.error(signupCheck.error);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const emailRedirectTo = buildAuthCallbackUrl(
      getEmailAuthOrigin(window.location.origin),
      redirect,
      referralCode.trim() || referralCodeFromUrl || undefined
    );

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName.trim(),
          phone,
          referral_code: referralCode.trim() || referralCodeFromUrl || undefined,
          auth_method: "email",
        },
      },
    });

    if (error) {
      setLoading(false);
      console.error("[auth] signUp failed:", error);
      toast.error(formatAuthErrorMessage(error));
      return;
    }

    if (!data.user) {
      setLoading(false);
      toast.error("Could not create account");
      return;
    }

    if (data.user.identities?.length === 0) {
      setLoading(false);
      toast.error("This email is already registered. Go to Sign In instead.");
      return;
    }

    const needsConfirmation = !data.user.email_confirmed_at;

    const identity = await submitSignupIdentity({
      userId: data.user.id,
      email: normalizedEmail,
      documentName: idPhoto.name,
      documentDataUrl: idPhoto.dataUrl,
    });
    if (!identity.ok) {
      toast.error(identity.error || "Account created, but the ID photo was not saved. Upload it under Verify ID after you sign in.");
    }

    if (needsConfirmation) {
      // Do not signOut — it clears PKCE cookies and breaks the confirmation link
      setLoading(false);
      setPendingEmail(normalizedEmail);
      setAwaitingConfirmation(true);
      toast.success("Account created! Check your email and click the link to verify.");
      void finalizeRegistrationAfterSignUp({
        userId: data.user.id,
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone,
        referralCode: referralCode.trim() || referralCodeFromUrl || undefined,
      });
      return;
    }

    let saved = await finalizeRegistrationAfterSignUp({
      userId: data.user.id,
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone,
      referralCode: referralCode.trim() || referralCodeFromUrl || undefined,
    });

    // Browser session fallback if server-side save failed
    if (!saved.ok && data.session) {
      const { data: updated, error: profileError } = await supabase
        .from("profiles")
        .update({
          phone,
          full_name: fullName.trim(),
          email: normalizedEmail,
        })
        .eq("id", data.user.id)
        .select("phone")
        .maybeSingle();

      if (!profileError && updated?.phone) {
        saved = { ok: true };
      }
    }

    if (!saved.ok) {
      setLoading(false);
      toast.error(saved.error ?? "Account created but phone was not saved");
      return;
    }

    await linkSignupSecurity(deviceId);

    setLoading(false);
    toast.success("Account created! Welcome to Casinova Gaming.");
    router.push(redirect);
    router.refresh();
  }

  if (awaitingConfirmation && pendingEmail) {
    return <EmailConfirmationNotice email={pendingEmail} variant={mode} />;
  }

  async function confirmMfa(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase || !mfaFactorId) return;
    setLoading(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
    if (challenge.error || !challenge.data) {
      setLoading(false);
      toast.error(challenge.error?.message || "Could not verify the code.");
      return;
    }
    const verified = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: challenge.data.id,
      code: mfaCode.trim(),
    });
    setLoading(false);
    if (verified.error) {
      toast.error(verified.error.message);
      return;
    }
    toast.success("Welcome back!");
    router.push(redirect);
    router.refresh();
  }

  if (mfaFactorId) {
    return (
      <form onSubmit={confirmMfa} className="space-y-4">
        <Label htmlFor="mfa">Authenticator code</Label>
        <Input
          id="mfa"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={mfaCode}
          onChange={(event) => setMfaCode(event.target.value)}
          placeholder="6-digit code"
          required
        />
        <Button type="submit" className="w-full" disabled={loading || mfaCode.trim().length < 6}>
          {loading ? "Checking..." : "Confirm and sign in"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "login" && <SocialAuthButtons redirect={redirect} referralCode={referralCode} />}
      {mode === "register" && (
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="John Doe"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />
      </div>
      {mode === "register" && (
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <PhoneNumberInput
            id="phone"
            countryIso={countryIso}
            onCountryIsoChange={setCountryIso}
            localNumber={phoneLocal}
            onLocalNumberChange={setPhoneLocal}
            required
          />
          <p className="text-xs text-[#6b6d8f]">
            Select your country, then enter your number without the country code.
          </p>
        </div>
      )}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="password">Password</Label>
          {mode === "login" && (
            <Link
              href="/reset-password"
              className="text-sm text-[#00E5FF] hover:underline font-medium"
            >
              Forgot password?
            </Link>
          )}
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === "register" ? 6 : undefined}
          placeholder={mode === "register" ? "At least 6 characters" : undefined}
        />
      </div>
      {mode === "register" && (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Re-enter your password"
          />
        </div>
      )}
      {mode === "register" && (
        <div className="space-y-2">
          <Label htmlFor="id-photo">Government ID</Label>
          <input
            id="id-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            onChange={(event) => setIdFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-[#6b6d8f] file:mr-3 file:rounded-lg file:border-0 file:bg-[#00E5FF]/15 file:px-3 file:py-2 file:text-[#00E5FF]"
          />
          <p className="text-xs text-[#6b6d8f]">Photo of your ID. Required before the account is created.</p>
        </div>
      )}
      {mode === "register" && (
        <div className="space-y-2">
          <Label htmlFor="referral">Referral Code (optional)</Label>
          <Input
            id="referral"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="Enter referral code"
            readOnly={!!referralCodeFromUrl}
          />
        </div>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? mode === "login"
            ? "Signing in..."
            : "Creating account..."
          : mode === "login"
            ? "Sign In"
            : "Create Account"}
      </Button>
      {mode === "register" && (
        <p className="text-xs text-[#6b6d8f] text-center">
          After Create Account, check your inbox and click the confirmation link to sign in.
        </p>
      )}
      {mode === "login" && (
        <p className="text-xs text-[#6b6d8f] text-center">
          Sign in with the email and password you registered with.
        </p>
      )}
    </form>
  );
}
