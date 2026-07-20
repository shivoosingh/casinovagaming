"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { LogIn } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  useEffect(() => {
    if (searchParams.get("verified") === "1") toast.success("Email verified! You are signed in.");
    if (searchParams.get("error") === "auth_callback_failed") toast.error("Confirmation link expired or already used. Register again or sign in.");
    if (searchParams.get("error") === "email_not_confirmed") toast.error("Please confirm your email before accessing your account.");
  }, [searchParams]);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0, 229, 255,0.2)", boxShadow: "0 0 40px rgba(0, 229, 255,0.08), inset 0 1px 0 rgba(0, 229, 255,0.06)" }}>
      {/* Neon top accent */}
      <div className="h-[2px] bg-gradient-to-r from-[#ff2d78] via-[#00E5FF] to-[#ffd700]" />

      <div className="bg-[#0a0a1e] p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0, 229, 255,0.08)] border border-[rgba(0, 229, 255,0.2)] flex items-center justify-center" style={{ boxShadow: "0 0 10px rgba(0, 229, 255,0.2)" }}>
            <LogIn className="h-5 w-5 text-[#00E5FF]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Welcome Back</h1>
            <p className="text-sm text-[#6b6d8f]">Sign in to your account</p>
          </div>
        </div>

        <EmailAuthForm mode="login" redirect={redirect} />

        <div className="mt-6 pt-5 border-t border-[rgba(0, 229, 255,0.08)] space-y-3 text-center">
          <p className="text-sm text-[#6b6d8f]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#00E5FF] hover:text-white font-bold transition-colors">Register free</Link>
          </p>
          <Link href="/reset-password" className="text-xs text-[#6b6d8f] hover:text-[#00E5FF] transition-colors">
            Forgot your password?
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-[#6b6d8f]">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
