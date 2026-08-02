# KitaTolongKita — Feature Pipeline Plan
**Generated:** 2026-08-02 | **Phases:** 4 | **Status:** Ready to Build

---

## 🎯 Overview: 9 Feature Areas, 4 Phases

| # | Feature | Impact Scope | Priority |
|---|---|---|---|
| 1 | Comments on Deals | API, ES, Mobile App | P0 |
| 2 | Reposts | API, ES, Mobile App | P0 |
| 3 | Follow System | API, Mobile App | P0 |
| 4 | Follow Notifications + Alerts | API, FCM, Mobile App | P0 |
| 5 | Cleaner User Profile (tabs) | Mobile App, API | P0 |
| 6 | Contributor System (KYC + Deal Mgmt) | API, Admin API, FCM | P0 |
| 7 | Booking + QR Delivery Proof | API, FCM, Mobile App | P1 |
| 8 | Reviews + Ratings | API, ES, Mobile App | P1 |
| 9 | Additional Compliance + AI Features | Admin API, AI Moderation | P2 |

---

## 🔷 PHASE 0 — Social Foundation (Infrastructure)
*Must build before everything else. Required by all other phases.*

### F0.1: Follow System
**What:** Users follow users. Unidirectional (Instagram-style, not mutual friend requirement).

#### Data Model Changes

**New table: `user_follows`**
```
user_follows
  id              UUID PK
  follower_id     UUID FK → users (the person following)
  following_id    UUID FK → users (the person being followed)
  created_at      TIMESTAMP
  UNIQUE(follower_id, following_id)
  INDEX on (following_id) for "followers" queries
  INDEX on (follower_id) for "following" queries
```

#### Backend API (`backend/src/`)
- `FollowController` or extend `UsersController`:
  - `POST /api/users/{id}/follow` — follow a user
  - `DELETE /api/users/{id}/follow` — unfollow
  - `GET /api/users/{id}/followers?page=&size=` — list followers (paginated)
  - `GET /api/users/{id}/following?page=&size=` — list following (paginated)
  - `GET /api/users/me/followers?page=&size=` — own followers
  - `GET /api/users/me/following?page=&size=` — own following
  - `GET /api/users/{id}/follow-status?targetId=` — is current user following target?

**Elasticsearch impact:** NONE (follow data is relational, not searched)

**Cache opportunities:**
- `follow:count:{userId}` — follower count, following count (TTL 5 min, invalidate on follow/unfollow)
- `follow:status:{userId}:{targetId}` — cached follow status

**Files to change:**
- `Core/Entities/User.cs` — add `Followers`, `Following` navigation (or keep separate table)
- `Infrastructure/Data/AppDbContext.cs` — add `UserFollows` DbSet
- New `FollowController.cs`
- `Infrastructure/Services/NotificationService.cs` — create follow notification

#### Admin API (`admin/src/`)
- `GET /api/users/{id}/followers` — admin view
- `GET /api/users/{id}/following` — admin view
- No write operations for admin (users manage themselves)

#### Mobile App API (`api/users/{id}/followers`, `following`)
- Profile screen shows follower/following counts (tap to see list)
- Follow button on user profile screens
- Pull-to-refresh on follower/following lists

---

### F0.2: Comments on Deals
**What:** Users comment on deal posts. Threaded/nested not required for v1 (flat comments only).

#### Data Model

**New table: `deal_comments`**
```
deal_comments
  id              UUID PK
  deal_id         UUID FK → deals
  user_id         UUID FK → users
  parent_id       UUID FK → deal_comments (nullable, for future nesting)
  content         TEXT (max 500 chars — enforced in API)
  created_at      TIMESTAMP
  updated_at      TIMESTAMP
  is_hidden       BOOLEAN default false  (moderation: admin can hide)
  INDEX on (deal_id, created_at desc)
  INDEX on (user_id)
```

#### Backend API
- `CommentsController`:
  - `GET /api/deals/{dealId}/comments?page=&size=` — list comments (newest first)
  - `POST /api/deals/{dealId}/comments` — add comment (body: `{ "content": "..." }`)
  - `DELETE /api/comments/{id}` — delete own comment (soft delete: set content="[deleted]")
  - `PATCH /api/admin/comments/{id}/hide` — admin hide comment
  - `GET /api/deals/{dealId}/comments/count` — total comment count

**Character limit:** 500 chars enforced server-side (and client-side)

**Elasticsearch impact:**
- Add `comment_count` field to `EsDeal` — update on every new comment
- ES sync: `CommentService.CreateCommentAsync` calls `DealService.UpdateDealAsync` to bump comment_count in ES
- OR: Background job recalculates comment counts periodically (every 5 min)
- **Recommendation:** Sync comment_count synchronously (lightweight update)

**Cache opportunities:**
- `deal:comments:{dealId}:page:{n}` — paginated comments (TTL 1 min)
- `deal:comment_count:{dealId}` — total count (TTL 1 min, invalidate on new comment)

**Files to change:**
- `Core/Entities/DealComment.cs` (new entity)
- `Infrastructure/Data/AppDbContext.cs` — add `DealComments` DbSet
- `Controllers/CommentsController.cs` (new)
- `Infrastructure/Services/CommentService.cs` (new — handles comment logic + ES update)
- `ElasticsearchService.cs` — add `comment_count` to `EsDeal`, add `UpdateCommentCountAsync`

#### Admin API
- `GET /api/admin/comments?dealId=&userId=&page=&size=` — browse all comments
- `PATCH /api/admin/comments/{id}/hide` — hide comment (is_hidden=true)
- `DELETE /api/admin/comments/{id}` — hard delete (rare, full removal)

#### Mobile App
- Deal detail screen: comments section below deal info
- Comment input box (sticky at bottom, 500 char limit shown)
- Comment list with avatar, name, time ago, content
- Swipe to delete own comment

---

### F0.3: Reposts
**What:** Users can repost a deal to their own profile. Appears in a dedicated "Reposts" tab on profile.

#### Data Model

**New table: `deal_reposts`**
```
deal_reposts
  id              UUID PK
  deal_id         UUID FK → deals
  user_id         UUID FK → users (the reposter)
  created_at      TIMESTAMP
  UNIQUE(deal_id, user_id)  (one repost per user per deal)
  INDEX on (user_id, created_at desc)
```

#### Repost vs Original Deal
- Repost is a **reference** to the original deal, not a copy
- When original deal is deleted/expired, repost shows "[Deal no longer available]"
- Original deal creator is credited in UI: "Reposted by @username from @organizer"

#### Backend API
- `RepostsController`:
  - `POST /api/deals/{dealId}/repost` — repost a deal
  - `DELETE /api/deals/{dealId}/repost` — undo repost
  - `GET /api/users/{userId}/reposts?page=&size=` — user's reposts (for profile tab)
  - `GET /api/deals/{dealId}/repost-count` — how many times reposted
  - `GET /api/users/{userId}/repost-status/{dealId}` — has user reposted?

**Elasticsearch impact:**
- Add `repost_count` field to `EsDeal`
- Add `repost_count` sync in `RepostService.CreateRepostAsync` / `DeleteRepostAsync`

**Cache opportunities:**
- `deal:repost_count:{dealId}` — invalidate on repost/unrepost
- `user:reposts:{userId}:page:{n}` — paginated reposts list (TTL 1 min)

#### Mobile App
- Deal detail: repost button (same row as like/upvote)
- User profile: new "Reposts" tab between "Deals" and "LookUps"
- Show "Reposted by @reposter from @originalOrganizer" attribution

---

## 🔷 PHASE 1 — Profile + Notifications

### F1.1: Follow Notifications + Toggle Alerts
**What:** When someone follows you, you get a push notification. You can also opt-in to get notified when someone you follow posts a new deal.

#### Notification Types (extend existing `NotificationType` enum)
```
New types:
- "Follow"          — someone followed you
- "NewDealFromFollowed" — someone you follow posted a new deal
```

#### Backend API Changes
- `FollowService.CreateFollowAsync` → after DB insert, call `PushService.SendAsync(userId, "Follow", …)`
- When `DealService.CreateDealAsync` completes → check all followers of `deal.OrganizerId`, send "NewDealFromFollowed" to each (batch: collect all follower tokens, send in one loop)
  - **Performance note:** Don't block deal creation. Fire-and-forget: enqueue notification job
  - Add `INotificationQueueService` with `EnqueueAsync(notification)` + background worker

#### Notification Alert Toggle
**New table: `user_notification_preferences`**
```
user_notification_preferences
  id                  UUID PK
  user_id             UUID FK → users (unique)
  notify_follow       BOOLEAN default true   (someone followed me)
  notify_followed_deal BOOLEAN default false (someone I follow posted)
  notify_likes        BOOLEAN default true
  notify_comments     BOOLEAN default true
  notify_lookups      BOOLEAN default true
  updated_at          TIMESTAMP
```

- `PATCH /api/users/me/notification-preferences` — update preferences
- `GET /api/users/me/notification-preferences` — get current preferences
- Check these flags before sending each notification type

**Elasticsearch impact:** NONE

---

### F1.2: Cleaner User Profile Page
**What:** Redesign profile to show organized tabs.

#### Profile Tabs (4 tabs)
| Tab | Data Source | Content |
|-----|-----------|---------|
| **Deals** | `GET /api/users/{id}/deals` | User's own posted deals |
| **Reposts** | `GET /api/users/{id}/reposts` | Reposted deals |
| **LookUps** | `GET /api/users/{id}/lookups` | Group buy join records (existing `Orders` table, status=Secured) |
| **Ratings** | `GET /api/users/{id}/ratings` | Reviews received as contributor |

#### Profile Header (redesign)
```
┌─────────────────────────────────────┐
│  Avatar   Name            [Edit]   │
│  @handle  Bio (max 160 chars)      │
│  📍 City  🌐 Website               │
├─────────────────────────────────────┤
│  120 Deals  │  3.2K Followers │ Following │
├─────────────────────────────────────┤
│  [Follow] [Message]                │
└─────────────────────────────────────┘
```

**New fields on `users` table:**
```
users
  bio             VARCHAR(160)
  city            VARCHAR(100)
  website         VARCHAR(255)
  is_verified     BOOLEAN default false  (manual or auto verification)
```

- `PATCH /api/users/me/profile` — update bio, city, website
- `PATCH /api/users/me/avatar` — upload avatar (or `POST /api/upload`)

**Elasticsearch impact:**
- Add `bio`, `city`, `is_verified` to `EsUser` (for search)
- User search endpoint `GET /api/users/search?q=` can search by name/bio

#### API Changes
- `GET /api/users/{id}/deals?page=&size=` — paginated user's own deals
- `GET /api/users/{id}/profile` — full profile with counts (deals, reposts, followers, following)
- Add `profile` field to `UserDto` (bio, city, website, is_verified, follower_count, following_count)

---

## 🔷 PHASE 2 — Contributor System

*This is the most complex phase. It fundamentally changes how certain users operate on the platform.*

### F2.1: Contributor KYC Application
**What:** Regular users can apply to become contributors. Submit personal info for admin review.

#### Data Model

**New table: `contributor_applications`**
```
contributor_applications
  id                  UUID PK
  user_id             UUID FK → users (unique, one active application per user)
  status              VARCHAR(20)  -- "Pending", "UnderReview", "Approved", "OnHold", "Rejected"
  rejection_reason    TEXT nullable
  reviewed_by         INT FK → admin_users nullable
  reviewed_at         TIMESTAMP nullable
  created_at          TIMESTAMP
  updated_at          TIMESTAMP

  -- KYC Fields (encrypted at rest)
  mobile_no           VARCHAR(20)
  ic_passport_no       VARCHAR(50)
  nationality          VARCHAR(50)
  race                 VARCHAR(50)
  resident_status      VARCHAR(20)  -- "Resident" | "Non-Resident"

  -- On approval:
  approved_at         TIMESTAMP nullable
```

**New column on `users` table:**
```
users
  is_contributor       BOOLEAN default false
  contributor_since    TIMESTAMP nullable
  contributor_rating   DECIMAL(3,2) nullable  (average of ratings received)
```

#### Contributor Application Flow
```
User submits application → status="Pending"
    ↓ (auto or admin assigns)
Admin reviews → status="UnderReview"
    ↓ Admin decision
    ├── "Approved"   → user.is_contributor=true, notify user
    ├── "OnHold"     → notify user with reason
    └── "Rejected"   → notify user with reason, application closed
```

#### Backend API
- `POST /api/contributor/apply` — submit application (user must not have active application)
  - Body: `{ mobile_no, ic_passport_no, nationality, race, resident_status }`
  - Validation: all fields required, IC/passport format check
  - Returns 409 if application already exists
- `GET /api/contributor/application/status` — get my application + status
- `DELETE /api/contributor/application` — withdraw pending application
- `PATCH /api/contributor/profile` — update contributor public profile (bio, etc.) once approved

#### Admin API — New Controller
`ContributorApplicationsController`:
- `GET /api/admin/contributor-applications?status=&page=&size=` — list all applications
- `GET /api/admin/contributor-applications/{id}` — application detail + user info
- `PATCH /api/admin/contributor-applications/{id}/review` — approve/hold/reject
  - Body: `{ "action": "approve|hold|reject", "reason": "..." }`
  - `action=approve` → sets `status=Approved`, sets `user.is_contributor=true`
  - `action=hold` → sets `status=OnHold`, reason stored
  - `action=reject` → sets `status=Rejected`, permanent rejection
- `GET /api/admin/contributors` — list all approved contributors
- `PATCH /api/admin/contributors/{userId}/revoke` — revoke contributor status (sets `is_contributor=false`)

**Push notifications:**
- Application approved → "Congratulations! You are now a contributor. You can start posting deals."
- Application rejected → "Your contributor application was not approved. Reason: ..."
- Application on hold → "Your application is under review. We'll update you soon."

---

### F2.2: Contributor Deal Posting + Lookup/Group Management
**What:** Contributors post deals that require a minimum number of buyers (LookUps). Status transitions from `Open` → `Secured` → `InProcess` → `Completed`.

#### Deal Status Lifecycle (extend `DealStatus` enum)
```
Existing: Draft, Active, Cancelled, Completed
New sub-status for group buy:
  Open       — accepting lookups (group buy not yet secured)
  Secured    — minimum members reached, awaiting dispatch
  InProcess  — contributor is fulfilling orders
  Dispatched — orders being delivered
  Completed  — all orders delivered + confirmed
  Expired    — deadline passed without securing minimum
```

#### Deal Fields (extend `deals` table)
```
deals
  [existing fields]
  contributor_id     UUID FK → users (the contributor, null for regular deals)
  deal_type          VARCHAR(20) -- "Standard" | "GroupBuy"
  lookup_status      VARCHAR(20) -- "Open" | "Secured" | "InProcess" | "Dispatched" | "Completed" | "Expired"
  lookup_deadline    TIMESTAMP   -- when lookup period ends (can be same as deadline)
  etp                TIMESTAMP nullable  -- Estimated Time of Purchase (when secured)
  etd                TIMESTAMP nullable  -- Estimated Time of Delivery
  delivery_mode      VARCHAR(30) nullable -- "ContributorDeliver" | "SelfCollect"
  dispatch_notes     TEXT nullable
  min_lookups        INT default 1  -- minimum orders to secure (for GroupBuy)
  current_lookups    INT default 0  -- current count of secured orders
```

#### Lookup System (Orders become Lookups)
**New table: `deal_lookups`**
```
deal_lookups
  id                  UUID PK
  deal_id             UUID FK → deals
  user_id             UUID FK → users
  quantity            INT default 1
  status              VARCHAR(20)  -- "Pending" | "Secured" | "InProcess" | "Delivered" | "Cancelled"
  booking_id          VARCHAR(20) unique  -- human readable: "LK-XXXXXXXX"
  qr_code             TEXT          -- generated unique QR content (UUID-based)
  qr_verified         BOOLEAN default false
  qr_verified_at      TIMESTAMP nullable
  qr_verified_by      UUID FK → users nullable (contributor who scanned)
  created_at          TIMESTAMP
  updated_at          TIMESTAMP
  UNIQUE(deal_id, user_id)  (one lookup per user per deal)
  INDEX on (deal_id, status)
  INDEX on (contributor_id)  (for contributor's lookup management)
```

#### Booking ID Generation
```
Format: "LK-" + 8 uppercase alphanumeric
Example: "LK-A3F7B2C1"
Algorithm: Deterministic from lookup UUID (no random collisions)
```

#### QR Code Content
```
JSON: { "bookingId": "LK-A3F7B2C1", "lookupId": "<uuid>", "dealId": "<uuid>", "userId": "<uuid>" }
```
- Generated server-side as UTF-8 string, encoded to Base64 for QR library
- QR displayed on user's order confirmation screen

#### Lookup Status Transitions
```
Pending → (min members reached) → Secured
Secured → (contributor starts dispatch) → InProcess
InProcess → (QR scanned by contributor) → Delivered
Any stage → (contributor cancels) → Cancelled
```

#### Backend API — Lookup/Deal Management
**Contributor Deal Management:**
- `POST /api/contributor/deals` — contributor creates a group buy deal
  - Body: extends normal deal creation + `deal_type="GroupBuy"`, `min_lookups`, `lookup_deadline`, `delivery_mode`
- `GET /api/contributor/deals?status=` — contributor's own deals with lookup stats
- `PATCH /api/contributor/deals/{id}/status` — update deal lookup_status
  - `status=InProcess` → requires `etp` to be set (system calculates based on secured count)
  - `status=Dispatched` → requires all secured lookups to be assigned booking IDs + QR codes generated
- `GET /api/contributor/deals/{id}/lookups?status=` — list lookups for a deal (with booking IDs)
- `PATCH /api/contributor/lookups/{id}/status` — update individual lookup status
- `POST /api/contributor/lookups/{id}/verify-qr` — scan QR and mark as delivered
  - Body: `{ "qr_content": "<base64 json>" }` — verify bookingId + lookupId match, mark `qr_verified=true`

**Buyer Side:**
- Existing `POST /api/orders` → becomes `POST /api/deals/{id}/lookup` (or keep both for backwards compat)
- `GET /api/lookups` — my lookups across all deals
- `GET /api/lookups/{id}` — detail with booking_id + qr_code

**Notification triggers:**
- Lookup confirmed → "Your lookup for {dealTitle} is confirmed! Booking ID: {bookingId}"
- Deal Secured → "Deal '{title}' has reached minimum lookups! Contributor is preparing dispatch."
- Delivery dispatched → "Your order is on the way! Booking ID: {bookingId}"

#### Admin API
- `GET /api/admin/lookups?dealId=&status=&page=` — view all lookups
- `PATCH /api/admin/lookups/{id}/status` — admin can override lookup status
- `GET /api/admin/lookups/export` — CSV export of lookups

---

## 🔷 PHASE 3 — Reviews + Ratings

### F3.1: Reviews + Ratings System
**What:** After a lookup is delivered, buyer can rate the contributor and leave a review.

#### Data Model

**New table: `contributor_ratings`**
```
contributor_ratings
  id                  UUID PK
  lookup_id           UUID FK → deal_lookups (unique, one review per lookup)
  deal_id             UUID FK → deals
  contributor_id      UUID FK → users
  reviewer_id         UUID FK → users
  rating              INT CHECK(rating >= 1 AND rating <= 5)
  review_text         TEXT (max 300 chars)
  created_at          TIMESTAMP
  INDEX on (contributor_id, created_at desc)
  INDEX on (deal_id)
```

#### Rating Calculation
```
contributor.contributor_rating = AVG(contributor_ratings.rating)
```
- Update via trigger or application logic after each new rating
- Store computed average in `users.contributor_rating` for fast display

#### Backend API
- `POST /api/lookups/{lookupId}/rate` — submit rating
  - Body: `{ "rating": 5, "review": "Great deal, on time delivery!" }`
  - Can only rate if lookup status = "Delivered"
  - Can only rate once per lookup
- `GET /api/contributors/{userId}/ratings?page=&size=` — ratings received
- `GET /api/users/{userId}/ratings-received` — alias for profile tab
- `DELETE /api/ratings/{id}` — delete own rating (within 24 hours of posting)
- `GET /api/contributors/{userId}/rating-summary` — `{ average: 4.7, count: 42 }`

**Elasticsearch impact:**
- Add `contributor_rating` and `contributor_rating_count` to `EsDeal` for sorting/filtering
- `EsDeal` already has organizer info — no new index mapping needed

#### Mobile App
- After delivery confirmation → prompt "Rate your experience"
- Contributor profile: shows rating breakdown (5⭐ = 40%, 4⭐ = 30%...)
- "Reviews" tab on contributor's profile

---

## 🔷 PHASE 4 — Compliance + AI Features

### F4.1: AI Content Moderation for Comments
**What:** Auto-moderate comments using the existing AI moderation pipeline before publishing.

#### Implementation
- `CommentService.CreateCommentAsync` → before saving, call `ModerationService.AnalyzeTextAsync(comment.content)`
- If AI score ≥ 80 → publish immediately
- If AI score 50-79 → set `comment.is_hidden=true`, `comment.moderation_status="PendingReview"`
- If AI score < 50 → set `comment.is_hidden=true`, `comment.moderation_status="Rejected"`, do NOT save visible
- Reuse existing `AzureOpenAiModerationService` or `OpenAiModerationService`

**Admin API:**
- `GET /api/admin/comments?moderationStatus=PendingReview` — auto-flagged comments
- `PATCH /api/admin/comments/{id}/approve` — unhide approved comment
- `PATCH /api/admin/comments/{id}/reject` — keep hidden + record rejection reason

### F4.2: Deal Report/Flag System
**What:** Users can report deals (spam, misleading, inappropriate).

**New table: `deal_reports`**
```
deal_reports
  id              UUID PK
  deal_id         UUID FK → deals
  reporter_id     UUID FK → users
  reason          VARCHAR(50)  -- "Spam" | "Misleading" | "Inappropriate" | "Fraud" | "Other"
  description     TEXT nullable
  status          VARCHAR(20)  -- "Pending" | "Reviewed" | "Actioned"
  created_at      TIMESTAMP
  INDEX on (deal_id, status)
```

- `POST /api/deals/{id}/report` — report a deal
- `GET /api/admin/reports?status=&page=` — admin list
- `PATCH /api/admin/reports/{id}` — mark reviewed/actioned

### F4.3: User Verification Badges
**What:** Admin can verify contributors (blue checkmark style).

**Implementation:**
- Add `is_verified` to `users` table (already in F1.2)
- `PATCH /api/admin/users/{id}/verify` — toggle verified status
- `PATCH /api/admin/users/{id}/revoke-verification` — remove badge
- Verified badge shows in deal cards, profile page

### F4.4: Audit Log for Contributor Actions
**What:** All contributor status changes + lookup management logged to admin audit trail.

**Already available:** The existing `AuditLogs` table in Admin DB can log these.
- `CONTRIBUTOR_APPLICATION_SUBMITTED`
- `CONTRIBUTOR_APPLICATION_APPROVED`
- `CONTRIBUTOR_APPLICATION_REJECTED`
- `CONTRIBUTOR_STATUS_REVOKED`
- `LOOKUP_STATUS_CHANGED`
- `DEAL_LOOKUP_STATUS_CHANGED`

### F4.5: Push Notification Queue (Background Worker)
**What:** Move all push notifications from synchronous to async queue.

**New: `NotificationQueueService` (BackgroundService)**
```
InMemoryChannel<NotificationJob> queue:
  - FollowNotification(userId, followerName)
  - NewDealNotification(followerId, dealId, contributorName)
  - LookupStatusNotification(userId, dealTitle, newStatus, bookingId)
  - RatingReceivedNotification(contributorId, rating)
  
Worker: foreach job in channel.Reader.ReadAllAsync():
  await PushService.SendAsync(...)
```

Benefits: Deal creation is not blocked by notification sending.

---

## 📊 Complete File Change Manifest

### Backend API (`backend/src/`)

#### New Files
| File | Feature | Purpose |
|------|---------|---------|
| `Core/Entities/UserFollow.cs` | F0.1 | Follow entity |
| `Core/Entities/DealComment.cs` | F0.2 | Comment entity |
| `Core/Entities/DealRepost.cs` | F0.3 | Repost entity |
| `Core/Entities/ContributorApplication.cs` | F2.1 | KYC application entity |
| `Core/Entities/DealLookup.cs` | F2.2 | Group buy lookup entity |
| `Core/Entities/ContributorRating.cs` | F3.1 | Rating entity |
| `Core/Entities/DealReport.cs` | F4.2 | Report entity |
| `Core/Entities/UserNotificationPreference.cs` | F1.1 | Notif preferences entity |
| `Controllers/FollowController.cs` | F0.1 | Follow/unfollow endpoints |
| `Controllers/CommentsController.cs` | F0.2 | Comment CRUD |
| `Controllers/RepostsController.cs` | F0.3 | Repost endpoints |
| `Controllers/ContributorController.cs` | F2.1 | Contributor application |
| `Controllers/LookupsController.cs` | F2.2 | Lookup/booking management |
| `Controllers/RatingsController.cs` | F3.1 | Rating submission |
| `Controllers/ReportsController.cs` | F4.2 | Deal reporting |
| `Services/FollowService.cs` | F0.1 | Follow business logic |
| `Services/CommentService.cs` | F0.2 | Comment logic + ES sync |
| `Services/RepostService.cs` | F0.3 | Repost logic + ES sync |
| `Services/ContributorService.cs` | F2.1 | KYC application logic |
| `Services/LookupService.cs` | F2.2 | Booking ID + QR generation |
| `Services/NotificationQueueService.cs` | F4.5 | Async notification worker |
| `Services/RatingService.cs` | F3.1 | Rating logic |

#### Modified Files
| File | Changes |
|------|---------|
| `Core/Entities/Deal.cs` | Add `contributor_id`, `deal_type`, `lookup_status`, `min_lookups`, `current_lookups`, `etp`, `etd`, `delivery_mode`, `dispatch_notes`, `lookup_deadline` |
| `Core/Entities/User.cs` | Add `is_contributor`, `contributor_since`, `contributor_rating`, `bio`, `city`, `website`, `is_verified` |
| `Core/Entities/DealStatus.cs` | Add `Open`, `Secured`, `InProcess`, `Dispatched`, `Expired` |
| `Infrastructure/Data/AppDbContext.cs` | Register all new DbSets, configure relationships |
| `Infrastructure/Services/ElasticsearchService.cs` | Add `comment_count`, `repost_count`, `contributor_rating` to `EsDeal` |
| `Infrastructure/Services/NotificationService.cs` | Add `SendFollowNotification`, `SendNewDealNotification` |
| `Controllers/DealsController.cs` | Add `lookup` endpoints, update status transitions |
| `Controllers/UsersController.cs` | Add profile update, notification prefs, follower/following |
| `Controllers/NotificationsController.cs` | Add notification type filters |
| `Program.cs` | Register new services, add notification queue background service |

### Admin API (`admin/src/`)

#### New Files
| File | Purpose |
|------|---------|
| `Controllers/ContributorApplicationsController.cs` | KYC application management |
| `Controllers/CommentsController.cs` | Comment moderation |
| `Controllers/ReportsController.cs` | Deal report management |
| `Controllers/FollowsController.cs` | View user follows (read-only) |
| `DTOs/ContributorDTOs.cs` | KYC + contributor DTOs |

#### Modified Files
| File | Changes |
|------|---------|
| `Services/AdminService.cs` | Add contributor management methods |
| `Data/AdminDbContext.cs` | (already has Categories from prior work) |
| `DTOs/DTOs.cs` | Add ContributorApplication, Rating, Report DTOs |
| `Controllers/UsersController.cs` | Add `followers`, `following` list + `verify` toggle |

### Admin Portal Frontend (`admin-portal/`)

#### New Pages
| Page | Purpose |
|------|---------|
| `app/contributor-applications/page.tsx` | KYC application review queue |
| `app/comments/page.tsx` | Comment browser + moderation |
| `app/reports/page.tsx` | Deal reports queue |
| `app/contributors/page.tsx` | Approved contributor list |

#### Updated Pages
| Page | Changes |
|------|---------|
| `app/users/page.tsx` | Add "Verify" badge toggle, view followers/following |
| `app/deals/page.tsx` | Add GroupBuy type filter, lookup status filter |
| `Sidebar.tsx` | Add Comments, Reports, Contributor Applications links |

### Mobile App (`kitaTolongkita/`)

#### New Screens
| Screen | Feature |
|--------|---------|
| `FollowersScreen` | List of followers (tap from profile) |
| `FollowingScreen` | List of following (tap from profile) |
| `CommentsScreen` | Full comment list for a deal |
| `RepostsScreen` | User's reposts tab |
| `LookupsScreen` | User's group buy orders |
| `ContributorApplyScreen` | KYC form |
| `ContributorDashboardScreen` | Manage deals + lookups |
| `LookupDetailScreen` | Booking ID + QR code display |
| `RatingScreen` | Post-delivery rating flow |

#### Updated Screens
| Screen | Changes |
|--------|---------|
| `ProfileScreen` | Redesign with 4 tabs (Deals, Reposts, LookUps, Ratings) |
| `DealDetailScreen` | Add comments section, repost button |
| `UserProfileScreen` | Follow button, follower/following counts |
| `NotificationScreen` | Add Follow + NewDealFromFollowed notification types |
| `SettingsScreen` | Add notification preference toggles |

### Elasticsearch Index Changes

#### `EsDeal` — Add fields
```
comment_count        integer   — updated on comment create/delete
repost_count         integer   — updated on repost/create delete
contributor_rating   float     — copied from deal.contributor.contributor_rating
deal_type            keyword   — "Standard" | "GroupBuy"
lookup_status        keyword   — "Open" | "Secured" | "InProcess" | ...
min_lookups          integer
current_lookups      integer
```

#### `EsUser` — Add fields (new index)
```
bio                  text
city                 text
is_verified          boolean
follower_count       integer
following_count      integer
is_contributor      boolean
contributor_rating   float
```

---

## 🗄️ Database Migration Strategy

All Phase 0-3 changes should be applied as **sequential migrations** using EF Core migrations:

```
Migration 001: AddUserFollows
Migration 002: AddDealComments  
Migration 003: AddDealReposts
Migration 004: AddUserNotificationPreferences
Migration 005: AddUserProfileFields (bio, city, website, is_verified)
Migration 006: AddContributorSystem (applications, is_contributor, contributor_rating)
Migration 007: AddGroupBuyFields (deals: contributor_id, deal_type, lookup_status, etc.)
Migration 008: AddDealLookups (bookings, QR codes)
Migration 009: AddContributorRatings
Migration 010: AddDealReports
Migration 011: AddSearchIndexes (EsUser, new EsDeal fields)
```

Run each migration with comments. Test rollback on staging first.

---

## 🚀 Recommended Build Order

### Phase 0 — Week 1
1. **F0.1 Follow System** — Foundation for all social features
2. **F0.2 Comments** — Simple CRUD, important for engagement
3. **F0.3 Reposts** — Quick add, high engagement value

### Phase 1 — Week 2
4. **F1.1 Follow Notifications + Toggles** — Depends on F0.1
5. **F1.2 Profile Redesign** — Depends on F0.1, F0.3, F3.1

### Phase 2 — Week 3-4 (Most Complex)
6. **F2.1 Contributor KYC** — High complexity, admin workflow
7. **F2.2 Contributor Deal + Lookup Management** — Depends on F2.1, complex state machine

### Phase 3 — Week 5
8. **F3.1 Reviews + Ratings** — Depends on F2.2 (need delivered lookups to rate)

### Phase 4 — Week 6 (Can run parallel to others)
9. **F4.1-F4.5** — AI moderation, reports, badges, audit, async notifications

---

## 📦 Deferred / Configurable (v2+)

| Feature | Notes |
|---------|-------|
| Nested/threaded comments | v2 — add `parent_id` support |
| Real-time chat (WebSocket) | v2 — replace polling with SignalR |
| Contributor tier/levels | v2 — bronze/silver/gold based on volume |
| Deal categories as ES faceted filter | v2 — add category aggregation to search |
| AI duplicate deal detection on comments | v2 — extend existing `more_like_this` |
| Payment integration | Separate epic — not part of this pipeline |
| In-app wallet | Separate epic |
| Referral system | v2 |

---

## ✅ Pre-Launch Checklist

- [ ] Load test: Create 10K comments, verify ES comment_count sync
- [ ] Load test: 100 concurrent lookups on same deal, verify booking ID generation
- [ ] QR code scanning test: offline scenario, duplicate scan prevention
- [ ] Push notification delivery rate test (FCM)
- [ ] Admin KYC review UI usability test
- [ ] Mobile app: all new screens at various iPhone/Android screen sizes
- [ ] Migration rollback test on staging
- [ ] Redis cache warming on VPS deployment
