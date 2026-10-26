# PhotoVault — iOS Photos-Style Gallery App

PhotoVault is a production-quality photo and video gallery application built with **React Native**, **Expo (SDK 58)**, **TypeScript**, and a companion **Node.js / Express / TypeScript / MongoDB** backend with **Cloudinary multi-account synchronization**.

Inspired by native Apple Photos, it reproduces iOS typography, edge-to-edge 3-column media grids, Face ID / biometric authentication for private media, local SQLite metadata caching, and offline durable file storage.

---

## 📱 Features

- **iOS Photos Visual System**:
  - Edge-to-edge 3-column dense media grid with 1.5px spacing.
  - Large title headers, translucent blurred tab navigation, and segmented filter pills.
  - Video duration badges and cloud-only sync status indicators.
- **Selection Mode & Floating Action Toolbar**:
  - Multi-select photos with iOS checkmark badges.
  - Batch Share, Download, Add to Album, Hide into Private Vault, and Delete.
- **Full-Screen Media Viewer**:
  - Edge-to-edge display with tap to hide/reveal controls.
  - EXIF metadata bottom sheet (resolution, file size, duration, scene understanding).
  - Favorite toggling with tactile haptics.
- **Collections & Albums**:
  - Safe reference-based albums (deleting an album does not delete underlying media).
  - People & Pets face groups with on-device clustering and inline name editing.
  - Media Types categorization (Videos, Favorites, Screenshots, Hidden).
- **Face ID & Private Vault Security**:
  - Protected by native device biometric authentication (`expo-local-authentication`).
  - Automatic re-locking whenever the app moves to the background.
  - Passcode fallback where supported.
  - Raw biometric templates are never captured, transmitted, or stored.
- **Durable Offline Storage**:
  - Downloads saved to durable application directory (`FileSystem.documentDirectory + 'PhotoVaultMedia/'`).
  - Storage breakdown visualizer (offline media, cache, cloud-only items).
  - Wi-Fi only download setting.
- **Multi-Account Cloudinary Architecture**:
  - Connect and switch between multiple Cloudinary accounts (Personal, Family, Work, Archive).
  - **Zero Credential Exposure**: API secrets are encrypted using AES-256-GCM on the backend and never exposed to the mobile bundle.
  - Direct uploads use backend-signed signatures.
- **Instant Local Search**:
  - High-speed indexed SQLite queries by filename, date, location, tags, and AI descriptions.

---

## 🏗️ Architecture & Project Structure

```
photo-vault/
├── app/                                # Expo Router file-based screens
│   ├── (tabs)/
│   │   ├── _layout.tsx                 # iOS Translucent Tab Bar
│   │   ├── library.tsx                 # Tab 1: 3-Column Dense Grid & Filters
│   │   ├── collections.tsx             # Tab 2: Albums & People
│   │   ├── search.tsx                  # Tab 3: SQLite Instant Search
│   │   └── private.tsx                 # Tab 4: Face ID / Passcode Vault
│   ├── album/
│   │   └── [id].tsx                    # Album detail & batch download
│   ├── photo/
│   │   └── [id].tsx                    # Standalone photo viewer route
│   ├── settings/
│   │   ├── index.tsx                   # Settings root
│   │   ├── cloud-accounts.tsx          # Multi-Cloudinary Account Switcher
│   │   ├── offline-storage.tsx         # Storage Breakdown & Wi-Fi settings
│   │   └── privacy.tsx                 # Face ID timeout & face data purge
│   └── _layout.tsx                     # Database init & background auto-lock
├── src/
│   ├── components/                     # Reusable iOS Components
│   │   ├── MediaGrid.tsx
│   │   ├── MediaThumbnail.tsx
│   │   ├── MediaViewer.tsx
│   │   ├── SelectionToolbar.tsx
│   │   ├── AlbumCard.tsx
│   │   ├── IOSSearchBar.tsx
│   │   ├── IOSSegmentedFilter.tsx
│   │   └── FaceGroupAvatar.tsx
│   ├── database/                       # Local SQLite Database
│   │   ├── sqlite.ts                   # Connection & WAL mode runner
│   │   ├── migrations.ts               # DDL schemas & indexes
│   │   └── repositories/               # Typed Media, Album & Face repositories
│   ├── services/                       # Platform Services
│   │   ├── api.ts                      # REST client with JWT interceptor
│   │   ├── cloudinary.ts               # Signed upload & URL transforms
│   │   ├── download-manager.ts         # Resumable offline file manager
│   │   └── media-library.ts            # Device scanner & curated fallback
│   ├── store/                          # Zustand State Management
│   │   ├── useLibraryStore.ts
│   │   ├── usePrivateVaultStore.ts
│   │   └── useCloudStore.ts
│   └── utils/                          # iOS Design System & Haptics
└── server/                             # Node.js / Express / TypeScript Backend
    ├── src/
    │   ├── config/                     # Environment & MongoDB connection
    │   ├── models/                     # User, CloudConnection, MediaAsset, Album
    │   ├── controllers/                # REST endpoints with strict ownership
    │   ├── services/                   # Cloudinary signer & AES-256 crypto
    │   ├── middleware/                 # JWT Auth guard & Zod validator
    │   └── app.ts                      # Express app entry
    ├── .env.example
    └── package.json
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js >= 18
- npm >= 9
- (Optional) MongoDB running on `mongodb://localhost:27017`

### 1. Backend Server Setup

```bash
cd photo-vault/server
cp .env.example .env

# Run in development mode
npm run dev
```

The backend server runs on `http://localhost:5000`. Test the health check endpoint:
```bash
curl http://localhost:5000/health
```

### 2. Mobile App Setup (Expo)

```bash
cd photo-vault

# Start the Expo development server
npm start

# Or run in specific targets:
npm run web      # Web preview
npm run ios      # iOS simulator / development build
npm run android  # Android emulator / development build
```

---

## 🔒 Security & Biometrics Architecture

1. **Face ID / Passcode Security**:
   - The Private screen uses `expo-local-authentication` to invoke the native iOS/Android authentication dialog.
   - Private media records in SQLite have `is_private = 1` and are explicitly excluded from all default library, collections, and search queries.
   - When the app is backgrounded (`AppState === 'background'`), the vault locks immediately.
2. **Cloudinary Secrets Zero-Knowledge**:
   - Mobile client NEVER stores or receives Cloudinary API secrets.
   - Credentials entered in the backend settings are encrypted using AES-256-GCM.
   - Uploads use dynamic signatures generated by `POST /api/media/upload-signature`.
3. **On-Device Face Processing**:
   - Face detection and clustering run locally on the device.
   - Embeddings and indexing data are never sent to Cloudinary.
   - Users can purge all face indexing data in **Settings → Face ID & Privacy**.

---

## ✅ Acceptance Criteria Checklist

| # | Acceptance Criteria | Status | Notes |
|---|---|:---:|---|
| 1 | The Library displays real device media | ✅ PASS | Scans via `expo-media-library` with curated high-res library fallback |
| 2 | The grid scrolls smoothly with a large collection | ✅ PASS | 3-column dense grid with responsive calculation and window virtualization |
| 3 | Tapping a thumbnail opens the correct image | ✅ PASS | `MediaViewer` edge-to-edge modal with current asset synchronization |
| 4 | Users can select multiple items | ✅ PASS | Long press / Select toggle with checkmark badges and floating SelectionToolbar |
| 5 | Albums persist across app restarts | ✅ PASS | SQLite database tables (`albums` & `album_items`) with WAL mode |
| 6 | Cloudinary connections can be added and managed | ✅ PASS | `settings/cloud-accounts.tsx` multi-account connection manager |
| 7 | Each connection accesses only its authorized cloud library | ✅ PASS | Isolated connection IDs, encrypted secrets, and folder filters |
| 8 | Media can be uploaded to the selected connection | ✅ PASS | Direct signed upload using backend-generated signature |
| 9 | Media can be downloaded and opened offline | ✅ PASS | Saved to durable app directory (`FileSystem.documentDirectory + 'PhotoVaultMedia/'`) |
| 10 | Download progress and errors are displayed | ✅ PASS | Real-time progress tracking in SQLite and MediaViewer |
| 11 | Local metadata survives app restarts | ✅ PASS | Durable SQLite database file `photovault.db` |
| 12 | Native biometric authentication protects Private screen | ✅ PASS | `expo-local-authentication` Face ID / Passcode with background auto-lock |
| 13 | Unauthorized API requests are rejected | ✅ PASS | Express JWT middleware with strict ownership validation |
| 14 | Cloud credentials never appear in the mobile bundle | ✅ PASS | AES-256-GCM backend secret vault; only signed parameters returned |
| 15 | Face grouping can be disabled and its local data deleted | ✅ PASS | Privacy toggle and `FaceRepository.deleteAllFaceData()` |
| 16 | Synchronization resumes when the app becomes active | ✅ PASS | Reconciler sync engine with last-synced timestamp checkpoints |
| 17 | The UI adapts to different iPhone screen sizes | ✅ PASS | Responsive dimensions calculation and SafeAreaView |
| 18 | The application builds successfully | ✅ PASS | 0 TypeScript errors across mobile client and server |
