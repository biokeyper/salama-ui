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

## Usage Guide

### Authentication

#### Sign Up
1. Open the app — you land on the **Home** screen
2. Tap **Create Account** or **Sign Up**
3. Enter your email address
4. Create a strong password
5. **You get:** Email confirmation link sent to your inbox
6. Check your email and tap the verification link
7. **Result:** You're now logged in and can access all protected features

#### Log In
1. Open the app and tap **Log In** (or tap any protected feature to trigger the auth modal)
2. Enter your email and password
3. Tap **Log In**
4. **You get:** Instant access to Record, Library, Account, Settings, and Notifications

#### Recover Your Account
1. On the login screen, tap **Forgot Password?**
2. Enter the email address for your account
3. **You get:** Recovery email with a reset link
4. Tap the link in your email, create a new password
5. **Result:** You can log in with your new password

#### Log Out
1. Go to **Explore** → **Account** (or **Settings**)
2. Scroll to bottom and tap **Log Out**
3. **You get:** Returned to home screen, all protected features locked

#### Delete Your Account
1. Go to **Explore** → **Account**
2. Scroll to bottom and tap **Delete Account**
3. Confirm the deletion (this cannot be undone)
4. **You get:** Account removed permanently; all local data cleared
5. **Result:** You're logged out and returned to home screen

---

### Recording an Incident

#### Audio Recording
1. Tap the **Record** tab (if logged in, or log in when prompted)
2. Tap the **microphone icon** to start
3. **You see:** A blue pulse animation — recording is active
4. Speak naturally — describe the incident, date, people involved, any details
5. Tap **Stop** when finished
6. **You get:** Recording duration shown, playback preview available
7. Optionally tap **Add Notes** to type details or location
8. Tap **Save to Library** to store locally
9. **Result:** Report saved to your device; no internet needed

#### Text Reporting
1. From the **Record** tab, tap the **text bubble icon** (instead of microphone)
2. Tap **Create Text Report**
3. Type out the incident details (date, time, people, what happened, any evidence)
4. Tap **Add Location** to record where this happened (optional)
5. Tap **Save** to store locally
6. **You get:** Text report saved with timestamp
7. **Result:** Can be viewed later and submitted to backend when ready

#### Emergency Exit (Panic Button)
1. While recording (audio or text), press the large red **EXIT NOW** button
2. **You get:** Current recording instantly saved
3. **Result:** App immediately switches to the **Fake Calculator** — anyone looking won't see what you were doing

---

### Managing Your Report Library

#### Set Up PIN Protection
1. Go to **Explore** → **Settings** (gear icon)
2. Scroll to **PIN Protection**
3. Tap **Set PIN**
4. Enter a 4-6 digit code
5. Re-enter to confirm
6. **You get:** PIN now required every time you access the Library tab
7. **Result:** Reports stay hidden even if someone else opens the app

#### View Your Reports
1. Tap the **Library** tab
2. Enter your PIN
3. **You get:** Full list of all saved reports (audio, text, and auto-detected)
4. Tap any report card to see details:
   - Playback audio or read text
   - See timestamp and location (if recorded)
   - View notes you added
5. **Result:** Can review all documentation at any time

#### Filter & Search Reports
1. In the Library, use the **filter tabs** at the top:
   - **All** — shows everything
   - **Audio** — audio recordings only
   - **Text** — typed reports only
   - **Detected** — auto-detected evidence (from cycle tracker)
2. Tap on any report to view full details
3. **You get:** Quick access to specific report types

#### Archive Reports
1. In the Library, find a report you want to hide (but keep)
2. Tap **⋯** menu on the report card
3. Tap **Archive**
4. **You get:** Report moved out of main view
5. **Result:** Report still exists but doesn't clutter your library; can be restored anytime

#### Unarchive Reports
1. In the Library, tap **Archived** filter at the top
2. Find the report you want to restore
3. Tap **⋯** menu → **Unarchive**
4. **Result:** Report returned to main library

---

### Using the Decoy Apps

#### Fake Calculator
1. Go to **Explore** → **Fake Calculator**
2. **You see:** Working calculator with full functionality
3. Use it normally — perform actual calculations
4. If you enabled **background recording** in Settings:
   - Recording starts automatically when you open it
   - **You get:** Silent audio capture while using calculator
5. To exit and return to main app:
   - Long-press the **C** button for 3 seconds
   - **Result:** Saved recording, then switched back to SafeGirl

#### Fake Calendar
1. Go to **Explore** → **Fake Calendar**
2. **You see:** Working calendar with dates, holidays marked
3. Navigate months with **< >** buttons
4. Tap any date to see if it's a holiday
5. If **background recording** enabled:
   - Recording starts automatically
   - **You get:** Silent audio capture while browsing
6. To exit:
   - Long-press any date (or triple-tap) for 3 seconds on the same date
   - **Result:** Saved recording, return to SafeGirl

---

### Enable Background Recording

#### Set Up Background Recording
1. Go to **Explore** → **Settings** (gear icon)
2. Scroll to **Background Recording**
3. Toggle **ON** for each decoy app you want to use:
   - **Fake Calculator** — silent recording while using calculator
   - **Fake Calendar** — silent recording while viewing calendar
   - **Menstrual Tracker** — silent recording while logging health
4. **You get:** When you open that decoy app, recording starts automatically in background
5. **Result:** Evidence captured without suspicion

---

### Using the Menstrual Tracker

#### Log Your Cycle & Health
1. Go to **Explore** → **Menstrual Tracker**
2. **Day View** — see your current cycle status
3. Tap **+ Log** to add an entry:
   - Mark cycle day or flow level
   - Add symptoms (pain, mood, energy, etc.)
   - Add private notes
4. **You get:** Health pattern tracked over time
5. If **background recording** enabled:
   - Recording runs silently in background
   - **Result:** Evidence captured while logging

#### View Health Tips
1. In the Menstrual Tracker, scroll down
2. **You see:** Health tips and resources
3. Tap any tip to read more information
4. **Result:** Learn about wellness and self-care

#### Use Secret Notes
1. While logging an entry, tap **Secret Notes**
2. Write observations you don't want visible to casual viewers
3. **You get:** Notes that are less obvious in the main log
4. **Result:** Private thoughts protected

#### Exit the App
1. Long-press the **header title** (where it says "Menstrual Tracker") for 3 seconds
2. **Result:** Saved entry, recording stopped, returned to SafeGirl

#### View Abuse Alerts
1. The tracker automatically detects concerning patterns:
   - Severe pain + negative mood together
   - Keywords like "hit", "forced", "scared", "abuse"
2. **You get:** Silent evidence report created automatically
3. Go to **Library** → **Detected** tab to see auto-created reports
4. **Result:** Abuse patterns documented without manual action

---

### Submitting & Syncing Reports

#### Submit a Report to Backend
1. Go to **Library** and find a saved report
2. Tap **⋯** menu → **Submit Report**
3. **You get:** Report encrypted and sent to backend
4. See status: "Submitting..." → "Submitted"
5. **Result:** Report now stored on blockchain with transaction record

#### View Submitted Reports
1. In **Library**, look for the **Submitted** label on report cards
2. Tap the report to see:
   - Blockchain transaction hash
   - Submission timestamp
   - Encryption status
3. **Result:** Proof that report was documented on immutable ledger

#### Check Sync Status
1. Go to **Notifications** tab to see sync status
2. **You get:** Updates on what's been uploaded, what's pending
3. Failed submissions show with retry option
4. **Result:** Know which reports are safely backed up

---

### Account Settings

#### Change Email Address
1. Go to **Explore** → **Account**
2. Scroll to **Email Address**
3. Tap to edit
4. Enter new email address
5. **You get:** Verification email sent to new address
6. Verify the new email
7. **Result:** Account now uses new email for login

#### Update Phone Number
1. Go to **Explore** → **Account**
2. Scroll to **Phone Number**
3. Tap to edit and enter new number
4. **Result:** Phone number updated for emergency contacts

#### Change Password
1. Go to **Explore** → **Settings**
2. Scroll to **Security**
3. Tap **Change Password**
4. Enter current password, then new password twice
5. Tap **Update**
6. **Result:** Password changed; must use new password on next login

#### Add Emergency Contacts
1. Go to **Explore** → **Account**
2. Scroll to **Emergency Contacts**
3. Tap **+ Add Contact**
4. Enter name and phone number
5. **You get:** Contact saved
6. **Result:** Can quickly reach trusted people if needed

#### Set Email Recovery
1. Go to **Explore** → **Settings**
2. Scroll to **Account Recovery**
3. Toggle **Email Recovery** ON
4. **You get:** Recovery email option if you forget password
5. **Result:** Can regain access to account via email

---

### Notifications

#### View Your Notifications
1. Tap the **Notifications** icon in the bottom navigation
2. Or go to **Explore** → **Notifications**
3. **You see:** List of all messages and alerts:
   - Submission status (report uploaded)
   - Security alerts (new login, password change)
   - System messages
4. Unread notifications show a badge with count
5. Tap any notification to see full details
6. **Result:** Stay informed on account activity

#### Clear Notifications
1. In Notifications, tap **⋯** menu → **Clear All**
2. Or swipe left on individual notification to dismiss
3. **Result:** Notification cleared but still appears in history

---

### Themes & Appearance

#### Change Theme
1. Go to **Explore** → **Settings**
2. Scroll to **Appearance**
3. Choose:
   - **Light Mode** — bright background, dark text
   - **Dark Mode** — dark background, light text
   - **Auto** — follows system settings (switches at sunset/sunrise)
4. Tap your choice
5. **You get:** App immediately updates to new theme
6. **Result:** Preference saved; persists across sessions

---

### Exploring the App

#### Browse Home Screen (No Login Needed)
1. Tap the **Home** tab
2. **You see:**
   - Welcome message
   - Feature overview
   - Safety tips
   - Getting started guide
3. Read about what SafeGirl can do
4. **Result:** Understand the app without committing to signup

#### Explore Features
1. Tap the **Explore** tab
2. **You see:** All available features:
   - Menstrual Tracker
   - Fake Calculator
   - Fake Calendar
   - Settings
   - Account
   - Notifications
3. Tap any to learn more or open it
4. **Result:** Discover all safety and documentation tools available

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
User submits → Backend processes & stores encrypted
  ↓
User views submitted report → Decryption & display
```

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


## Learn More

- [Expo docs](https://docs.expo.dev/)
- [Expo Router intro](https://docs.expo.dev/router/introduction)
- [Expo Discord](https://chat.expo.dev)
- [React Native Security](https://reactnative.dev/docs/security)
