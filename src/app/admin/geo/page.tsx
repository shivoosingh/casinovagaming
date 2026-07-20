import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminSqlRequiredNotice } from "@/components/admin/admin-sql-required-notice";
import { GeoPanel } from "@/components/admin/geo-panel";
import { adminDb, isMissingRelation } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Geo Pages" };
export const dynamic = "force-dynamic";

export default async function AdminGeoPage() {
  await requirePermission("cms.manage");
  const db = adminDb();

  const [{ data: states, error: statesError }, { data: cities, error: citiesError }] = await Promise.all([
    db
      .from("geo_states")
      .select("id, slug, name, abbr, hero_lede, meta_description, sort_order, is_active")
      .order("sort_order", { ascending: true }),
    db
      .from("geo_cities")
      .select("id, state_id, slug, name, description_snippet, sort_order, is_active")
      .order("sort_order", { ascending: true }),
  ]);

  const missing = isMissingRelation(statesError) || isMissingRelation(citiesError);
  if ((statesError && !isMissingRelation(statesError)) || (citiesError && !isMissingRelation(citiesError))) {
    throw new Error(statesError?.message ?? citiesError?.message ?? "Failed to load geo pages");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Geo Pages"
        description="State and city landing pages, managed as data instead of hardcoded content."
      />

      {missing ? (
        <AdminSqlRequiredNotice title="Geo pages need the Phase 2 admin SQL" />
      ) : (
        <GeoPanel states={states ?? []} cities={cities ?? []} />
      )}
    </div>
  );
}
