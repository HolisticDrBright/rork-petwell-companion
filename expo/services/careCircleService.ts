// Shared Care Access (Care Circle) — typed client for the 0024 backend.
// All circle management goes through SECURITY DEFINER RPCs; reads rely on the
// section-gated RLS, so a caregiver's queries simply return what they're
// allowed and nothing else. Remote mode only — sharing has no local/demo mode.
import { requireUserId } from "@/lib/backend";
import type { CareRole, SharedSections } from "@/lib/careCircle";
import { normalizeInviteCode, normalizeSharedSections } from "@/lib/careCircle";
import { supabase } from "@/lib/supabase";

export interface CareMember {
  userId: string;
  role: CareRole;
  status: "active" | "revoked" | "expired";
  expiresAt: string | null;
  sharedSections: SharedSections;
  createdAt: string;
  revokedAt: string | null;
}

export interface CreatedInvite {
  code: string;
  role: CareRole;
  sharedSections: SharedSections;
  inviteExpiresAt: string;
  accessExpiresAt: string | null;
}

export interface ClaimedPet {
  petId: string;
  petName: string;
  role: CareRole;
  sharedSections: SharedSections;
  alreadyMember: boolean;
}

export type CareTaskKind = "care_task" | "reminder" | "medication";

export interface CareTaskEvent {
  id: string;
  petId: string;
  sourceKind: CareTaskKind;
  sourceId: string;
  occurrenceDate: string;
  completedBy: string | null;
  completedAt: string;
  note: string | null;
  photoUrl: string | null;
}

type MemberRow = {
  user_id: string;
  role: string;
  status: string;
  expires_at: string | null;
  shared_sections: unknown;
  created_at: string;
  revoked_at: string | null;
};

type EventRow = {
  id: string;
  pet_id: string;
  source_kind: string;
  source_id: string;
  occurrence_date: string;
  completed_by: string | null;
  completed_at: string;
  note: string | null;
  photo_url: string | null;
};

function mapSections(raw: unknown): SharedSections {
  try {
    return normalizeSharedSections((raw ?? undefined) as Partial<Record<string, boolean>> | undefined);
  } catch {
    // Unknown server keys should never break rendering — fall back to defaults.
    return normalizeSharedSections(undefined);
  }
}

function mapMember(row: MemberRow): CareMember {
  return {
    userId: row.user_id,
    role: row.role as CareRole,
    status: row.status as CareMember["status"],
    expiresAt: row.expires_at,
    sharedSections: mapSections(row.shared_sections),
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}

function mapEvent(row: EventRow): CareTaskEvent {
  return {
    id: row.id,
    petId: row.pet_id,
    sourceKind: row.source_kind as CareTaskKind,
    sourceId: row.source_id,
    occurrenceDate: row.occurrence_date,
    completedBy: row.completed_by,
    completedAt: row.completed_at,
    note: row.note,
    photoUrl: row.photo_url,
  };
}

export const careCircleService = {
  /** Owner: mint a single-use invite (48h window) with per-section toggles. */
  async createInvite(
    petId: string,
    role: Exclude<CareRole, "owner">,
    sections?: Partial<SharedSections>,
    accessExpiresAt?: string | null,
  ): Promise<CreatedInvite> {
    const { data, error } = await supabase.rpc("create_pet_invite", {
      p_pet_id: petId,
      p_role: role,
      p_shared_sections: sections ? normalizeSharedSections(sections) : null,
      p_access_expires_at: accessExpiresAt ?? null,
    });
    if (error) throw new Error(error.message);
    const inv = data as {
      code: string; role: string; shared_sections: unknown;
      invite_expires_at: string; access_expires_at: string | null;
    };
    return {
      code: inv.code,
      role: inv.role as CareRole,
      sharedSections: mapSections(inv.shared_sections),
      inviteExpiresAt: inv.invite_expires_at,
      accessExpiresAt: inv.access_expires_at,
    };
  },

  /** Sitter: claim a code (any formatting) → join-screen payload. Idempotent. */
  async claimInvite(rawCode: string): Promise<ClaimedPet> {
    const { data, error } = await supabase.rpc("claim_invite", {
      p_code: normalizeInviteCode(rawCode),
    });
    if (error) throw new Error(error.message);
    const res = data as {
      pet_id: string; pet_name: string; role: string;
      shared_sections: unknown; already_member: boolean;
    };
    return {
      petId: res.pet_id,
      petName: res.pet_name,
      role: res.role as CareRole,
      sharedSections: mapSections(res.shared_sections),
      alreadyMember: res.already_member,
    };
  },

  /** Owner: edit a member's toggles. Immediate effect, audited before/after. */
  async updateMemberSections(
    petId: string,
    userId: string,
    sections: Partial<SharedSections>,
  ): Promise<SharedSections> {
    const { data, error } = await supabase.rpc("update_member_sections", {
      p_pet_id: petId,
      p_user_id: userId,
      p_shared_sections: normalizeSharedSections(sections),
    });
    if (error) throw new Error(error.message);
    return mapSections(data);
  },

  /** Owner: one-tap remove. The member's logged history stays attributed. */
  async revokeMember(petId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc("revoke_member", {
      p_pet_id: petId,
      p_user_id: userId,
    });
    if (error) throw new Error(error.message);
  },

  /** The whole circle (owner/co-owner view) — RLS trims it for everyone else. */
  async listMembers(petId: string): Promise<CareMember[]> {
    const { data, error } = await supabase
      .from("pet_members")
      .select("user_id, role, status, expires_at, shared_sections, created_at, revoked_at")
      .eq("pet_id", petId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);
    return ((data ?? []) as MemberRow[]).map(mapMember);
  },

  /** My own membership row for a pet (drives role/section gating in the UI). */
  async myMembership(petId: string): Promise<CareMember | null> {
    const userId = requireUserId();
    const { data, error } = await supabase
      .from("pet_members")
      .select("user_id, role, status, expires_at, shared_sections, created_at, revoked_at")
      .eq("pet_id", petId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapMember(data as MemberRow) : null;
  },

  /** Pets shared WITH me (active memberships on pets I don't own). */
  async listSharedPets(): Promise<{ petId: string; role: CareRole; sharedSections: SharedSections }[]> {
    const userId = requireUserId();
    const { data, error } = await supabase
      .from("pet_members")
      .select("pet_id, role, status, expires_at, shared_sections")
      .eq("user_id", userId)
      .neq("role", "owner")
      .eq("status", "active")
      .limit(50);
    if (error) throw new Error(error.message);
    const now = Date.now();
    return ((data ?? []) as (MemberRow & { pet_id: string })[])
      .filter((r) => !r.expires_at || new Date(r.expires_at).getTime() > now)
      .map((r) => ({
        petId: r.pet_id,
        role: r.role as CareRole,
        sharedSections: mapSections(r.shared_sections),
      }));
  },

  /**
   * Check off a task (last-write-wins per occurrence; duplicates collapse
   * server-side). occurrenceDate defaults to today on the server.
   */
  async completeTask(input: {
    petId: string;
    sourceKind: CareTaskKind;
    sourceId: string;
    occurrenceDate?: string;
    clientCompletedAt?: string;
    note?: string;
    photoUrl?: string;
  }): Promise<string> {
    const { data, error } = await supabase.rpc("complete_care_task", {
      p_pet_id: input.petId,
      p_source_kind: input.sourceKind,
      p_source_id: input.sourceId,
      p_occurrence_date: input.occurrenceDate ?? null,
      p_client_completed_at: input.clientCompletedAt ?? null,
      p_note: input.note ?? null,
      p_photo_url: input.photoUrl ?? null,
    });
    if (error) throw new Error(error.message);
    return data as string;
  },

  /** Check-offs for one day (defaults to all recent) — feeds both Today views. */
  async listTaskEvents(petId: string, occurrenceDate?: string): Promise<CareTaskEvent[]> {
    let query = supabase
      .from("care_task_events")
      .select("id, pet_id, source_kind, source_id, occurrence_date, completed_by, completed_at, note, photo_url")
      .eq("pet_id", petId)
      .order("completed_at", { ascending: false })
      .limit(200);
    if (occurrenceDate) query = query.eq("occurrence_date", occurrenceDate);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ((data ?? []) as EventRow[]).map(mapEvent);
  },

  /**
   * Live activity feed: push every new/updated check-off for a pet to the
   * callback. Returns an unsubscribe function.
   */
  subscribeTaskEvents(petId: string, onEvent: (event: CareTaskEvent) => void): () => void {
    const channel = supabase
      .channel(`care-events-${petId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "care_task_events", filter: `pet_id=eq.${petId}` },
        (payload) => {
          const row = payload.new as EventRow | null;
          if (row?.id) onEvent(mapEvent(row));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};
