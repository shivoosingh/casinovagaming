"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, Loader2, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteNewsletterCampaignAction,
  generatePromoCampaignAction,
  sendNewsletterCampaignAction,
  upsertNewsletterCampaignAction,
} from "@/lib/actions/admin/newsletters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createVariation,
  displayName,
  FOLDERS,
  folderById,
  matchesPlace,
  placeOf,
  suggestions,
  type PromoPlace,
} from "@/lib/email/promo-catalog";
import { cn } from "@/lib/utils";

const CARD = "rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] backdrop-blur-xl";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-300",
  scheduled: "bg-blue-500/15 text-blue-300",
  sending: "bg-amber-500/15 text-amber-300",
  sent: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-red-500/15 text-red-300",
};

export type NewsletterCampaignRow = {
  id: string;
  name: string;
  subject: string;
  heading: string;
  body: string;
  cta_label: string;
  cta_href: string;
  segment: "all" | "test";
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  sent_count: number;
  total_recipients: number;
};

type FormState = Omit<NewsletterCampaignRow, "id" | "status" | "sent_count" | "total_recipients"> & { id?: string };

function emptyForm(): FormState {
  return { name: "", subject: "", heading: "", body: "", cta_label: "Deposit now", cta_href: "/dashboard/deposit", segment: "all" };
}

function splitBanner(body: string): { image: string | null; text: string } {
  const match = body.match(/^\{\{image:([^}]+)\}\}\s*/);
  if (!match) return { image: null, text: body };
  return { image: match[1].trim(), text: body.slice(match[0].length).trim() };
}

function CampaignForm({
  initial,
  playersDone,
  onDone,
}: {
  initial: FormState;
  playersDone: boolean;
  onDone: () => void;
}) {
  const banner = splitBanner(initial.body);
  const [image] = useState(banner.image);
  const [form, setForm] = useState({ ...initial, body: banner.text });
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = image ? `{{image:${image}}}\n${form.body}` : form.body;
    startTransition(async () => {
      const result = await upsertNewsletterCampaignAction({
        id: form.id,
        name: form.name,
        subject: form.subject,
        heading: form.heading,
        body,
        cta_label: form.cta_label,
        cta_href: form.cta_href,
        segment: form.segment,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Saved");
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className={cn(CARD, "space-y-4 p-5")}>
      <p className="font-semibold text-white">{form.id ? "Edit campaign" : "New campaign"}</p>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="w-full max-w-md rounded-xl" />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nl-name">Internal name</Label>
          <Input id="nl-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nl-subject">Subject</Label>
          <Input id="nl-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="nl-heading">Heading</Label>
        <Input id="nl-heading" value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nl-body">Body</Label>
        <Textarea id="nl-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="nl-cta-label">CTA label</Label>
          <Input id="nl-cta-label" value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nl-cta-href">CTA link</Label>
          <Input id="nl-cta-href" value={form.cta_href} onChange={(e) => setForm({ ...form, cta_href: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nl-segment">Segment</Label>
          <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v as FormState["segment"] })}>
            <SelectTrigger id="nl-segment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="test">Test (staff only)</SelectItem>
              <SelectItem value="all">All players</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save campaign"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        {form.id ? <SendButtons id={form.id} playersDone={playersDone} /> : null}
      </div>
      <p className="text-xs text-slate-400">
        {form.id
          ? "Save edits before you send. Staff is a test to admin emails. Players emails everyone."
          : "Save this variation, then send it. Staff is the test. Players emails everyone."}
      </p>
    </form>
  );
}

function SendButtons({ id, playersDone }: { id: string; playersDone: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function send(audience: "staff" | "players") {
    const message =
      audience === "staff"
        ? "Send this promo only to staff, so you can check it in your admin email?"
        : "Email this promotion to every player?";
    if (!window.confirm(message)) return;
    startTransition(async () => {
      const result = await sendNewsletterCampaignAction(id, audience);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(result.message ?? "Sent");
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => send("staff")} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Staff
      </Button>
      <Button size="sm" onClick={() => send("players")} disabled={playersDone || pending}>
        Players
      </Button>
    </>
  );
}

export function NewslettersPanel({ campaigns }: { campaigns: NewsletterCampaignRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [playersDone, setPlayersDone] = useState(false);
  const [place, setPlace] = useState<PromoPlace | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const suggested = useMemo(() => suggestions(new Date()), []);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const campaign of campaigns) {
      const found = placeOf(campaign);
      map.set(found.folder, (map.get(found.folder) ?? 0) + 1);
      if (found.sub) {
        const key = `${found.folder}/${found.sub}`;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return map;
  }, [campaigns]);

  function refresh() {
    setEditing(null);
    router.refresh();
  }

  function openCampaign(campaign: NewsletterCampaignRow) {
    setPlayersDone(campaign.status === "sent");
    setEditing({ ...campaign });
  }

  function vary(campaign: NewsletterCampaignRow) {
    const next = createVariation(campaign, campaigns);
    if (!next) {
      toast.error("Every fresh line for this folder is already in the list.");
      return;
    }
    setPlayersDone(false);
    setEditing(next);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this campaign?")) return;
    setDeletingId(id);
    const result = await deleteNewsletterCampaignAction(id);
    setDeletingId(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(result.message ?? "Deleted");
      router.refresh();
    }
  }

  const folder = place ? folderById(place.folder) : undefined;
  const showChildren = Boolean(folder?.children?.length && place && !place.sub && !place.night);
  const visible = place ? campaigns.filter((campaign) => matchesPlace(campaign, place.sub || place.night ? place : { folder: place.folder })) : [];
  const loose = showChildren
    ? campaigns.filter((campaign) => {
        const found = placeOf(campaign);
        return found.folder === place?.folder && !found.sub;
      })
    : [];

  function goBack() {
    if (!place) return;
    if (place.night || place.sub) setPlace({ folder: place.folder });
    else setPlace(null);
  }

  const placeLabel = place?.night
    ? `${folder?.label ?? "Folder"} night`
    : place?.sub
      ? folder?.children?.find((child) => child.id === place.sub)?.label ?? "Promos"
      : folder?.label;

  return (
    <div className="space-y-4">
      {editing ? (
        <CampaignForm initial={editing} playersDone={playersDone} onDone={refresh} />
      ) : (
        <>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              disabled={generating}
              onClick={() => {
                setGenerating(true);
                void generatePromoCampaignAction().then((result) => {
                  setGenerating(false);
                  if (!result.ok) toast.error(result.error);
                  else {
                    toast.success(result.message ?? "Promo ready");
                    router.refresh();
                  }
                });
              }}
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate promo
            </Button>
            <Button
              onClick={() => {
                setPlayersDone(false);
                setEditing(emptyForm());
              }}
            >
              <Plus className="h-4 w-4" /> New campaign
            </Button>
          </div>

          {!place ? (
            <div className="space-y-3">
              <div>
                <p className="mb-2 text-sm text-slate-300">Suggested for today</p>
                <div className="flex flex-wrap gap-2">
                  {suggested.map((item) => (
                    <Button key={item.key} variant="outline" size="sm" onClick={() => setPlace(item.place)}>
                      {item.emoji} {item.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {FOLDERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPlace({ folder: item.id })}
                    className={cn(CARD, "flex items-center justify-between px-4 py-3 text-left hover:border-violet-300/50")}
                  >
                    <span className="font-medium text-white">
                      {item.emoji} {item.label}
                    </span>
                    <span className="text-xs text-slate-400">{counts.get(item.id) ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Button variant="ghost" size="sm" onClick={goBack}>
                <ChevronLeft className="h-4 w-4" /> {place.sub || place.night ? folder?.label : "All folders"}
              </Button>
              <p className="font-semibold text-white">{placeLabel}</p>
              {showChildren ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {folder?.children?.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setPlace({ folder: place.folder, sub: child.id })}
                      className={cn(CARD, "flex items-center justify-between px-4 py-3 text-left hover:border-violet-300/50")}
                    >
                      <span className="font-medium text-white">
                        {child.emoji} {child.label}
                      </span>
                      <span className="text-xs text-slate-400">{counts.get(`${place.folder}/${child.id}`) ?? 0}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <PromoList
                  campaigns={visible}
                  deletingId={deletingId}
                  onUse={openCampaign}
                  onVary={vary}
                  onRemove={remove}
                  emptyLabel="No promos in this folder yet."
                />
              )}
              {showChildren && loose.length > 0 ? (
                <PromoList
                  campaigns={loose}
                  deletingId={deletingId}
                  onUse={openCampaign}
                  onVary={vary}
                  onRemove={remove}
                  emptyLabel=""
                />
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PromoList({
  campaigns,
  deletingId,
  onUse,
  onVary,
  onRemove,
  emptyLabel,
}: {
  campaigns: NewsletterCampaignRow[];
  deletingId: string | null;
  onUse: (campaign: NewsletterCampaignRow) => void;
  onVary: (campaign: NewsletterCampaignRow) => void;
  onRemove: (id: string) => void;
  emptyLabel: string;
}) {
  if (campaigns.length === 0) {
    return <p className={cn(CARD, "p-6 text-center text-sm text-slate-400")}>{emptyLabel}</p>;
  }

  return (
    <div className={cn(CARD, "divide-y divide-white/[0.04]")}>
      {campaigns.map((campaign) => (
        <div key={campaign.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            {splitBanner(campaign.body).image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={splitBanner(campaign.body).image!} alt="" className="h-16 w-28 shrink-0 rounded-lg object-cover" />
            ) : null}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-white">{displayName(campaign.name)}</p>
                <Badge className={STATUS_BADGE[campaign.status] ?? "bg-slate-500/15"}>{campaign.status}</Badge>
              </div>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{campaign.subject}</p>
              {campaign.status === "sent" ? (
                <p className="mt-1 text-xs text-slate-500">
                  Sent to {campaign.sent_count} of {campaign.total_recipients}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onUse(campaign)} disabled={campaign.status === "sent"}>
              Use
            </Button>
            <Button size="sm" variant="outline" onClick={() => onVary(campaign)}>
              Variation
            </Button>
            <SendButtons id={campaign.id} playersDone={campaign.status === "sent"} />
            <Button variant="ghost" size="sm" onClick={() => onRemove(campaign.id)} disabled={deletingId === campaign.id}>
              {deletingId === campaign.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-400" />}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
