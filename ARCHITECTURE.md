# Hallaqi Architecture

## Overview

Hallaqi follows a feature-based architecture with clear separation of concerns. The frontend is a React SPA that communicates with Supabase for all backend operations.

## Folder Structure

```
src/
  App.tsx              # Root component, screen router, providers
  main.tsx             # Entry point
  index.css            # Global styles
  App.css              # App-specific styles

  supabase/            # Supabase configuration
    client.ts          # Client instance + env check
    auth.ts            # Auth service (signUp, signIn, signOut)
    database.ts        # Database queries (CRUD)
    storage.ts         # File upload service

  contexts/            # React contexts
    AppContext.tsx     # Main app state (data, navigation, settings)
    context.ts         # AppContext instance (fast refresh)
    types.ts           # AppContext types
    useApp.ts          # useApp hook

  hooks/               # Reusable hooks
    useAuth.ts         # Authentication state + actions
    use-mobile.ts      # Mobile viewport detection

  tabs/                # Main 5 tabs
    BookingTab.tsx     # Barber discovery, search, filters
    AppointmentsTab.tsx # Booking management
    CameraTab.tsx      # QR scanner/generator
    ForumTab.tsx       # Community forum
    ProfileTab.tsx     # User profile, settings, subscription

  pages/               # Stack screens (lazy loaded)
    LoginScreen.tsx
    RegisterScreen.tsx
    BarberDetailPage.tsx
    BookingFlowPage.tsx
    ChatRoomPage.tsx
    NotificationsPage.tsx
    PostDetailPage.tsx

  components/          # Shared components
    BottomNav.tsx      # Tab navigation
    ErrorBoundary.tsx  # Error handling
    Skeleton.tsx       # Loading skeletons
    EmptyState.tsx     # Empty state UI
    Toast.tsx          # Toast notifications
    ComingSoon.tsx     # Coming soon placeholder

  data/                # Static data
    themes.ts          # 10 theme definitions
    mockData.ts        # Type definitions + fallback data

  store/               # Global state
    useStore.ts        # Zustand store (theme, lang, offline)

  types/               # TypeScript types
    index.ts           # All app types
    supabase.ts        # Supabase-specific types

  lib/                 # Utilities
    error.ts           # Error message helper
    utils.ts           # shadcn utilities

  assets/              # Static assets
    logo-icon.png
    logo-symbol.png
    logo-wordmark.png
```

## State Architecture

### Zustand Store (Persistent)
- `theme` — Current theme name
- `animationStyle` — Animation preference
- `language` — UI language (ar/fr/en)
- `isOnline` — Network status

### AppContext (React Context)
- Navigation state (activeTab, screen, screenParams)
- Data state (barbers, bookings, forumPosts, notifications)
- UI state (isSearchOpen, showNotifications)
- Settings (privacy, notifications, accessibility)
- Actions (toggleFollow, toggleLike, etc.)

### useAuth Hook
- Auth state (user, appUser, isAuthenticated, isLoading)
- Auth actions (login, register, logout, googleSignIn)
- Session management + persistence

## Navigation

Two-layer navigation:
1. **Tab Navigation** — 5 bottom tabs (booking, appointments, camera, forum, profile)
2. **Stack Navigation** — Screens pushed on top (barber-detail, booking-flow, etc.)

All pages use React.lazy for code splitting.

## Data Flow

```
UI Component → useApp() / useAuth()
                    ↓
            Supabase Service
                    ↓
            Supabase Backend
```

When Supabase is configured: real-time data.
When not configured: setup screen shown (no fake data).

## Authentication Flow

1. App mounts → checks `VITE_SUPABASE_URL` env var
2. If missing → shows Supabase setup screen
3. If present → calls `supabase.auth.getSession()`
4. Session found → fetches user profile → authenticated state
5. No session → shows login prompt on protected screens
6. Login/Register → Supabase Auth → profile created in `profiles`; barber
   registration also creates the matching `professionals` row

## Key Decisions

- **No Redux** — Zustand + Context is sufficient
- **No React Query** — Direct Supabase calls with local state
- **No Backend Server** — Supabase handles everything
- **Feature Folders** — Tabs and pages are self-contained
- **Lazy Loading** — All pages loaded on demand
- **Database Enforcement** — RLS, secured RPCs, and exclusion constraints protect
  authorization and booking integrity
- **PWA Shell** — Workbox precaches application assets; authenticated API
  responses are intentionally never cached
