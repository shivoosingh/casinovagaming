/**
 * Which geo landing pages (/[state]) may be indexed.
 *
 * All state pages are bulk-generated from a template and imply state-level
 * availability, which is both a doorway-page pattern and a legal risk
 * (docs/growth-system.md section 7). They stay live for visitors but carry
 * noindex,follow until a state gets real local copy and a legal review.
 * Add a slug here to re-enable indexing for that state. City pages are never indexed.
 */
export const INDEXABLE_GEO_STATES: ReadonlySet<string> = new Set<string>([]);

export function isGeoStateIndexable(stateSlug: string): boolean {
  return INDEXABLE_GEO_STATES.has(stateSlug);
}
