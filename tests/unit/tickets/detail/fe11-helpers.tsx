/**
 * FE-11 test helpers: merges `src/i18n/pending/fe-11.json` into the shared
 * detail test catalogs (FE-INT merges it into en/ka later), a settable user
 * profile, and activity fixtures.
 */
import { vi } from "vitest";
// fe-11 keys are merged into en/ka (W3 FE-INT); kept as an empty overlay.
const pending = { en: {}, ka: {} };
import type { ActivityComment, ActivityEvent } from "@/app/(tenant)/tickets/_lib/types";
import { messages } from "./helpers";

type Json = Record<string, unknown>;

function mergeInto(base: Json, extra: Json) {
  for (const [k, v] of Object.entries(extra)) {
    const cur = base[k];
    if (v && typeof v === "object" && !Array.isArray(v) && cur && typeof cur === "object") mergeInto(cur as Json, v as Json);
    else base[k] = v;
  }
}

mergeInto(messages.en, (pending as { en: Json }).en);
mergeInto(messages.ka, (pending as { ka: Json }).ka);

export const profileState = {
  profile: {
    id: 1,
    email: "admin@demo.ge",
    first_name: "Nino",
    last_name: "Beridze",
    is_staff: true,
    is_superuser: false,
    feature_keys: ["social_integrations", "ticket_management"],
  } as Record<string, unknown>,
};

export const STAFF = { ...profileState.profile };
export const AGENT = {
  id: 2,
  email: "agent@demo.ge",
  first_name: "Levan",
  last_name: "Maisuradze",
  is_staff: false,
  is_superuser: false,
  feature_keys: ["ticket_management"],
};

export function setProfile(p: Record<string, unknown>) {
  profileState.profile = p;
}

export const profileMock = {
  useUserProfile: () => ({ data: profileState.profile, isLoading: false }),
};

export const toastMock = { success: vi.fn(), error: vi.fn(), info: vi.fn() };

export const USERS = [
  { id: 1, email: "admin@demo.ge", first_name: "Nino", last_name: "Beridze", is_staff: true, is_active: true },
  { id: 2, email: "agent@demo.ge", first_name: "Levan", last_name: "Maisuradze", is_staff: false, is_active: true },
  { id: 3, email: "giorgi@demo.ge", first_name: "Giorgi", last_name: "Kapanadze", is_staff: false, is_active: true },
];

export function comment(over: Partial<ActivityComment> = {}): ActivityComment {
  return {
    type: "comment",
    kind: "comment",
    id: "comment-1",
    comment_id: 1,
    text: "Reproduced on the Magti trunk.",
    created_at: "2026-11-08T08:00:00Z",
    user: { id: 2, name: "Levan Maisuradze", email: "agent@demo.ge", initials: "LM" },
    is_internal: true,
    edited: false,
    ...over,
  };
}

export function event(over: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    type: "event",
    kind: "history",
    id: "event-1",
    action: "created",
    field_name: "",
    old_value: "",
    new_value: "Calls dropping",
    description: "Created",
    created_at: "2026-11-05T09:12:00Z",
    user: { id: 1, name: "Nino Beridze", email: "admin@demo.ge", initials: "NB" },
    ...over,
  };
}
