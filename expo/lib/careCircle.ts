/**
 * Care Circle rules — pure, dependency-free, testable in bun. Mirrors the
 * server-side canon in supabase/migrations/0024_shared_care.sql: the DATABASE
 * enforces access (RLS + SECURITY DEFINER RPCs); this module only drives UI
 * gating and input hygiene, it is never the security boundary.
 */

export type CareRole = "owner" | "co_owner" | "caregiver" | "viewer";

export type MemberStatus = "active" | "revoked" | "expired";

/** Canonical per-section share toggle keys (must match the migration). */
export const SECTION_KEYS = [
  "care_protocol",
  "feeding_plan",
  "medication_details",
  "vet_emergency_contacts",
  "medical_history",
  "symptom_photos",
  "wearable_vitals",
  "activity_history",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export type SharedSections = Record<SectionKey, boolean>;

/** Caregiver defaults per spec: protocol/feeding/meds/emergency on, rest off. */
export const DEFAULT_SHARED_SECTIONS: SharedSections = {
  care_protocol: true,
  feeding_plan: true,
  medication_details: true,
  vet_emergency_contacts: true,
  medical_history: false,
  symptom_photos: false,
  wearable_vitals: false,
  activity_history: false,
};

/** Owner-facing labels for the share screen + the sitter's join screen. */
export const SECTION_LABELS: Record<SectionKey, { label: string; note: string }> = {
  care_protocol: { label: "Care protocol & tasks", note: "Meds, feeding and walk checklist with tap-to-check-off" },
  feeding_plan: { label: "Feeding & nutrition plan", note: "Portions, treats allowed, food brand" },
  medication_details: { label: "Medication details", note: "Dose, timing and instructions" },
  vet_emergency_contacts: { label: "Vet & emergency info", note: "Conditions, allergies and the emergency card" },
  medical_history: { label: "Medical history", note: "Vaccines, past visits and records" },
  symptom_photos: { label: "Symptom-photo archive", note: "Poop/skin/ear scan history" },
  wearable_vitals: { label: "Wearable & vitals data", note: "Coming later — reserved" },
  activity_history: { label: "Activity & notes history", note: "Timeline and what other caregivers logged" },
};

/**
 * Client-side mirror of private.normalize_shared_sections: unknown keys throw,
 * missing keys fall back to defaults. Keeps the share-screen state honest
 * before it ever reaches the server (which validates again).
 */
export function normalizeSharedSections(partial?: Partial<Record<string, boolean>> | null): SharedSections {
  const result: SharedSections = { ...DEFAULT_SHARED_SECTIONS };
  if (!partial) return result;
  for (const [key, value] of Object.entries(partial)) {
    if (!(SECTION_KEYS as readonly string[]).includes(key)) {
      throw new Error(`Unknown section key: ${key}`);
    }
    if (typeof value !== "boolean") {
      throw new Error(`Section ${key} must be true or false`);
    }
    result[key as SectionKey] = value;
  }
  return result;
}

// ── Invite codes ─────────────────────────────────────────────────────────────
// Must match the server generator: 8 chars, ambiguous glyphs excluded
// (no 0/O, 1/I/L) so a code read aloud or hand-typed survives the trip.
export const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 8;

/** Uppercase and strip separators ("cvf6-w96d" → "CVF6W96D"). */
export function normalizeInviteCode(raw: string): string {
  return (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidInviteCode(raw: string): boolean {
  const code = normalizeInviteCode(raw);
  if (code.length !== INVITE_CODE_LENGTH) return false;
  return [...code].every((ch) => INVITE_CODE_ALPHABET.includes(ch));
}

// ── Membership + capability rules (UI gating only; RLS is authoritative) ─────

export interface MembershipLike {
  status: MemberStatus | string;
  expiresAt: string | null;
}

/** Active and unexpired — the same predicate RLS enforces server-side. */
export function isMembershipActive(m: MembershipLike, now: Date = new Date()): boolean {
  if (m.status !== "active") return false;
  if (!m.expiresAt) return true;
  return new Date(m.expiresAt).getTime() > now.getTime();
}

/** Owners/co-owners bypass toggles; caregivers/viewers need the section on. */
export function canSeeSection(role: CareRole, sections: SharedSections, key: SectionKey): boolean {
  if (role === "owner" || role === "co_owner") return true;
  return sections[key] === true;
}

/** Viewers never log care, regardless of toggles. */
export function canLogCare(role: CareRole, sections: SharedSections): boolean {
  if (role === "owner" || role === "co_owner") return true;
  return role === "caregiver" && sections.care_protocol === true;
}

/** Invites, revokes and toggle edits are owner-only. */
export function canManageCircle(role: CareRole): boolean {
  return role === "owner";
}
