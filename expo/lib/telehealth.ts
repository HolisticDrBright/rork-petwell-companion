/**
 * Telehealth — pure rules + copy (no Supabase imports so tests can pin it).
 *
 * Launch model: the feature is DATA-flagged. While no practitioner row is
 * active the app shows the coming-soon state (with a waitlist), and it
 * becomes bookable the moment one is activated — no app release required.
 */

export interface TelehealthPractitioner {
  id: string;
  displayName: string;
  credentials: string | null;
  bio: string | null;
  photoUrl: string | null;
  specialties: string[];
  species: "dog" | "cat" | "both";
  timezone: string | null;
  bookingUrl: string | null;
}

export type TelehealthRequestKind = "waitlist" | "appointment";
export type TelehealthRequestStatus = "pending" | "scheduled" | "completed" | "cancelled";

export interface TelehealthRequest {
  id: string;
  petId: string | null;
  practitionerId: string | null;
  kind: TelehealthRequestKind;
  status: TelehealthRequestStatus;
  reason: string | null;
  preferredTimes: string | null;
  scheduledAt: string | null;
  meetingUrl: string | null;
  createdAt: string;
}

/** Live when at least one practitioner is active; coming-soon otherwise. */
export function isTelehealthLive(activePractitionerCount: number): boolean {
  return activePractitionerCount > 0;
}

export const REQUEST_STATUS_LABELS: Record<TelehealthRequestStatus, string> = {
  pending: "Requested",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Only an un-actioned request can be cancelled by the owner. */
export function canCancelRequest(status: TelehealthRequestStatus): boolean {
  return status === "pending";
}

export const TELEHEALTH_NOT_EMERGENCY_LINE =
  "Telehealth is not for emergencies. If you see collapse, trouble breathing, pale or blue gums, a " +
  "seizure, nonstop vomiting, or think they got into something toxic, contact an emergency vet right now.";

export const TELEHEALTH_COMING_SOON_BLURB =
  "Video visits with a licensed veterinarian, right from Petwell — for follow-ups, second opinions, and " +
  "questions that don't need an in-person exam. We're onboarding vets now.";

export const TELEHEALTH_SCOPE_NOTE =
  "A telehealth visit can't replace your regular vet or hands-on emergency care, and prescribing rules " +
  "vary by state (many require an existing vet-client relationship).";
