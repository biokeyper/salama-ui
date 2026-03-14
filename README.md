# SafeGirls

A privacy-first React Native app that empowers survivors to safely document and report sexual and gender-based violence (SGBV). Built with [Expo SDK 54](https://expo.dev).

## Features

### Recording & Reporting

- **Audio recording** — tap to record incidents in real-time with a pulse animation showing active capture. Recordings are saved locally and can be replayed from the library.
- **Text reporting** — type out incident details as an alternative to audio. Supports both real-time and past-event documentation.
- **Report library** — browse, filter, and play back all saved reports. Protected behind a user-set PIN so content stays hidden even if someone opens the app.

### Decoy Apps & Stealth

- **Fake Calculator** — a fully working calculator. Enable background recording in Settings and it silently captures audio while in use. Long-press the **C** button (3 seconds) to exit back to the main app.
- **Fake Calendar** — displays dates and holidays. Supports background recording. Triple-tap any date to exit.
- **Menstrual Tracker** — tracks cycles, symptoms, and notes. Includes health tips and a secret notes field. Long-press the header title (3 seconds) to exit.
- **Background recording** — when enabled per decoy app in Settings, opening that app automatically starts silent audio capture in the background.

### Safety & Privacy

- **Emergency exit** — the "EXIT NOW" panic button on the record screen instantly saves any in-progress recording and switches to the fake calculator screen.
- **Abuse detection** — the cycle tracker analyzes entries for concerning patterns (severe pain + negative mood, keywords like "hit", "forced", "scared") and silently creates evidence reports.
- **Offline-first storage** — all reports, recordings, and settings are stored locally on the device. Nothing leaves the phone without explicit user action.
- **PIN protection** — the report library and sensitive settings are locked behind a PIN that's verified on every access.
- **Email recovery** — optional account recovery via email, configurable in Settings.

### Authentication

- **Hybrid auth model** — Home and Explore screens are freely accessible without login. Recording, library, account, settings, and notifications require authentication. An auth modal appears automatically when needed and redirects back after login.

### Theming

- **Light / Dark / Auto modes** — persisted across sessions via AsyncStorage.

## Getting Started

```bash
npm install
npx expo start
```

Then open the app in [Expo Go](https://expo.dev/go), an [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/), or an [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/).

## Project Structure

```
app/            Screen routes (file-based routing via expo-router)
  (tabs)/       Tab screens — Home, Record, Library, Explore
components/     Reusable UI components
config/         API configuration
contexts/       React contexts (auth, settings, theme, etc.)
hooks/          Custom hooks
services/       Business logic (storage, auth, audio, security)
types/          TypeScript type definitions
utils/          Helper utilities
```

## Tech Stack

| Tool         | Version |
| ------------ | ------- |
| Expo SDK     | 54      |
| React Native | 0.81.5  |
| React        | 19.1    |
| TypeScript   | 5.9     |
| expo-router  | 6       |

## Learn More

- [Expo docs](https://docs.expo.dev/)
- [Expo Router intro](https://docs.expo.dev/router/introduction)
- [Expo Discord](https://chat.expo.dev)
