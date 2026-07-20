"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  type AdminActionResult,
  adminDb,
  authorize,
  writeAudit,
} from "@/lib/actions/admin/core";

const PERMISSION = "cms.manage";

function revalidateCms() {
  revalidatePath("/admin/cms");
  revalidatePath("/blog");
  revalidatePath("/");
}

const announcementSchema = z.object({
  title: z.string().trim().min(3).max(120),
  content: z.string().trim().min(3).max(2000),
  type: z.enum(["promotion", "update", "system"]),
  is_active: z.boolean(),
});

export async function upsertAnnouncementAction(
  input: z.infer<typeof announcementSchema> & { id?: string }
): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const db = adminDb();
  const result = input.id
    ? await db.from("announcements").update(parsed.data).eq("id", input.id)
    : await db.from("announcements").insert(parsed.data);

  if (result.error) return { ok: false, error: result.error.message };

  await writeAudit({
    actorId: auth.staff.userId,
    action: input.id ? "announcement.update" : "announcement.create",
    entityType: "announcement",
    entityId: input.id ?? null,
    after: parsed.data,
  });
  revalidateCms();
  return { ok: true, message: "Announcement saved." };
}

export async function deleteAnnouncementAction(id: string): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const { error } = await adminDb().from("announcements").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await writeAudit({
    actorId: auth.staff.userId,
    action: "announcement.delete",
    entityType: "announcement",
    entityId: id,
  });
  revalidateCms();
  return { ok: true, message: "Announcement deleted." };
}

const blogSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  title: z.string().trim().min(3).max(200),
  excerpt: z.string().trim().max(500).optional().default(""),
  content: z.string().trim().min(3).max(50000),
  cover_image_url: z.string().trim().max(500).optional().default(""),
  is_published: z.boolean(),
  published_at: z.string().trim().optional().default(""),
  seo_title: z.string().trim().max(120).optional().default(""),
  seo_description: z.string().trim().max(300).optional().default(""),
});

export async function upsertBlogPostAction(
  input: z.infer<typeof blogSchema> & { id?: string }
): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = blogSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const payload = {
    slug: parsed.data.slug,
    title: parsed.data.title,
    excerpt: parsed.data.excerpt || "",
    content: parsed.data.content,
    cover_image_url: parsed.data.cover_image_url || null,
    is_published: parsed.data.is_published,
    published_at: parsed.data.is_published
      ? parsed.data.published_at
        ? new Date(parsed.data.published_at).toISOString()
        : new Date().toISOString()
      : null,
    seo_title: parsed.data.seo_title || null,
    seo_description: parsed.data.seo_description || null,
    author_id: auth.staff.userId,
  };

  const db = adminDb();
  const result = input.id
    ? await db.from("blog_posts").update(payload).eq("id", input.id)
    : await db.from("blog_posts").insert(payload);

  if (result.error) return { ok: false, error: result.error.message };

  await writeAudit({
    actorId: auth.staff.userId,
    action: input.id ? "blog_post.update" : "blog_post.create",
    entityType: "blog_post",
    entityId: input.id ?? null,
    after: payload,
  });
  revalidateCms();
  return { ok: true, message: "Blog post saved." };
}

export async function deleteBlogPostAction(id: string): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const { error } = await adminDb().from("blog_posts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  await writeAudit({
    actorId: auth.staff.userId,
    action: "blog_post.delete",
    entityType: "blog_post",
    entityId: id,
  });
  revalidateCms();
  return { ok: true, message: "Blog post deleted." };
}
