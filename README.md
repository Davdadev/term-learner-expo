# Term Learner — Expo (React Native)

Cross-platform vocabulary learning app for **iPhone, Android, and iPad**. No Xcode required to run.

## Features

- **AI Image Extraction** — Photo or camera → Claude AI extracts up to 70 terms automatically
- **CSV Import/Export** — Import your own spreadsheets; export any collection as CSV
- **Spaced Repetition** — SM-2 algorithm schedules reviews at optimal intervals
- **Daily Reminders** — Local notifications quiz you on due terms throughout the day
- **Swipe Study Cards** — Swipe right = correct, left = missed (or tap buttons)
- **Progress Tracking** — Mastery distribution bar chart, per-collection progress, streaks
- **Collections** — Colour-coded groups with due counts and progress bars
- **Onboarding** — First-launch flow to set reminder count and API key

## Quick Start (no Xcode needed)

### 1. Install dependencies
```bash
cd term-learner-expo
npm install
```

### 2. Install Expo Go on your iPhone
Download **Expo Go** from the App Store (free).

### 3. Start the dev server
```bash
npx expo start
```

Scan the QR code with your iPhone camera → opens instantly in Expo Go.

### 4. Add your Claude API key
Go to **Settings** in the app → paste your key from [console.anthropic.com](https://console.anthropic.com).

---

## Build a standalone app (no Xcode still!)

```bash
npm install -g eas-cli
eas login
eas build --platform ios      # builds .ipa in the cloud
eas build --platform android  # builds .apk/.aab in the cloud
```

Requires a free [Expo account](https://expo.dev). iOS distribution to the App Store requires a $99/yr Apple Developer account, but you can install via TestFlight with a free account.

---

## Project Structure

```
app/
  _layout.tsx          Root layout — SQLiteProvider, notification listener
  index.tsx            Redirect to onboarding or tabs
  onboarding.tsx       4-screen onboarding flow
  (tabs)/
    _layout.tsx        Tab bar
    index.tsx          Home dashboard
    collections.tsx    Collections list
    upload.tsx         Image upload + AI extraction + CSV import
    progress.tsx       Progress charts and stats
    settings.tsx       API key, notifications, data reset
  collection/[id].tsx  Collection detail — term list, filter, edit, export
  study.tsx            Swipe flashcard study session
  quiz.tsx             Notification-triggered quick quiz modal
components/
  GradientCard.tsx
  StatCard.tsx
  TermRow.tsx
  CollectionCard.tsx
  MasteryBadge.tsx
services/
  database.ts          expo-sqlite — all CRUD operations
  claude.ts            Anthropic API — image → terms
  notifications.ts     expo-notifications — scheduling
constants/
  theme.ts             Colors, gradients, shadows, radii
  types.ts             TypeScript types + SM-2 scheduling logic
```

## Tech Stack

| What | Package |
|---|---|
| Framework | Expo SDK 51 / React Native |
| Navigation | Expo Router (file-based) |
| Database | expo-sqlite 14 |
| AI | Claude API (`claude-haiku-4-5`) |
| Notifications | expo-notifications |
| Camera/Photos | expo-image-picker |
| Animations | react-native-reanimated 3 |
| Gestures | react-native-gesture-handler |

## Privacy

- API key stored in `AsyncStorage` on-device only
- Anthropic's API does not train on data submitted via the API
- Copyright-detected images show a notice; terms are for personal study only
