# BountyList - Most Wanted & Bounties To-Do PWA

A responsive, high-performance To-Do List Progressive Web App (PWA) built with **Next.js (App Router)**, **Tailwind CSS**, **@dnd-kit**, **Lucide Icons**, and **Supabase Real-Time Cloud Sync**.

---

## 🌟 Highlights & Features

1. **Daily Task Management & Drag-and-Drop Reordering**:
   - Touch & pointer drag handles powered by `@dnd-kit/core` and `@dnd-kit/sortable`.
   - Tuned touch sensors with activation constraints that allow fluid vertical scrolling while enabling immediate hold-and-drag reordering.
   - Inline title editing, interactive checkbox animations, and fast deletion.

2. **Automatic Midnight Rollover**:
   - Automatically migrates uncompleted tasks from past days into today's active priorities on launch or date rollover.
   - Completed past tasks are archived in the historical archive tab.
   - Displays a banner highlighting rolled-over tasks.

3. **Bonus Task Pool & Completion Rewards**:
   - Manage ideas and secondary tasks in the **Bonus Pool** tab.
   - **Auto-Reward Trigger**: Completing 100% of today's active tasks fires a colorful celebration (`canvas-confetti`), chimes audio rewards, and pulls **one random task** from the bonus pool into today's daily focus.
   - Guards against duplicate triggers within the same day.

4. **Real-Time Cloud Sync & Local-First Offline Mode**:
   - **Zero configuration required to start**: Works instantly offline via LocalStorage / IndexedDB persistence.
   - Optional **Supabase Real-Time sync**: Enter Supabase URL & Anon Key in the **Sync & Config** tab or `.env.local` to enable instant multi-device cloud synchronization via PostgreSQL and Supabase Realtime subscriptions.

5. **Progressive Web App (PWA)**:
   - Web App Manifest (`/manifest.json`) and Service Worker (`/sw.js`) for offline caching.
   - Installable on iOS (Safari Add to Home Screen) and Android / Desktop Chrome.
   - Safe-area insets (`env(safe-area-inset-bottom)`), responsive bottom tab navigation, and dark/light mode toggles.

---

## 🚀 Getting Started

### 1. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Build for Production
```bash
npm run build
npm run start
```

---

## 🗄️ Supabase Cloud Sync Setup (Optional)

1. Create a project in [Supabase](https://supabase.com).
2. Go to **SQL Editor** and execute the script provided in `supabase/schema.sql`.
3. Copy your **Project URL** and **anon public API Key**.
4. In the FocusDay app, navigate to the **Sync & Config** tab, toggle **Supabase Real-Time Cloud Sync** to ON, paste your credentials, and tap **Save & Connect**.
