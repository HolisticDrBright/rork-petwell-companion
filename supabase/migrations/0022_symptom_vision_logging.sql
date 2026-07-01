-- Petwell · 0022 allow symptom_vision in ai_generations.feature
--
-- 0018's CHECK constraint enumerates AI features and predates the symptom-photo
-- observation function (ai-vision-symptom). Without this, logGeneration inserts
-- for feature='symptom_vision' violate the constraint and are silently dropped
-- (logGeneration never throws) — which would also let those calls escape the
-- daily budget + per-user limits, since both count ai_generations rows.
alter table public.ai_generations drop constraint if exists ai_generations_feature_check;
alter table public.ai_generations add constraint ai_generations_feature_check
  check (feature in (
    'chat','explanation','food_label_vision','symptom_vision','record_summary',
    'coa_extraction','care_plan','vet_report_rewrite'
  ));
