# Food label scanning — what's real and how to enable the rest

Food Intelligence has four modes: **Barcode**, **Photo**, **Paste**, and **Search**.

## Works today (no extra setup)

- **Photo capture** uses `expo-image-picker` (already a dependency). "Take photo"
  opens the camera; "Choose image" imports from the library. Camera/photo
  permission copy is configured in `app.json`.
- **Paste / Search / Barcode (manual)** all work, including an Open Pet Food
  Facts barcode lookup that matches back to the local catalog.
- The label pipeline (`expo/lib/food/labelPipeline.ts`) normalizes text, parses
  ingredients + guaranteed analysis (`expo/lib/food/ocr.ts`), and matches the
  catalog with a confidence + closest-matches list.

**Safety rule (enforced in code):** a photo/OCR only *reads the label to identify
the product*. It never establishes purity. Contaminant confidence is driven only
by lab tests / recalls / certificates — never by an image.

## On-device OCR (auto-fill the label text from the photo)

On-device OCR (Apple Vision / Google ML Kit) is a **native module** that does not
run in Expo Go or on web, so it is intentionally not bundled. To enable it in a
custom dev/prod build:

1. `npx expo install expo-text-extractor` (or `npm install expo-text-extractor --legacy-peer-deps`)
2. Register the adapter once at app startup (e.g. top of `app/_layout.tsx`):

   ```ts
   import { getTextFromFrame } from "expo-text-extractor";
   import { registerOcrAdapter } from "@/services/ocrService";

   registerOcrAdapter({
     extract: async (uri) => (await getTextFromFrame(uri)).join("\n"),
   });
   ```

3. Build a dev client: `npx expo run:ios` / `npx expo run:android` (not Expo Go).

Without this, the Photo flow still works — the user reviews/types the label text
from their photo before analysis. `ocrService.isAvailable()` reports which path
is active.

## Live barcode camera scanning (optional)

Barcode entry is manual today. For live camera scanning add `expo-camera`:

1. `npx expo install expo-camera`
2. Render a `CameraView` with `onBarcodeScanned` (guard with `Platform.OS !== "web"`)
   and pass the scanned code into `foodService.lookupByBarcode`.

Permissions are already declared in `app.json` (`expo-image-picker` plugin covers
camera + photos). `expo-camera` adds its own permission prompt.

## No API keys required

None of the above needs a third-party API key. Open Pet Food Facts is a free,
keyless public API. OCR runs fully on-device.
