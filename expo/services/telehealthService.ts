// Telehealth — typed client for the 0031 backend. Remote mode only (like the
// Care Circle); the screen handles local/demo with an informational card.
import { requireUserId } from "@/lib/backend";
import type { TelehealthPractitioner, TelehealthRequest } from "@/lib/telehealth";
import { supabase } from "@/lib/supabase";

type PractitionerRow = {
  id: string;
  display_name: string;
  credentials: string | null;
  bio: string | null;
  photo_url: string | null;
  specialties: string[] | null;
  species: string;
  timezone: string | null;
  booking_url: string | null;
};

type RequestRow = {
  id: string;
  pet_id: string | null;
  practitioner_id: string | null;
  kind: string;
  status: string;
  reason: string | null;
  preferred_times: string | null;
  scheduled_at: string | null;
  meeting_url: string | null;
  created_at: string;
};

function mapPractitioner(row: PractitionerRow): TelehealthPractitioner {
  return {
    id: row.id,
    displayName: row.display_name,
    credentials: row.credentials,
    bio: row.bio,
    photoUrl: row.photo_url,
    specialties: row.specialties ?? [],
    species: row.species === "dog" || row.species === "cat" ? row.species : "both",
    timezone: row.timezone,
    bookingUrl: row.booking_url,
  };
}

function mapRequest(row: RequestRow): TelehealthRequest {
  return {
    id: row.id,
    petId: row.pet_id,
    practitionerId: row.practitioner_id,
    kind: row.kind === "waitlist" ? "waitlist" : "appointment",
    status: (["pending", "scheduled", "completed", "cancelled"].includes(row.status)
      ? row.status
      : "pending") as TelehealthRequest["status"],
    reason: row.reason,
    preferredTimes: row.preferred_times,
    scheduledAt: row.scheduled_at,
    meetingUrl: row.meeting_url,
    createdAt: row.created_at,
  };
}

export const telehealthService = {
  /** Active practitioners (RLS: only active rows are world-readable). */
  async listPractitioners(): Promise<TelehealthPractitioner[]> {
    const { data, error } = await supabase
      .from("vet_practitioners")
      .select("id, display_name, credentials, bio, photo_url, specialties, species, timezone, booking_url")
      .eq("active", true)
      .order("display_name", { ascending: true })
      .limit(50);
    if (error) throw new Error(error.message);
    return ((data ?? []) as PractitionerRow[]).map(mapPractitioner);
  },

  /** My requests + waitlist membership, newest first. */
  async myRequests(): Promise<TelehealthRequest[]> {
    requireUserId();
    const { data, error } = await supabase
      .from("telehealth_requests")
      .select("id, pet_id, practitioner_id, kind, status, reason, preferred_times, scheduled_at, meeting_url, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return ((data ?? []) as RequestRow[]).map(mapRequest);
  },

  /** Join the coming-soon waitlist (idempotent; one entry per account). */
  async joinWaitlist(petId?: string | null): Promise<{ alreadyJoined: boolean }> {
    const userId = requireUserId();
    const { data: existing } = await supabase
      .from("telehealth_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "waitlist")
      .maybeSingle();
    if (existing) return { alreadyJoined: true };
    const { error } = await supabase
      .from("telehealth_requests")
      .insert({ user_id: userId, pet_id: petId ?? null, kind: "waitlist" });
    if (error) {
      // The partial unique index is the backstop for a concurrent double-tap.
      if (/duplicate|unique/i.test(error.message)) return { alreadyJoined: true };
      throw new Error(error.message);
    }
    return { alreadyJoined: false };
  },

  /** File an appointment request the practitioner confirms out-of-band. */
  async requestAppointment(input: {
    petId?: string | null;
    practitionerId?: string | null;
    reason?: string;
    preferredTimes?: string;
  }): Promise<void> {
    const userId = requireUserId();
    const { error } = await supabase.from("telehealth_requests").insert({
      user_id: userId,
      pet_id: input.petId ?? null,
      practitioner_id: input.practitionerId ?? null,
      kind: "appointment",
      reason: input.reason?.trim() || null,
      preferred_times: input.preferredTimes?.trim() || null,
    });
    if (error) throw new Error(error.message);
  },

  /** Owner cancels an un-actioned request. */
  async cancelRequest(id: string): Promise<void> {
    const { error } = await supabase
      .from("telehealth_requests")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
  },
};
