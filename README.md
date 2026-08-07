# 📱 Smart HR Mobile App

The mobile companion application for the **Smart HR Odoo Project**. It gives employees a premium mobile experience to manage daily HR tasks — synced live to the Odoo backend.

---

## ✅ Current Status: Phase 3 (Live — fully connected to Odoo)

All data is **real**, pulled from your Odoo instance via the custom `hr_ai_api` REST module. The app authenticates with JWT tokens, auto-refreshes sessions, and syncs attendance, leaves, and notifications in real time.

---

## ✨ Features

### 🏠 Home (Dashboard)
- Dynamic greeting based on time of day
- **Clock In / Clock Out** — synced live to Odoo `hr.attendance`
- Today's worked hours displayed in real time (e.g. `7h 30m`)
- Pull-to-refresh (swipe down) to reload all data from Odoo
- **Bell icon** → In-app notification center with unread badge count
  - Shows leave approval / refusal / pending updates
  - Mark all read button
- **Quick Actions:**
  - `Request Time Off` → opens Leaves screen
  - `Attendance Calendar` → opens interactive attendance calendar
  - `View Performance` → opens Performance & Appraisals tab

### 📅 Time Off (Leaves)
- Live leave request list pulled from Odoo (`hr.leave`)
- Color-coded status badges: ✅ Approved / ⏳ Pending / ❌ Refused
- AI recommendation tag shown on each request (if available)
- Pull-to-refresh to reload statuses
- **Leave Calendar** button → visual calendar with colored day spans
  - 🟢 Approved, 🟡 Pending, 🔴 Refused
- **New Request Form:**
  - Leave type selector (Annual / Sick / Personal)
  - Tap-to-pick **date fields** (drum-style day/month/year picker — no manual typing)
  - Auto-calculated days count badge (e.g. "3 days requested")
  - Submits directly to Odoo → triggers AI recommendation on creation

### 📅 Attendance Calendar
- Full month-grid calendar (navigate months with arrows)
- Each worked day shows a colored dot:
  - 🟢 Present (on time)
  - 🟡 Late arrival
  - 🔴 Anomaly or missing check-out
- **Tap any marked day** to see a detail sheet:
  - Check-in / Check-out times side by side
  - Total worked hours (e.g. `8h 15m`)
  - Late minutes (e.g. `+25 min`)
  - Anomaly type if flagged
  - Warning banner if check-out is missing

### 📈 Performance & Appraisals
- Overall performance score ring
- AI-generated career summary (Gemini-powered)
- Skill breakdown bars
- AI-recommended training courses
- Appraisal history (formal HR reviews with scores and comments)

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev/) + React Native |
| Routing | Expo Router (file-based) |
| State | [Zustand](https://github.com/pmndrs/zustand) |
| Auth | JWT (access + refresh tokens via `hr_ai_api`) |
| Secure Storage | `expo-secure-store` |
| Styling | Native `StyleSheet` + Expo Linear Gradient |
| Icons | [Lucide React Native](https://lucide.dev/) |

---

## ⚙️ Configuration — Connecting to Odoo

The app connects to Odoo via the `.env` file at the project root.

### 1. Find your Odoo server IP

Your PC's local IP address (where Odoo Docker is running). Open PowerShell and run:
```powershell
ipconfig
```
Look for **IPv4 Address** under your active network adapter (e.g. `10.41.252.144`).

### 2. Edit `.env`

Open `.env` in the project root and set:
```env
EXPO_PUBLIC_API_BASE_URL=http://<YOUR_PC_IP>:8070
```

Example (current setup):
```env
EXPO_PUBLIC_API_BASE_URL=http://10.41.252.144:8070
```

> ⚠️ **Important:** Your phone and your PC must be on the **same Wi-Fi network**. If you change networks, update this IP. When using `--tunnel` mode, the tunnel proxies the connection so the IP matters less — but Odoo itself must still be reachable from the server.

### 3. Make sure Odoo is running

In the `Rh_automatise-odoo` folder, run:
```bash
docker compose up -d
```

Verify Odoo is healthy at: [http://localhost:8070](http://localhost:8070)

---

## 🚀 How to Run

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your PC
- **Expo Go** app installed on your phone (App Store / Google Play)
- Odoo Docker containers running

### Installation
```bash
cd smart-hr-mobile
npm install
```

### Start the dev server
```bash
npx expo start --tunnel
```

The `--tunnel` flag creates a public ngrok tunnel — this bypasses Windows firewall and Wi-Fi network restrictions so your phone can connect from anywhere.

### Open on your phone
- A QR code appears in the terminal
- **iPhone:** Open Camera app → point at QR → tap "Open in Expo Go"
- **Android:** Open Expo Go → tap "Scan QR Code"

> 💡 Every time you save a file in VS Code, the app on your phone reloads instantly!

---

## 👤 User Credentials (for testing)

Users log in with their **Odoo email and password**.

To set or reset a password for any employee:
1. Open Odoo in the browser → **Settings → Users → Manage Users**
2. Click on the user (e.g. `Marc Demo`)
3. Click the **Action** button (gear icon) → **Change Password**
4. Set a simple password (e.g. `1234`)

Then log into the app with:
- **Login:** the user's Odoo login (e.g. `demo` or their email)
- **Password:** the password you just set

---

## 📁 Project Structure

```
smart-hr-mobile/
├── app/
│   ├── login.tsx              # Login screen (JWT auth)
│   └── (tabs)/
│       ├── _layout.tsx        # Tab bar configuration
│       ├── index.tsx          # Home / Dashboard
│       ├── leaves.tsx         # Time Off management
│       └── performance.tsx    # Performance & Appraisals
├── components/
│   ├── CalendarModal.tsx      # Custom month-grid calendar + day detail sheet
│   ├── DatePickerModal.tsx    # Drum-style date picker (no manual typing)
│   └── NotificationsModal.tsx # In-app notification center
├── store/
│   └── useAppStore.ts         # Global Zustand store (auth, leaves, attendance, notifications)
├── utils/
│   └── api.ts                 # Central API client (JWT, auto-refresh, all endpoints)
└── .env                       # API base URL configuration
```

---

## 🔌 Odoo API Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/auth/token` | POST | Login — get access + refresh tokens |
| `/api/v1/auth/refresh` | POST | Silently refresh expired tokens |
| `/api/v1/auth/me` | GET | Get logged-in user profile |
| `/api/v1/leaves` | GET | Fetch all leave requests |
| `/api/v1/leaves` | POST | Submit a new leave request |
| `/api/v1/attendance/<id>` | GET | Fetch attendance history |
| `/api/v1/attendance/check-in` | POST | Clock In |
| `/api/v1/attendance/check-out` | POST | Clock Out |

All endpoints are provided by the custom `hr_ai_api` Odoo module located in `Rh_automatise-odoo/custom_addons/hr_ai_api/`.
