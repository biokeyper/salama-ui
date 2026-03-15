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

## User Guide

### Setting Up Your PIN
1. Open the app and log in (or sign up)
2. Go to **Explore** → **Settings** (gear icon)
3. Tap **Set PIN** and enter a 4-6 digit code
4. Re-enter to confirm
5. Your PIN is now required every time you access the library

### Recording an Incident
1. Tap the **Record** tab
2. Tap the microphone icon to start recording
3. Speak naturally — a pulse animation shows the recording is active
4. Tap **Stop** when finished
5. Optionally add notes or location
6. Tap **Save** to store locally

### Using Background Recording
1. Go to **Explore** → **Settings**
2. Under **Background Recording**, toggle on the apps you want:
   - Fake Calculator
   - Fake Calendar
   - Menstrual Tracker
3. When enabled, opening that decoy app automatically starts silent recording
4. Use the app normally while evidence is captured

### Emergency Exit
- While recording, press the large red **EXIT NOW** button to:
  - Instantly save your recording
  - Switch immediately to the Fake Calculator
  - Hide all evidence of what you were doing

### Accessing Your Reports
1. Tap the **Library** tab
2. Enter your PIN
3. Browse your saved reports (audio/text, by date)
4. Tap any report to play back or view details

### Using the Menstrual Tracker
1. Go to **Explore** → **Menstrual Tracker**
2. Log your cycle, symptoms, and mood
3. Use **Secret Notes** for private observations (hidden from casual viewing)
4. Exit by long-pressing the header title (3 seconds)
5. The app automatically detects concerning patterns and creates silent evidence reports

## Architecture & Design

### Hybrid Authentication Model
SafeGirl uses a flexible auth system:
- **Public screens** (Home, Explore, Onboarding) — accessible without login
- **Protected screens** (Record, Library, Account, Settings, Notifications) — require authentication
- **AuthGateModal** — appears on protected screens, redirects to login then back to original action
- **Benefit** — Users can explore features before committing to signup; reduces friction while protecting sensitive data

### Report Flow
```
User creates report → Saved locally (draft/saved status)
  ↓
User submits → Backend processes → IPFS encrypted storage → Blockchain record
  ↓
User views submitted report → Decryption modal → Backend decrypts & returns content
```

## Backend Integration

### Sync & Blockchain
- **Search Reports** (`GET /api/search/reports`) — fetches all user's submitted reports with status, blockchain data, IPFS hashes
- **Submit Report** (`POST /api/reports/submit`) — submits report, gets txHash, ipfsHash, status back
- **Decrypt Report** (`GET /api/reports/{id}/decrypt`) — decrypts report content for display
- **Archive Report** (`POST /api/report/{id}/archive`) — soft-delete, keeps blockchain record
- **Report Status** (`GET /api/reports/{id}/status`) — checks blockchain confirmations, transaction status

### IPFS & Encryption
- Reports encrypted with user's key before upload
- Content stored on IPFS (distributed, censorship-resistant)
- `ipfsGatewayUrl` provided for direct access
- Reports are immutable once submitted (blockchain timestamp)

## Development Setup

### Prerequisites
```bash
Node.js 18+
npm or yarn
Expo CLI: npm install -g expo-cli
```

### Environment Variables
Create `.env` file in root:
```env
# Backend API
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_API_TIMEOUT=30000

# Optional: IPFS Gateway
EXPO_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud

# Auth
EXPO_PUBLIC_AUTH_ENABLED=true
```

### Local Development
```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Press 'a' for Android emulator or 'i' for iOS simulator
# Or scan QR code with Expo Go app
```

### Building for Production
```bash
# EAS build (requires account)
eas build --platform android
eas build --platform ios

# Or local build
expo build:android
expo build:ios
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` — Register new account
- `POST /api/auth/login` — Login, returns JWT token
- `POST /api/auth/logout` — Invalidate session
- `POST /api/auth/refresh` — Refresh expired token
- `DELETE /api/auth/delete-account` — Permanently delete account

### Reports
- `GET /api/search/reports` — List user's reports (supports filters: status, date range, limit, offset)
- `POST /api/reports/submit` — Submit new report (multipart/form-data for audio)
- `GET /api/reports/{id}/decrypt` — Get decrypted report content
- `POST /api/report/{id}/archive` — Archive a report
- `POST /api/report/{id}/unarchive` — Restore archived report
- `GET /api/reports/{id}/status` — Check blockchain status

### Account
- `GET /api/account/profile` — Get user profile
- `PUT /api/account/profile` — Update profile (email, phone, etc.)
- `POST /api/account/emergency-contacts` — Manage emergency contacts
- `GET /api/account/settings` — Get user settings
- `PUT /api/account/settings` — Update settings

### Notifications & Sharing
- `GET /api/notifications` — Get user's notifications
- `POST /api/reports/{id}/share` — Share report with another user
- `GET /api/reports/shared-with-me` — View reports shared by others
- `POST /api/reports/{id}/access/grant` — Grant access to specific user
- `POST /api/reports/{id}/access/revoke` — Revoke access

## Security & Encryption

### PIN Protection
- 4-6 digit PIN hashed with bcrypt before storage
- Verified on every library access
- Not recoverable if forgotten (by design — only user knows)
- Stored in secure device storage (Expo SecureStore)

### Report Encryption
1. Report data serialized to JSON
2. Encrypted with AES-256-GCM before upload
3. Encryption key derived from user's password + device ID
4. Only user can decrypt their own reports
5. IPFS hash stored on blockchain for integrity proof

### Authentication
- JWT tokens with expiry (refresh via `/auth/refresh`)
- Tokens stored in SecureStore (not localStorage)
- Silent 401 handling — no console spam for expected token expiry
- Auto-logout on authentication failure

### Sensitive Data
- Audio files never sent unencrypted
- Text reports encrypted before submission
- Location data encrypted with report
- No metadata sent to external services (except IPFS gateway)

## Troubleshooting

### Decryption Timeout (30s)
**Issue:** Text reports show "Loading..." forever
**Fix:**
- Check internet connection
- Verify IPFS gateway is accessible
- Try restarting app
- Report may be corrupted (rare)

### Sync Not Working
**Issue:** Reports not appearing after submission
**Fix:**
- Ensure backend is running
- Check `/api/search/reports` returns data
- Force refresh (pull down on Library tab)
- Logout and login again

### Auth Modal Keeps Appearing
**Issue:** Protected screens show login even after login
**Fix:**
- Clear app cache: Settings → App → SafeGirl → Clear Cache
- Logout and login again
- Check if token expired (auto-logout after 24h)

### Missing Notifications
**Issue:** Notification count shows but no notifications display
**Fix:**
- Pull to refresh notifications list
- Check notification permissions (Android/iOS settings)
- Logout and login to sync

## Learn More

- [Expo docs](https://docs.expo.dev/)
- [Expo Router intro](https://docs.expo.dev/router/introduction)
- [Expo Discord](https://chat.expo.dev)
- [React Native Security](https://reactnative.dev/docs/security)
