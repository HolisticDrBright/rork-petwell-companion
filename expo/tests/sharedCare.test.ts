/**
 * Shared Care Access (Care Circle) tests — pure rules + migration invariants.
 * The authoritative access control is server-side RLS (verified live with SQL
 * probes); these tests keep the client rules module honest and pin the
 * migration's security-critical properties so they can't silently regress.
 *
 * Run: bun tests/sharedCare.test.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_SHARED_SECTIONS,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  SECTION_KEYS,
  SECTION_LABELS,
  canLogCare,
  canManageCircle,
  canSeeSection,
  isMembershipActive,
  isValidInviteCode,
  normalizeInviteCode,
  normalizeSharedSections,
} from "../lib/careCircle";

let pass = 0,
  fail = 0;
const ck = (n: string, c: boolean, x = "") => {
  if (c) pass++;
  else fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${n}${x ? " — " + x : ""}`);
};

const migration = readFileSync(
  join(__dirname, "..", "..", "supabase", "migrations", "0024_shared_care.sql"),
  "utf8",
);

// ── 1. Canonical section keys stay in lockstep with the migration ────────────
ck("1 eight canonical keys", SECTION_KEYS.length === 8);
ck(
  "1 every key appears in the migration",
  SECTION_KEYS.every((k) => migration.includes(`"${k}"`)),
);
ck(
  "1 defaults: protocol/feeding/meds/emergency on, rest off",
  DEFAULT_SHARED_SECTIONS.care_protocol &&
    DEFAULT_SHARED_SECTIONS.feeding_plan &&
    DEFAULT_SHARED_SECTIONS.medication_details &&
    DEFAULT_SHARED_SECTIONS.vet_emergency_contacts &&
    !DEFAULT_SHARED_SECTIONS.medical_history &&
    !DEFAULT_SHARED_SECTIONS.symptom_photos &&
    !DEFAULT_SHARED_SECTIONS.wearable_vitals &&
    !DEFAULT_SHARED_SECTIONS.activity_history,
);
ck(
  "1 every key has a share-screen label",
  SECTION_KEYS.every((k) => SECTION_LABELS[k]?.label.length > 0),
);

// ── 2. normalizeSharedSections mirrors the server validator ──────────────────
ck("2 null → full defaults", normalizeSharedSections(null).care_protocol === true);
ck(
  "2 partial merge keeps defaults",
  normalizeSharedSections({ medical_history: true }).medical_history === true &&
    normalizeSharedSections({ medical_history: true }).feeding_plan === true,
);
let threwUnknown = false;
try {
  normalizeSharedSections({ billing: true } as never);
} catch {
  threwUnknown = true;
}
ck("2 unknown key throws", threwUnknown);
let threwNonBool = false;
try {
  normalizeSharedSections({ care_protocol: "yes" } as never);
} catch {
  threwNonBool = true;
}
ck("2 non-boolean throws", threwNonBool);

// ── 3. Invite codes: unambiguous alphabet, forgiving input ───────────────────
ck("3 alphabet excludes 0/O/1/I/L", !/[01OIL]/.test(INVITE_CODE_ALPHABET));
ck("3 alphabet matches the migration", migration.includes(INVITE_CODE_ALPHABET));
ck("3 normalize strips separators + uppercases", normalizeInviteCode("cvf6-w96d") === "CVF6W96D");
ck("3 valid 8-char code accepted", isValidInviteCode("CVF6 W96D"));
ck("3 wrong length rejected", !isValidInviteCode("CVF6W96"));
ck("3 ambiguous glyph rejected", !isValidInviteCode("CVF6W96O"));
ck("3 code length is 8", INVITE_CODE_LENGTH === 8);

// ── 4. Membership + capability rules ─────────────────────────────────────────
const NOW = new Date("2026-07-21T12:00:00Z");
ck("4 active open-ended membership", isMembershipActive({ status: "active", expiresAt: null }, NOW));
ck("4 revoked is inactive", !isMembershipActive({ status: "revoked", expiresAt: null }, NOW));
ck(
  "4 past expiry is inactive even while status=active",
  !isMembershipActive({ status: "active", expiresAt: "2026-07-21T11:00:00Z" }, NOW),
);
ck(
  "4 future expiry is active",
  isMembershipActive({ status: "active", expiresAt: "2026-07-22T11:00:00Z" }, NOW),
);
const allOff = normalizeSharedSections({
  care_protocol: false, feeding_plan: false, medication_details: false,
  vet_emergency_contacts: false,
});
ck("4 owner bypasses toggles", canSeeSection("owner", allOff, "medical_history"));
ck("4 co-owner bypasses toggles", canSeeSection("co_owner", allOff, "symptom_photos"));
ck(
  "4 caregiver gated by toggle",
  !canSeeSection("caregiver", allOff, "care_protocol") &&
    canSeeSection("caregiver", DEFAULT_SHARED_SECTIONS, "care_protocol"),
);
ck("4 caregiver logs only with care_protocol on", canLogCare("caregiver", DEFAULT_SHARED_SECTIONS) && !canLogCare("caregiver", allOff));
const viewerAllOn = normalizeSharedSections({
  medical_history: true, symptom_photos: true, wearable_vitals: true, activity_history: true,
});
ck("4 viewer NEVER logs, even with every toggle on", !canLogCare("viewer", viewerAllOn));
ck("4 only the owner manages the circle", canManageCircle("owner") && !canManageCircle("co_owner") && !canManageCircle("caregiver"));

// ── 5. Migration invariants (pin what the live probes proved) ────────────────
// 5a. Null-safe owner guards: a non-member's NULL role must fail closed.
//     (`if pet_role() <> 'owner'` is NULL for non-members and plpgsql skips
//     the raise — this exact bug was caught live.)
ck(
  "5 owner guards use `is distinct from 'owner'`",
  (migration.match(/is distinct from 'owner'/g) ?? []).length >= 3 &&
    !migration.includes("<> 'owner'"),
);
ck("5 member_can_log coalesces NULL to false", /coalesce\(\s*\n?\s*private\.pet_role/.test(migration));
// 5b. Expiry enforced inside RLS helpers, not just app code.
ck(
  "5 expiry predicate lives in the helper",
  migration.includes("m.status = 'active'") && migration.includes("m.expires_at > now()"),
);
// 5c. Revocation never deletes logged history.
ck(
  "5 revoke_member updates status and deletes nothing",
  migration.includes("set status = 'revoked'") &&
    !/delete\s+from\s+public\.care_task_events/i.test(migration),
);
// 5d. One canonical event per occurrence (offline dedup).
ck(
  "5 unique (pet, kind, source, occurrence) constraint",
  migration.includes("unique (pet_id, source_kind, source_id, occurrence_date)"),
);
// 5e. Account deletion semantics: history survives with identity erased;
//     spent invites die with either account.
ck(
  "5 completed_by is ON DELETE SET NULL",
  /completed_by uuid references auth\.users\(id\) on delete set null/.test(migration),
);
ck(
  "5 claimed_by cascades (spent codes never look unused)",
  /claimed_by uuid references auth\.users\(id\) on delete cascade/.test(migration),
);
// 5f. Section-gated policies exist for every mapped surface.
for (const table of [
  "care_tasks", "reminders", "food_logs", "pet_medications", "pet_conditions",
  "pet_allergies", "vet_records", "scan_records", "timeline_events", "health_logs",
]) {
  ck(`5 member-read policy on ${table}`, migration.includes(`${table}_member_read`));
}
// 5g. Never-shared tables get no member policy from this migration.
for (const table of ["document_uploads", "vet_reports", "food_scans", "ai_generations"]) {
  ck(`5 no member policy on ${table}`, !migration.includes(`${table}_member_read`));
}
// 5h. Uses the private helper schema, never the dropped public.is_admin.
ck("5 no public.is_admin reference", !migration.includes("public.is_admin"));
ck("5 helpers are SECURITY DEFINER", (migration.match(/security definer/g) ?? []).length >= 9);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
