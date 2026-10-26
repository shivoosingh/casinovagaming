"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { getPlayerKYCStatus, submitKYCDocument } from "@/lib/actions/kyc-actions";
import { compressIdPhoto } from "@/lib/kyc/compress-id-photo";

function statusLabel(status: string) {
  if (status === "approved" || status === "verified") return "Approved";
  if (status === "pending") return "In review";
  if (status === "rejected") return "Rejected";
  return "Not submitted";
}

export function KycPageClient({ initialStatus }: { initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);
  const approved = status === "approved" || status === "verified";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get("document");
    if (!(file instanceof File) || file.size === 0) {
      toast.error("Choose a photo of your ID.");
      return;
    }

    setPending(true);
    try {
      const photo = await compressIdPhoto(file);
      const result = await submitKYCDocument({
        documentName: photo.name,
        documentDataUrl: photo.dataUrl,
      });
      if (!result.ok) {
        toast.error(result.error || "Could not submit your ID.");
        return;
      }
      toast.success("ID submitted. Redeem stays locked until we approve it.");
      setStatus(await getPlayerKYCStatus());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit your ID.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <DashboardPageHeader
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-emerald-400" /> Verify ID
          </span>
        }
        description="Upload a government ID. Redeem stays locked until it is approved."
      />

      <div className="max-w-lg rounded-2xl border border-white/10 bg-[#0d0d1f] p-6">
        <p className="text-sm text-[#6b6d8f]">
          Status: <span className="font-semibold text-[#f0f0f5]">{statusLabel(status)}</span>
        </p>
        {approved ? (
          <p className="mt-4 text-sm text-emerald-300">Your ID is approved. You can redeem.</p>
        ) : (
          <form onSubmit={(event) => void onSubmit(event)} className="mt-5 space-y-4">
            <label className="block text-sm text-[#f0f0f5]">
              Photo of your ID
              <input
                name="document"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                className="mt-2 block w-full text-sm text-[#6b6d8f] file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-500/15 file:px-3 file:py-2 file:text-emerald-200"
              />
            </label>
            <Button type="submit" disabled={pending}>
              {pending ? "Uploading…" : status === "rejected" ? "Upload a new photo" : "Submit ID"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
