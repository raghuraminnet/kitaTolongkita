# Phase 2 — Additional Dependencies

The following packages are referenced in the Phase 2 screen upgrades but are **not yet listed in `package.json`**.

Do **NOT** run `npm install` manually — install via Expo CLI to ensure compatibility:

```bash
npx expo install expo-image-picker
npx expo install expo-slider
```

## `expo-image-picker`

**Used in:** `PostDealScreen.tsx`
**Purpose:** Multi-image selection (up to 4 photos) for deal posts.
**Installation:** `npx expo install expo-image-picker`
**Fallback:** The `pickImages()` function already includes a graceful fallback that shows an `Alert` if the package is not yet installed.

## `expo-slider`

**Used in:** `SearchFiltersScreen.tsx` (radius slider)
**Purpose:** `Slider` component for the radius selection (1–50 km).
**Installation:** `npx expo install expo-slider`
**Current fallback:** SearchFiltersScreen uses `+`/`−` button controls with a visual bar (no external dependency needed). The `expo-slider` package would replace these with a proper native slider.

## Notes

- Both packages are well-supported on iOS, Android, and web via Expo.
- After installing, rebuild with `npx expo prebuild` then `npx expo run:ios` (or `android`).
- The `pickImages()` async import in `PostDealScreen.tsx` is designed to gracefully handle the case where `expo-image-picker` is not yet installed.
