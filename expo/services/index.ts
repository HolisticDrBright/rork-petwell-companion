/**
 * Petwell typed service layer. Each service wraps Supabase CRUD for one domain
 * and maps DB rows to the app's view models. Call initBackend() (lib/backend)
 * before using these in remote mode.
 */
export { petsService, type NewPetInput } from "./petsService";
export { timelineService, type NewTimelineEntry } from "./timelineService";
export { remindersService, type NewReminder } from "./remindersService";
export { recordsService, RECORD_CATEGORIES, type NewRecord } from "./recordsService";
export { scanService } from "./scanService";
export { triageService, type AnswerInput } from "./triageService";
export { foodService, type FoodProductSummary, type BarcodeLookupResult } from "./foodService";
export { reportService, type ReportRow, type GatheredReport } from "./reportService";
export {
  privacyService,
  DEFAULT_PRIVACY,
  type PrivacyPrefs,
  type PrivacyKey,
} from "./privacyService";
export { integrativeService } from "./integrativeService";
export { patternsService } from "./patternsService";
export { storage } from "./storage";
