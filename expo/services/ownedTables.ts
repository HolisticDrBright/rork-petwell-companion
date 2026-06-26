/**
 * The complete set of user-owned tables that make up "all my data" for the
 * privacy export/delete flows. Catalog/reference tables (world-readable) are
 * intentionally excluded. Kept in its own module so it can be unit-tested
 * without importing the Supabase client.
 *
 * When a migration adds a new owner-scoped table, add it here.
 */
export const OWNED_TABLES = [
  "pet_profiles",
  "pet_conditions",
  "pet_allergies",
  "pet_medications",
  "care_tasks",
  "reminders",
  "timeline_events",
  "health_logs",
  "symptom_sessions",
  "symptom_answers",
  "triage_results",
  "scan_records",
  "scan_images",
  "vet_records",
  "document_uploads",
  "vet_reports",
  "food_scans",
  "food_logs",
  "food_scores",
  "food_recommendations",
  "user_corrections",
  // Integrative / longevity layer (owner-scoped; catalog tables excluded).
  "protocol_recommendations",
  "health_scores",
  "system_scores",
  "detected_patterns",
  "treat_audits",
  "environment_checklists",
  "progress_programs",
  "program_logs",
  "product_recommendations",
] as const;
