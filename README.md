# 📱 Smart HR Mobile App

This is the mobile companion application for the **Smart HR Odoo Project**. It is designed to give employees a seamless, premium mobile experience for managing their daily HR tasks.

## 🚀 Current Status: Phase 1 (UI Mockup)
Currently, the app is in **Phase 1**. The user interface and architecture are fully built, but all data is **mocked (fake)** using a local Zustand state manager. 

In Phase 2, this app will be connected to the Odoo backend via JSON-RPC to pull real employee data.

## ✨ Features Implemented

1. **🏠 Home (Clock-In Dashboard)**
   - Dynamic greetings based on the time of day.
   - Live overview of vacation days, online status, and pending requests.
   - Large, interactive **Clock In / Clock Out** button with simulated GPS verification.
   - Recent notifications feed (e.g., Leave approvals, Performance reviews).

2. **📅 Time Off (Leaves)**
   - Visual breakdown of available vacation balance.
   - History of all past and pending leave requests with color-coded status badges.
   - A slide-up **New Request Form** allowing employees to request Annual, Sick, or Personal leave.

3. **📈 Performance (AI Insights)**
   - Overall AI-calculated performance score ring.
   - **Gemini AI Summary** providing personalized insights and career advice based on the employee's metrics.
   - Visual skill breakdown bars.
   - AI-recommended training courses based on current skill gaps.

## 🛠️ Technology Stack
- **Framework:** [Expo](https://expo.dev/) & React Native
- **Styling:** Native `StyleSheet` & [Expo Linear Gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/)
- **Icons:** [Lucide React Native](https://lucide.dev/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Routing:** Expo Router (File-based routing)

---

## 📱 How to Run & Test the App

Since this is an Expo project, anyone on the team can easily test it on their own physical smartphone for free without needing Android Studio or a Mac.

### 1. Prerequisites
- Download the free **Expo Go** app on your iPhone (App Store) or Android (Google Play).
- Ensure you have [Node.js](https://nodejs.org/) installed on your computer.

### 2. Installation
Open your terminal in this folder (`smart-hr-mobile`) and run:
```bash
npm install
```

### 3. Start the Server
Start the Expo development server. We use the `--tunnel` flag to bypass any restrictive Windows Firewalls or Wi-Fi network isolation (so your phone can easily connect to your PC):
```bash
npx expo start --tunnel
```

### 4. Open on your Phone
- A large QR code will appear in your terminal.
- **iPhone:** Open your normal Camera app, point it at the QR code, and tap the yellow "Open in Expo Go" button.
- **Android:** Open the Expo Go app and tap "Scan QR Code".

*Note: Every time you save a file in VS Code, the app on your phone will automatically refresh instantly!*
