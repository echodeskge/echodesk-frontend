/**
 * Pure URL ↔ store-slice translators for the /messages-beta filters.
 *
 * Lives outside React so it's unit-testable without DOM mocks. The
 * MessagesChatBeta orchestrator wires these up to window.location +
 * pushState + the popstate event.
 *
 * Mapping (intentionally a tiny subset of URL params — enough to share
 * + bookmark a view, not a full state mirror):
 *
 *   ?tab=assigned        ↔ assignmentTab
 *   ?view=history        ↔ showArchived === true
 *   ?platform=facebook   ↔ platformFilter
 *
 * Defaults (tab=all, view=active, no platform) are NOT serialised so
 * the URL stays clean for the most common view.
 */
import type { AssignmentTab, BetaPlatform } from "./store/types";

export interface UrlFiltersSnapshot {
  assignmentTab: AssignmentTab;
  showArchived: boolean;
  platformFilter: BetaPlatform | null;
}

const BETA_PLATFORMS: ReadonlySet<BetaPlatform> = new Set([
  "facebook",
  "instagram",
  "whatsapp",
  "email",
  "widget",
]);

/**
 * Parse a query string into a filters snapshot. Unknown / malformed
 * values fall back to the corresponding default so a malformed share
 * link doesn't lock the page into a busted state.
 */
export function readFiltersFromSearch(search: string): UrlFiltersSnapshot {
  const params = new URLSearchParams(search);
  const tabRaw = params.get("tab");
  const viewRaw = params.get("view");
  const platformRaw = params.get("platform");

  return {
    assignmentTab: tabRaw === "assigned" ? "assigned" : "all",
    showArchived: viewRaw === "history",
    platformFilter:
      platformRaw && BETA_PLATFORMS.has(platformRaw as BetaPlatform)
        ? (platformRaw as BetaPlatform)
        : null,
  };
}

/**
 * Project a filters snapshot back onto the existing query string,
 * preserving any unrelated params (id catch-all, future ?account, etc).
 * Returns the new search string WITHOUT the leading `?` — pass to
 * pushState as `?${...}` (or "" when empty).
 */
export function writeFiltersToSearch(
  currentSearch: string,
  next: UrlFiltersSnapshot
): string {
  const params = new URLSearchParams(currentSearch);

  if (next.assignmentTab === "assigned") {
    params.set("tab", "assigned");
  } else {
    params.delete("tab");
  }

  if (next.showArchived) {
    params.set("view", "history");
  } else {
    params.delete("view");
  }

  if (next.platformFilter) {
    params.set("platform", next.platformFilter);
  } else {
    params.delete("platform");
  }

  return params.toString();
}

/** True when two snapshots would produce the same URL. */
export function snapshotsEqual(a: UrlFiltersSnapshot, b: UrlFiltersSnapshot): boolean {
  return (
    a.assignmentTab === b.assignmentTab &&
    a.showArchived === b.showArchived &&
    a.platformFilter === b.platformFilter
  );
}
