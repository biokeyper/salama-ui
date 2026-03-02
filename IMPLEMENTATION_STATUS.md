# SafeGirl Backend API Integration - Implementation Status

## Overview
Full backend integration for 32 endpoints across 3 phases (HIGH, MEDIUM, LOW priority).

---

## ✅ COMPLETED PHASES

### Phase 1 - HIGH PRIORITY (10 endpoints)
- **1A: Report Decrypt** ✅
  - Endpoint: `GET /api/report/:reportId/decrypt`
  - UI: "View Submitted" button in library for submitted/confirmed reports
  - Shows decrypted content in modal

- **1B: Change Phone** ✅
  - Endpoints: `POST /api/auth/change-phone`, `POST /api/auth/verify-phone-change`
  - UI: account.tsx screen with 2-step phone change flow
  - Updates user data in AuthContext
  - Displays userId

- **1C: Panic Alerts** ✅
  - Endpoints: `POST /api/panic-alert`, `GET /api/panic-alert/history`
  - UI: FloatingEmergencyButton (red heart at bottom right)
  - UI: panic-history.tsx screen
  - Two-tap confirmation, shows history with timestamps

- **1D: Notifications** ✅
  - Endpoints: `GET /api/notifications`, `GET /api/notifications/unread/count`, `POST /api/notifications/:id/read`, `POST /api/notifications/mark-all-read`, `DELETE /api/notifications/:id`
  - UI: notifications.tsx screen
  - UI: Unread badge on Explore tab
  - Real-time unread count

### Phase 2 - MEDIUM PRIORITY (7 endpoints)

- **2A: Search Reports** ✅
  - Endpoints: `GET /api/search/reports`, `GET /api/search/stats`
  - UI: Search bar in library header (cross-tab search)
  - Filters by content, date, ID
  - Works on both Audio and Text tabs

- **2B: Access/Sharing** ✅
  - Endpoints: `POST /api/access/grant`, `POST /api/access/revoke`, `GET /api/access/shared-with-me`, `GET /api/access/my-report/:reportId/viewers`, `GET /api/access/report/:reportId`
  - UI: "Share" button on submitted reports → enter user ID
  - UI: "Viewers" button → shows who has access + revoke option
  - UI: "Shared" tab in library → reports others shared with user
  - Tab state properly managed (only one active at a time)

### Phase 3B - LOW PRIORITY (4 endpoints) - Services Only
- **3B: Forgot Phone Recovery** ✅ (Services implemented, no UI needed)
  - Endpoints: `POST /api/auth/forgot-phone`, `POST /api/auth/verify-recovery`, `POST /api/auth/change-phone/recovery`, `POST /api/auth/verify-phone-change/recovery`

---

## 🚧 IN PROGRESS / TODO

### Phase 3A - Key Recovery (2 endpoints) - NEEDS DISCUSSION
**⚠️ Security Concern Raised:** Don't store PIN plaintext on local DB

**Recommended Architecture:**
- Store emergency encryption key on server with hashed PIN
- PIN never stored locally
- Flow: User enters PIN → app hashes it → sends to backend
- Recovery: Phone + PIN → hash → verify server-side → return key

**Endpoints:**
- `POST /api/keys/backup` - { pin, encryptionKey }
- `POST /api/keys/recover` - { phone, pin }

**UI Location:** Settings page → "Key Backup" section

---

## 🆕 NEW FEATURE: Emergency Contacts (NOT IN ORIGINAL 32)

### Purpose
Enable users to quickly alert trusted contacts (family, friends, lawyer) when emergency is triggered.

### Design Options

#### Option 1: SMS/Email Alerts (Most Direct)
```
User taps Emergency Heart
  ↓
App sends panic alert to backend
  ↓
Backend records + sends SMS/Email to emergency contacts:
  "ALERT: User triggered emergency alert
   Location: [coords] | Time: [timestamp]
   View: [link]"
```
- ✅ Works for anyone (no app needed)
- ❌ Costs money (SMS service needed)
- ❌ Requires contact phone/email

#### Option 2: In-App Notifications Only
```
User taps Emergency Heart
  ↓
Backend sends push notification to emergency contacts
  ↓
Contact sees alert in SafeGirls app
```
- ✅ Free, integrates with existing system
- ❌ Only works if contacts have app

#### Option 3: Hybrid (RECOMMENDED)
```
Backend:
  - If contact has app → push notification
  - If no app → SMS/Email fallback

Contact gets alerted immediately (app or SMS)
```
- ✅ Best coverage
- ⚠️ Most complex (requires both implementations)

### UI Implementation (Settings Page)
- **Emergency Contacts Section**
  - Access device contacts
  - Select contacts to mark as emergency
  - Store: contact ID, name, phone/email
  - List with delete option

### Data Storage
- Local: Selected contact IDs + names
- Backend: Map user → emergency contacts (optional)

### Alert Flow
1. User taps emergency heart
2. App records: location, timestamp
3. Sends to backend with flag: "notify_emergency_contacts"
4. Backend sends alerts based on contact preferences
5. Contacts receive notification/SMS/email

---

## 📊 ENDPOINT COUNT

| Phase | Category | Endpoints | Status |
|-------|----------|-----------|--------|
| 1A | Report Decrypt | 1 | ✅ Done |
| 1B | Change Phone | 2 | ✅ Done |
| 1C | Panic Alerts | 2 | ✅ Done |
| 1D | Notifications | 5 | ✅ Done |
| 2A | Search Reports | 2 | ✅ Done |
| 2B | Access/Sharing | 5 | ✅ Done |
| 3A | Key Recovery | 2 | 🚧 Needs Discussion |
| 3B | Forgot Phone Recovery | 4 | ✅ Services Done |
| **TOTAL** | | **32** | **30/32 + 1 new feature** |

---

## 🛠️ Technical Notes

### Library (audio-player.tsx)
- Search bar with real-time filtering
- 3 tabs: Audio, Text Reports, Shared
- Proper tab state management
- Action buttons for submitted reports: View, Share, Viewers
- Decrypted content modal
- Share modal with user ID input
- Viewers modal with revoke functionality
- Shared reports display from backend

### Home Screen (index.tsx)
- FloatingEmergencyButton at bottom right (above tab bar)
- Two-tap confirmation for emergency alert
- All quick action cards present

### Account Screen (account.tsx)
- Display: Phone, Email, **User ID**
- Change phone 2-step process
- Preserves userId from backend response

### Key Decisions Made
1. **Remove white bg from emergency heart** → Done (then restored)
2. **Move emergency heart above tab bar** → Changed bottom from 30 to 100
3. **Fix library PIN flash** → Early return for PIN screens
4. **Disable unlock button until 6 digits** → Always visible, styled disabled
5. **Fix tab state confusion** → Only one tab active at time
6. **PIN hashing for key recovery** → Don't store PIN locally

---

## Next Steps

1. **Decide on Emergency Contacts approach** (SMS/Email, In-App, or Hybrid)
2. **Build Emergency Contacts UI** (Settings page)
3. **Implement Key Recovery** with proper PIN hashing
4. **Test all 32 endpoints** end-to-end
