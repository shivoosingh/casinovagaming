import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * On-demand revalidation for content inserted outside the app (SQL batches).
 *
 *   curl -X POST https://casinovasgaming.com/api/revalidate \
 *     -H "x-revalidate-secret: $REVALIDATE_SECRET" \
 *     -H "content-type: application/json" \
 *     -d '{"paths":["/blog/how-to-redeem-winnings-fast"]}'
 *
 * Always refreshes /blog, /sitemap.xml and / in addition to the paths given.
 * Set REVALIDATE_SECRET in the environment; the route is disabled without it.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "REVALIDATE_SECRET is not configured" }, { status: 503 });
  }
  if (request.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let paths: string[] = [];
  try {
    const body = (await request.json()) as { paths?: unknown };
    if (Array.isArray(body.paths)) {
      paths = body.paths.filter((p): p is string => typeof p === "string" && p.startsWith("/") && p.length < 200);
    }
  } catch {
    // empty body is fine: refresh the standard set
  }

  const all = Array.from(new Set(["/", "/blog", "/sitemap.xml", ...paths]));
  for (const p of all) revalidatePath(p);
  return NextResponse.json({ revalidated: all, at: new Date().toISOString() });
}
