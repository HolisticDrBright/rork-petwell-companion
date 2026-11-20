import { serviceClient } from "../_shared/auth.ts";
import { computeHealthScore, HEALTH_SCORE_MODEL } from "../_shared/petHealthScore.ts";

const BATCH_SIZE = 40;

Deno.serve(async req => {
  const secret = Deno.env.get("PETWELL_HEALTH_SNAPSHOT_SECRET");
  const token = req.headers.get("x-petwell-job-token");
  if (!secret || !token || !await matchesSecret(secret, token)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (req.method !== "POST") return new Response(null, { status: 405 });

  try {
    const { after } = await req.json();
    if (after !== null && after !== undefined && (typeof after !== "string" || !/^[0-9a-f-]{36}$/i.test(after))) {
      return Response.json({ error: "Invalid cursor" }, { status: 400 });
    }
    const db = serviceClient();
    const today = new Date();
    const date = today.toISOString().slice(0, 10);
    today.setUTCDate(today.getUTCDate() - 60);
    let petsQuery = db.from("pet_profiles").select("id,owner_id,name,species,weight_lb,age_years,pet_conditions(label)")
      .is("demo_key", null).in("species", ["dog", "cat"]).order("id").limit(BATCH_SIZE);
    if (after) petsQuery = petsQuery.gt("id", after);
    const { data: pets, error: petsError } = await petsQuery;
    if (petsError) throw petsError;

    let saved = 0;
    for (const pet of pets ?? []) {
      const { data: logs, error: logError } = await db.from("timeline_events")
        .select("category,event_date,title,detail,value").eq("pet_id", pet.id).eq("owner_id", pet.owner_id)
        .gte("event_date", today.toISOString().slice(0, 10)).lte("event_date", date)
        .order("event_date", { ascending: false }).order("created_at", { ascending: false }).limit(500);
      if (logError) throw logError;
      const score = computeHealthScore({
        name: pet.name,
        species: pet.species === "cat" ? "cat" : "dog",
        weightLb: Number(pet.weight_lb ?? 0),
        ageYears: Number(pet.age_years ?? 0),
        conditions: pet.pet_conditions.map(c => c.label),
      }, (logs ?? []).map(log => ({
        category: log.category,
        date: log.event_date,
        title: log.title,
        detail: log.detail ?? undefined,
        value: log.value ?? undefined,
      })), undefined, date);
      if (score.overall === null) continue;
      const { error: saveError } = await db.from("health_scores").upsert({
        pet_id: pet.id,
        owner_id: pet.owner_id,
        overall: score.overall,
        band: score.band,
        headline: score.headline,
        generated_at: date,
        systems: score.systems,
        score_model: HEALTH_SCORE_MODEL,
        inputs: score.inputs,
        data_coverage: score.coverage,
        confidence: score.confidence,
      }, { onConflict: "pet_id,generated_at,score_model" });
      if (saveError) throw saveError;
      saved++;
    }
    return Response.json({ saved, next: pets?.length === BATCH_SIZE ? pets.at(-1)?.id : null });
  } catch {
    return Response.json({ error: "Snapshot batch could not be completed" }, { status: 500 });
  }
});

async function matchesSecret(expected: string, supplied: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([expected, supplied].map(async secret =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(secret)))
  ));
  return a.reduce((diff, value, index) => diff | (value ^ b[index]), 0) === 0;
}
