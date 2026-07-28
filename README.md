# KitaTolongKita — React Native App

A Malaysian community group-buying marketplace built with Expo (React Native).

**Design System:** [KitaTolongKita Design System on Stitch](https://stitch.google.com)
**Stitch Project ID:** `13309447277577605557`

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React Native (Expo) |
| Design | Google Stitch (Design System) |
| Backend | .NET Core 10 (planned) |
| Search | Elastic Search (planned) |
| Database | PostgreSQL (planned) |

---

## Project Structure

```
kitaTolongkita/
├── src/
│   ├── theme/              # Design tokens (colors, typography, spacing)
│   ├── components/        # Shared UI components
│   ├── screens/            # Screen components
│   │   ├── onboarding/     # OnboardingScreen
│   │   ├── auth/            # LoginScreen, SignUpScreen
│   │   ├── home/            # HomeScreen
│   │   ├── search/          # SearchScreen, SearchFiltersScreen
│   │   ├── deals/           # DealDetail, Checkout, OrderConfirmed, PostDeal, PostReview
│   │   ├── orders/          # OrdersScreen
│   │   ├── profile/         # ProfileScreen, ProfileSetupScreen
│   │   ├── notifications/   # NotificationsScreen, ChatInboxScreen
│   │   └── settings/         # SettingsScreen
│   └── navigation/         # React Navigation setup
├── App.tsx
└── README.md
```

---

## Design System

### Brand
- **Philosophy:** Gotong Royong — mutual cooperation
- **Vibe:** Warm, friendly, Malaysian community marketplace
- **Colors:** Amber Orange (#ff7a30) + Deep Teal (#0e6a5b)
- **Fonts:** Nunito Sans (headlines) + Inter (body)

### Components (7)
| Component | Description |
|-----------|-------------|
| `Button` | Primary (amber fill), Secondary (teal outline), Ghost |
| `DealCard` | Deal display with image, countdown badge, progress bar |
| `CategoryChip` | Pill-shaped category selector |
| `Avatar` | User avatar with verified badge |
| `BottomTabBar` | Home, Search, Post (FAB), Orders, Profile |
| `Input` | Styled text input with label, prefix/suffix |
| `ProgressBar` | Group buy progress indicator |

---

## Screens (17 total)

| Screen | Route | Status |
|--------|-------|--------|
| Onboarding | Onboarding | ✅ |
| Login | Login | ✅ |
| Sign Up | SignUp | ✅ |
| Profile Setup | ProfileSetup | ✅ |
| Home Feed | Main → Home | ✅ |
| Search | Main → Search | ✅ |
| Search Filters | SearchFilters | ✅ |
| Deal Detail | DealDetail | ✅ |
| Checkout | Checkout | ✅ |
| Order Confirmed | OrderConfirmed | ✅ |
| Post a Deal | PostDeal | ✅ |
| Post Under Review | PostReview | ✅ |
| Orders | Main → Orders | ✅ |
| Profile | Main → Profile | ✅ |
| Notifications | Notifications | ✅ |
| Chat Inbox | ChatInbox | ✅ |
| Settings | Settings | ✅ |

---

## Getting Started

```bash
cd kitaTolongkita
npm install
npx expo start
```

---

## Navigation Flow

```
Onboarding → Login → ProfileSetup → Main
                                  ↳ Home
                                  ↳ Search → SearchFilters
                                  ↳ DealDetail → Checkout → OrderConfirmed
                                  ↳ PostDeal → PostReview
                                  ↳ Orders
                                  ↳ Profile → Settings
                                  ↳ Notifications / ChatInbox
```
