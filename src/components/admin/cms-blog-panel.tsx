"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteBlogPostAction,
  upsertBlogPostAction,
} from "@/lib/actions/admin/cms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CARD =
  "rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] backdrop-blur-xl";

export type AdminBlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  is_published: boolean;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  cover_image_url: string | null;
};

function emptyForm(): Omit<AdminBlogPostRow, "id"> & { id?: string } {
  return {
    slug: "",
    title: "",
    excerpt: "",
    content: "",
    is_published: false,
    published_at: null,
    seo_title: "",
    seo_description: "",
    cover_image_url: "",
  };
}

function BlogForm({
  initial,
  onDone,
}: {
  initial: Omit<AdminBlogPostRow, "id"> & { id?: string };
  onDone: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await upsertBlogPostAction({
        id: form.id,
        slug: form.slug,
        title: form.title,
        excerpt: form.excerpt,
        content: form.content,
        cover_image_url: form.cover_image_url ?? "",
        is_published: form.is_published,
        published_at: form.published_at ?? "",
        seo_title: form.seo_title ?? "",
        seo_description: form.seo_description ?? "",
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
      <p className="font-semibold text-white">{form.id ? "Edit post" : "New blog post"}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="blog-title">Title</Label>
          <Input
            id="blog-title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="blog-slug">Slug</Label>
          <Input
            id="blog-slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="my-post-slug"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="blog-excerpt">Excerpt</Label>
        <Textarea
          id="blog-excerpt"
          value={form.excerpt}
          onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="blog-content">Content (HTML)</Label>
        <Textarea
          id="blog-content"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={8}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="blog-cover">Cover image URL</Label>
          <Input
            id="blog-cover"
            value={form.cover_image_url ?? ""}
            onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="blog-seo-title">SEO title</Label>
          <Input
            id="blog-seo-title"
            value={form.seo_title ?? ""}
            onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="blog-seo-desc">SEO description</Label>
        <Textarea
          id="blog-seo-desc"
          value={form.seo_description ?? ""}
          onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
          rows={2}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-400">
        <input
          type="checkbox"
          checked={form.is_published}
          onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
          className="rounded border-border"
        />
        Published (visible on /blog)
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save post"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function CmsBlogPanel({ posts }: { posts: AdminBlogPostRow[] }) {
  const router = useRouter();
  type EditState = Omit<AdminBlogPostRow, "id"> & { id?: string };
  const [editing, setEditing] = useState<EditState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refresh() {
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this blog post?")) return;
    setDeletingId(id);
    const result = await deleteBlogPostAction(id);
    setDeletingId(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(result.message ?? "Deleted");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {!editing ? (
        <div className="flex justify-end">
          <Button onClick={() => setEditing(emptyForm())}>New post</Button>
        </div>
      ) : (
        <BlogForm initial={editing} onDone={refresh} />
      )}

      <div className={cn(CARD, "divide-y divide-white/[0.04]")}>
        {posts.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">No blog posts yet.</p>
        ) : (
          posts.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{p.title}</p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      p.is_published
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-slate-500/15 text-slate-400"
                    )}
                  >
                    {p.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{p.excerpt}</p>
                <p className="mt-1 text-xs text-slate-500">/blog/{p.slug}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing({ ...p })}
                  disabled={Boolean(editing)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(p.id)}
                  disabled={deletingId === p.id}
                >
                  {deletingId === p.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-red-400" />
                  )}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
