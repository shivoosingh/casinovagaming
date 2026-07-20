"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_COUNTRY_ISO,
  PhoneNumberInput,
  phoneFromParts,
} from "@/components/auth/phone-number-input";
import { INVALID_PHONE_MESSAGE } from "@/lib/auth/phone";
import { saveUserContactInfo } from "@/lib/actions/auth";
import { toast } from "sonner";

interface CompleteProfilePromptProps {
  email: string;
  fullName?: string | null;
}

export function CompleteProfilePrompt({ email, fullName }: CompleteProfilePromptProps) {
  const router = useRouter();
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const phone = phoneFromParts(countryIso, phoneLocal);
    if (!phone) {
      toast.error(INVALID_PHONE_MESSAGE);
      return;
    }

    setLoading(true);
    const result = await saveUserContactInfo(phone, fullName?.trim() || "", email);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error ?? "Could not save phone number");
      return;
    }

    toast.success("Phone number saved!");
    router.refresh();
  }

  return (
    <div className="mb-6 rounded-xl border border-[rgba(0, 229, 255,0.2)] bg-[rgba(0, 229, 255,0.08)] p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[rgba(0, 229, 255,0.12)] flex items-center justify-center shrink-0">
          <Phone className="h-5 w-5 text-[#00E5FF]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">Add your phone number</p>
          <p className="text-sm text-[#6b6d8f] mt-0.5">
            Required for support and account recovery. Email on file: <strong>{email}</strong>
          </p>
          <form onSubmit={handleSubmit} className="mt-3 flex flex-col sm:flex-row gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="complete-phone" className="sr-only">
                Phone number
              </Label>
              <PhoneNumberInput
                id="complete-phone"
                countryIso={countryIso}
                onCountryIsoChange={setCountryIso}
                localNumber={phoneLocal}
                onLocalNumberChange={setPhoneLocal}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="shrink-0">
              {loading ? "Saving..." : "Save phone"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
