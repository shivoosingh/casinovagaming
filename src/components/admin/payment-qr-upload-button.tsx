"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadPaymentQrAction } from "@/lib/actions/admin/payments";

export function PaymentQrUploadButton({ methodId }: { methodId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const fd = new FormData();
    fd.set("file", file);
    fd.set("methodId", methodId);

    setBusy(true);
    startTransition(async () => {
      const res = await uploadPaymentQrAction(fd);
      setBusy(false);
      if (!res.ok) {
        toast.error(res.error || "Upload failed");
        return;
      }
      toast.success("QR image updated — live on the website now");
      router.refresh();
    });
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending || busy}
        className="border-violet-400/40 text-violet-200"
        onClick={() => inputRef.current?.click()}
      >
        {pending || busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Upload QR
      </Button>
    </>
  );
}
