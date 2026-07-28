# KitaTolongKita — Design System Specification

## Brand & Philosophy
**Gotong Royong** — Mutual cooperation. A warm, trustworthy, friendly Malaysian community marketplace.
- Aesthetic: Modern-Tactile + Soft Minimalism
- Emotional drivers: Energy (deals), Safety (trust), Accessibility (ease)
- Avoid cold corporate fintech — "neighborly" digital space

---

## Design Tokens

### Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| primary | #a04100 | Brand anchor |
| primary-container | #ff7a30 | CTA buttons, "Deal" energy |
| on-primary | #ffffff | Text on primary |
| on-primary-container | #622400 | Text on primary container |
| inverse-primary | #ffb693 | Amber highlights |
| secondary | #0e6a5b | Trust accent (verification, security, success) |
| secondary-container | #a2f2de | Success states |
| on-secondary | #ffffff | Text on secondary |
| on-secondary-container | #197161 | Text on secondary container |
| background | #fcf9f8 | Warm off-white base |
| on-background | #1b1c1c | Primary text (soft charcoal) |
| surface | #fcf9f8 | Surface base |
| surface-container | #f0eded | Card backgrounds |
| surface-container-high | #eae7e7 | Elevated cards |
| surface-container-highest | #e4e2e1 | Modals |
| on-surface | #1b1c1c | Text on surface |
| on-surface-variant | #584238 | Secondary text |
| outline | #8c7166 | Borders |
| outline-variant | #dfc0b3 | Subtle dividers |
| error | #ba1a1a | Error states |
| error-container | #ffdad6 | Error backgrounds |

### Typography
| Style | Font | Size | Weight | Line Height | Letter Spacing |
|-------|------|------|--------|-------------|----------------|
| display-lg | Nunito Sans | 32px | 800 | 40px | -0.02em |
| headline-lg | Nunito Sans | 24px | 700 | 32px | — |
| headline-lg-mobile | Nunito Sans | 20px | 700 | 28px | — |
| title-md | Nunito Sans | 18px | 700 | 24px | — |
| body-lg | Inter | 16px | 400 | 24px | — |
| body-md | Inter | 14px | 400 | 20px | — |
| label-sm | Inter | 12px | 600 | 16px | 0.01em |

### Spacing (4px base grid)
- xs: 4px | sm: 8px | md: 16px | lg: 24px | xl: 32px
- gutter: 16px | margin-mobile: 16px | margin-tablet: 32px

### Corner Radius
- sm: 4px | DEFAULT: 8px | md: 12px | lg: 16px | xl: 24px | full: 9999px

### Elevation (Ambient Shadows — no harsh borders)
- Level 0 (Base): #fcf9f8 background
- Level 1 (Cards): White + soft 12% shadow (0px 4px 20px)
- Level 2 (Modals/Sticky): High-diffusion shadow

---

## Component Specs

### Buttons
- **Primary:** Filled Amber (#ff7a30), 16px radius, white bold text
  → Main actions: "Join Group Buy", "Commit"
- **Secondary:** Outlined Deep Teal (#0e6a5b), 1.5px stroke, teal text
  → Secondary: "Message Seller", "View Details"

### Category Chips
- Pill-shaped (full radius / 9999px)
- Background: Light tint of primary or neutral grey (#e4e2e1)
- Text: Charcoal (#1b1c1c), 12px, semi-bold

### Deal Card
- 16px rounded white card
- Header: Full-bleed image + top-right "Countdown Badge" (Deep Teal bg, white text)
- Body: Title (Nunito 16px), Price (Amber 18px Bold), Location Pin (Teal icon)
- Footer: Progress bar — "Members Joined" toward group-buy goal

### User Avatar & Trust
- Circular profile images
- Verified Badge: 14px Teal circle + white checkmark, bottom-right overlay

### Bottom Tab Bar
- Fixed 64px height, soft white background
- Center "Post" → FAB variant: larger, circular, Amber Orange
- Icons: Linear, 24px, 2px stroke

### Navigation
- Bottom tabs: Home, Search, Post (FAB), Orders, Profile
- Back navigation: Top-left arrow

---

## Layout
- Mobile-first: 4-column fluid grid
- 16px side margins
- 12px card spacing (vertical rhythm)
- Touch targets: minimum 44x44px
- Safe areas: iOS notch + bottom bar respected

---

## Screen Inventory (from Stitch)
1. Home Feed (deals)
2. Search + Results
3. Deal Detail
4. Group Buy Detail
5. Order Checkout
6. Join Group Buy
7. Order Confirmed
8. Payment Selection
9. Location/Pickup Picker
10. Plus additional variants (login, profile, settings, etc.)

---

## Tech Stack (planned)
- **Frontend:** React Native (Expo)
- **Backend:** .NET Core 10
- **Search/Analytics:** Elastic Search
- **Database:** PostgreSQL
- **API Style:** REST

---

*Stitch Project ID: 13309447277577605557*
*Last synced: 2026-07-25*
