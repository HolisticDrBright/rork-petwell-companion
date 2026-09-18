# Store screenshots

Generated from the running app, not from a mockup tool, so they can never show
a screen the app doesn't actually have.

## Regenerate

```bash
cd expo
bun run e2e:build                    # web export → dist-web/
node e2e/serve.mjs dist-web 8099 &   # static server with SPA fallback
bun run screenshots                  # → docs/store-screenshots/<device>/
```

On a machine with a pre-installed Chromium (no browser download), point at it:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium bun run screenshots
```

The PNGs are deliberately **not committed** — they're ~14MB, they go stale on
any UI change, and they're three minutes of work to rebuild.

## What it produces

Eight device sizes, six screens each (Today, Timeline, Health Score, Food
Intelligence, Is it toxic?, Patterns):

| Folder | Delivered size | Where it's used |
| --- | --- | --- |
| `ios-6.9-1320x2868` | 1320×2868 | App Store 6.9" (required) |
| `ios-6.7-1290x2796` | 1290×2796 | App Store 6.7" |
| `ios-6.5-1242x2688` | 1242×2688 | App Store 6.5" (required) |
| `ios-6.1-1179x2556` | 1179×2556 | App Store 6.1" |
| `ios-5.5-1242x2208` | 1242×2208 | App Store 5.5" (required) |
| `ipad-12.9-2048x2732` | 2048×2732 | App Store iPad 12.9" (required if iPad is enabled) |
| `android-phone-1080x1920` | 1080×1920 | Play Console phone |
| `android-tablet-1600x2560` | 1600×2560 | Play Console tablet |

## The copy check

The script reads the text of every captured screen and **fails** on language we
don't use: `cleanest`, `safest`, `purest`, `verified clean`, placeholder text,
`(sample)` demo scaffolding, and unqualified diagnosis claims. "Not a diagnosis"
and "AI never diagnoses" pass — the rule looks at whether the claim is negated
or deferred to a vet, not at the keyword. A screenshot is a public claim about
the product, so it's held to the same standard as the in-app evidence copy.

## Before uploading — human review

These are generated with **development demo data** (Buddy, Luna, Milo), which is
also what keeps them free of any real pet's health information. Check that:

- The floating "Log / Scan / Ask" button doesn't cover something important; it
  overlaps the care checklist on the Today shot. Scroll or pick another frame.
- No screen shows a DEMO pill you don't want in a store listing.
- The chosen order tells the story you want. Apple shows the first 3 in search
  results.
