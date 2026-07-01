# Vision golden set — validating the symptom-photo observer

Before marketing photo observations, measure them. This harness runs the exact
prompt + strict JSON schema that `ai-vision-symptom` uses against a folder of
**labeled real photos** and scores the output. It is the same evidence discipline
the food layer uses: claims are backed by measurements, not vibes.

## Assemble the set

- **30–50 photos per area** (`poop`, `skin`, `ear`, `eye`, `teeth`), mixing
  positives (known findings) and normal controls.
- JPEG/PNG/WebP only (convert HEIC first). Vary lighting — gum-color photos
  especially must include flash and natural-light versions.
- Label each in `expo/data/vision-golden-set/manifest.json` (copy
  `manifest.example.json`): expected red flags (from the fixed schema list) and
  feature tokens that should appear in the observations.
- Photos are gitignored by default — keep them out of the repo unless you have
  consent to store them.

## Run

```powershell
cd expo
$env:OPENAI_API_KEY="sk-..."          # server-side key; never ships in the app
bun scripts/vision-golden-set.ts       # optional: $env:AI_VISION_MODEL="gpt-4.1"
```

Output: per-image pass/fail lines + `report-<date>.json` next to the manifest.

## Read the results

- **Red-flag recall is the safety-critical metric** — the script exits non-zero
  if any expected red flag was missed. Missing a red flag is fail-unsafe; an
  extra (unexpected) red flag is fail-safe (over-routing to a vet) and acceptable.
- Feature hit-rate is the quality metric; use it to compare models
  (`AI_VISION_MODEL`) and to decide what the store listing may honestly claim.
- Keep dated reports — they are your evidence trail for what the feature can do.
