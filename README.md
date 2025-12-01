# SafeGirls App UI

This is a React Native mobile app built with [Expo SDK 54](https://expo.dev) and [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).  
It provides a trauma-informed, privacy-focused user interface for survivors to document and report sexual and gender-based violence (SGBV) incidents.

---

## Project Overview

This repository contains the **user interface (UI)** for SafeGirls.  
It is **not** the blockchain ("chain end") or smart contract code, but rather the mobile app that interacts with users and can connect to decentralized backends.

**Key Features:**
- **File-based routing** using [expo-router](https://docs.expo.dev/router/introduction)
- **Tab navigation** for easy access to Home, Record, and Explore screens
- **Audio recording and playback:** Record incidents in real-time or document past events with built-in audio player
- **Text reporting:** Alternative text-based reporting flow for users who prefer typing
- **Safety-first design:** Emergency exit, safety checks, and trauma-informed language
- **Custom theming** and reusable UI components
- **Expo SDK 54** with latest React Native 0.81.5

---

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

---

## Features

### Audio Recording & Playback
- **Real-time recording:** Record incidents as they happen with high-quality audio capture
- **Past event recording:** Document historical incidents with voice narration
- **Library:** Dedicated tab to manage and filter reports by Audio or Text type
- **Audio playback:** Built-in player with auto-stop, seek controls (+/- 10s), and progress tracking
- **Flexible input:** Prominent "Skip and type instead" option for users who prefer text

### Safety Features
- **Emergency exit:** Quick exit button that closes the app and clears history
- **Fake calculator screen:** Discreet decoy screen for emergency situations
- **Safety check:** Pre-report safety assessment before detailed documentation
- **Trauma-informed design:** User-controlled experience with skip options and supportive language

### Reporting Flows
- **Multi-step reporting:** Guided flow from recording/input to detailed report
- **Voice or text input:** Flexible documentation methods with dedicated Library tabs
- **Detailed reports:** Comprehensive incident documentation with metadata

---

## Technical Stack

- **Expo SDK:** 54.0.25
- **React Native:** 0.81.5
- **React:** 19.1.0
- **TypeScript:** 5.9.2
- **expo-audio:** 1.0.15 (for audio recording and playback)
- **expo-router:** 6.0.15 (file-based routing)
- **@react-native-async-storage/async-storage:** 2.2.0 (for local data persistence)

---

## Data Storage

### Local Storage Implementation

The app uses **AsyncStorage** to persist reports locally on the device. All reports are stored with the following structure:

#### Report Data Model

```typescript
interface Report {
  id: string;                    // Unique identifier
  type: 'audio' | 'text' | 'mixed';
  status: 'draft' | 'saved' | 'submitted' | 'failed';
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  
  // Audio data
  audioUri?: string;             // File path to audio recording
  audioDuration?: number;        // Duration in seconds
  
  // Text data
  textContent?: string;          // Text report content
  
  // Metadata
  metadata?: {
    location?: string;
    timestamp?: string;          // When incident occurred
    tags?: string[];
    notes?: string;
  };
  
  // Backend submission tracking
  submittedAt?: string;          // ISO 8601 timestamp
  submissionId?: string;         // Backend-assigned ID
  submissionError?: string;      // Error message if submission failed
}
```

#### Storage Service

The storage service (`services/storage.ts`) provides the following functions:

- `getAllReports()` - Retrieve all stored reports
- `getReportById(id)` - Get a specific report
- `saveReport(report)` - Save or update a report
- `deleteReport(id)` - Delete a report
- `deleteAllReports()` - Clear all reports
- `getReportsByStatus(status)` - Filter reports by status
- `getReportsByType(type)` - Filter reports by type
- `updateReportStatus(id, status)` - Update report submission status

#### Storage Limits

- **Maximum reports:** 100 reports stored locally (oldest removed when limit exceeded)
- **Storage location:** Device's AsyncStorage (persists across app restarts)
- **Audio files:** Stored in temporary file system (managed by expo-audio)

#### Report Lifecycle

1. **Draft** - Initial state when audio is recorded or text is entered
2. **Saved** - Report is saved locally but not yet submitted
3. **Submitted** - Successfully sent to backend
4. **Failed** - Submission attempt failed (can be retried)

---

## Backend Submission Framework

### Overview

The app is designed to connect to decentralized backends (blockchain/smart contracts) or traditional REST APIs. The backend submission framework is documented here for future implementation.

### Architecture

```
┌─────────────┐
│   UI Layer  │ (app/ screens)
└──────┬──────┘
       │
┌──────▼──────┐
│  Storage    │ (services/storage.ts)
│  Service    │
└──────┬──────┘
       │
┌──────▼──────┐
│ Submission  │ (services/submission.ts - TO BE IMPLEMENTED)
│  Service    │
└──────┬──────┘
       │
┌──────▼──────┐
│   Backend   │ (Blockchain API / REST API)
│   Endpoint  │
└─────────────┘
```

### Implementation Plan

#### 1. Submission Service (`services/submission.ts`)

Create a service to handle backend communication:

```typescript
// Example structure (to be implemented)
export interface SubmissionConfig {
  apiEndpoint: string;
  apiKey?: string;
  blockchainNetwork?: string;
  contractAddress?: string;
}

export async function submitReport(
  report: Report,
  config: SubmissionConfig
): Promise<{ success: boolean; submissionId?: string; error?: string }> {
  // Implementation:
  // 1. Validate report data
  // 2. Prepare payload (audio file upload, text content, metadata)
  // 3. Authenticate/authorize request
  // 4. Submit to backend
  // 5. Handle response and update report status
  // 6. Return result
}
```

#### 2. Backend API Requirements

##### REST API Endpoint

**POST** `/api/reports`

**Request:**
```json
{
  "type": "audio" | "text" | "mixed",
  "textContent": "string",
  "audioFile": "base64 or multipart/form-data",
  "metadata": {
    "location": "string",
    "timestamp": "ISO 8601",
    "tags": ["string"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "submissionId": "unique-id",
  "timestamp": "ISO 8601"
}
```

##### Blockchain Integration

For decentralized backends:

- **Smart Contract Function:** `submitReport(bytes32 reportHash, string metadata)`
- **IPFS Storage:** Upload audio files to IPFS, store hash on-chain
- **Encryption:** Encrypt sensitive data before submission
- **Wallet Integration:** Connect user wallet for transaction signing

#### 3. Submission Queue

Implement an offline queue for failed submissions:

```typescript
// Queue structure
interface SubmissionQueue {
  pending: Report[];
  retryAttempts: Map<string, number>;
  maxRetries: number;
}

// Auto-retry logic
- Check network connectivity
- Retry failed submissions on app launch
- Exponential backoff for retries
- Mark as permanently failed after max retries
```

#### 4. Authentication & Security

- **User Authentication:** Implement auth flow (OAuth, JWT, wallet signature)
- **Data Encryption:** Encrypt reports before submission
- **Privacy:** Ensure audio/text data is encrypted in transit and at rest
- **Anonymity:** Consider anonymous submission options

#### 5. Error Handling

```typescript
// Error scenarios to handle:
- Network failures (offline, timeout)
- Authentication errors (expired token, invalid credentials)
- Backend errors (server error, rate limiting)
- Validation errors (invalid data format)
- Storage errors (quota exceeded)
```

#### 6. Configuration

Create a config file for backend settings:

```typescript
// config/backend.ts
export const BACKEND_CONFIG = {
  apiEndpoint: process.env.EXPO_PUBLIC_API_URL || 'https://api.example.com',
  blockchainNetwork: process.env.EXPO_PUBLIC_NETWORK || 'mainnet',
  contractAddress: process.env.EXPO_PUBLIC_CONTRACT_ADDRESS,
  enableSubmission: process.env.EXPO_PUBLIC_ENABLE_SUBMISSION === 'true',
};
```

### Integration Steps

1. **Create submission service** (`services/submission.ts`)
2. **Add network detection** (use `@react-native-community/netinfo`)
3. **Implement retry logic** with exponential backoff
4. **Add submission UI** (progress indicators, success/error messages)
5. **Create backend configuration** (environment variables)
6. **Add authentication flow** (if required)
7. **Implement encryption** (for sensitive data)
8. **Add submission queue** (for offline support)
9. **Test with mock backend** before production integration

### Environment Variables

Add to `.env` or `app.json`:

```env
EXPO_PUBLIC_API_URL=https://api.safegirls.example.com
EXPO_PUBLIC_ENABLE_SUBMISSION=true
EXPO_PUBLIC_BLOCKCHAIN_NETWORK=mainnet
EXPO_PUBLIC_CONTRACT_ADDRESS=0x...
```

### Testing

- **Mock Backend:** Use tools like MSW (Mock Service Worker) for testing
- **Offline Testing:** Test submission queue with network disabled
- **Error Scenarios:** Test all error paths and edge cases
- **Performance:** Test with large audio files and multiple reports

---

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

---

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.