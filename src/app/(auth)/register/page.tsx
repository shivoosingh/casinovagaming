"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { UserPlus } from "lucide-react";

function RegisterForm() {
  const searchParams = useSearchParams();
  const refFromUrl = searchParams.get("ref");

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0, 229, 255,0.2)", boxShadow: "0 0 40px rgba(0, 229, 255,0.08), inset 0 1px 0 rgba(0, 229, 255,0.06)" }}>
      <div className="h-[2px] bg-gradient-to-r from-[#ff2d78] via-[#00E5FF] to-[#ffd700]" />

      <div className="bg-[#0a0a1e] p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[rgba(255, 45, 120,0.08)] border border-[rgba(255, 45, 120,0.2)] flex items-center justify-center" style={{ boxShadow: "0 0 10px rgba(255, 45, 120,0.2)" }}>
            <UserPlus className="h-5 w-5 text-[#ff2d78]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Create Account</h1>
            <p className="text-sm text-[#6b6d8f]">Join Casinova Gaming free</p>
          </div>
        </div>

        <EmailAuthForm mode="register" redirect="/" referralCodeFromUrl={refFromUrl} />

        <div className="mt-6 pt-5 border-t border-[rgba(0, 229, 255,0.08)] text-center">
          <p className="text-sm text-[#6b6d8f]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#00E5FF] hover:text-white font-bold transition-colors">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="text-center text-[#6b6d8f]">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
