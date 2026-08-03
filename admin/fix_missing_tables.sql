-- ============================================================================
-- Phase 0-4 Database Migration for kitatolongkita
-- Run against the kitatolongkita database (not kitatolongkita_admin!)
-- ============================================================================
-- Usage:
--   docker exec kita-postgres psql -U postgres -d kitatolongkita -f /tmp/fix_missing_tables.sql
--   or from VPS: psql -U postgres -d kitatolongkita -f fix_missing_tables.sql
-- ============================================================================

-- Check what tables exist
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Users" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "Email" text NOT NULL,
    "Phone" text,
    "FullName" text NOT NULL,
    "AvatarUrl" text,
    "GoogleId" text,
    "PasswordHash" text,
    "EmailVerified" boolean NOT NULL DEFAULT false,
    "PhoneVerified" boolean NOT NULL DEFAULT false,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    "LastLoginAt" timestamp,
    "LastKnownLatitude" double precision,
    "LastKnownLongitude" double precision,
    "LocationUpdatedAt" timestamp,
    "Status" integer NOT NULL DEFAULT 0,
    "Bio" text,
    "City" text,
    "Website" text,
    "IsVerified" boolean NOT NULL DEFAULT false,
    "IsContributor" boolean NOT NULL DEFAULT false,
    "ContributorSince" timestamp,
    "ContributorRating" numeric
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_Users_Email" ON "Users" ("Email");
CREATE INDEX IF NOT EXISTS "IX_Users_GoogleId" ON "Users" ("GoogleId");

-- ── Deals ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Deals" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "OrganizerId" uuid,
    "Title" text NOT NULL,
    "Description" text NOT NULL,
    "Category" text NOT NULL,
    "OriginalPrice" numeric(10,2) NOT NULL,
    "GroupPrice" numeric(10,2) NOT NULL,
    "MinMembers" integer NOT NULL DEFAULT 1,
    "MaxMembers" integer NOT NULL DEFAULT 100,
    "MembersJoined" integer NOT NULL DEFAULT 0,
    "Deadline" timestamp NOT NULL,
    "PickupLocation" text NOT NULL,
    "ImageUrl" text,
    "ImageUrls" text[] NOT NULL DEFAULT '{}',
    "Status" integer NOT NULL DEFAULT 0,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    "PublishedAt" timestamp,
    "DealCategory" integer NOT NULL DEFAULT 0,
    "Latitude" double precision,
    "Longitude" double precision,
    "LocationName" text,
    "Hashtags" text[] NOT NULL DEFAULT '{}',
    "UpvoteCount" integer NOT NULL DEFAULT 0,
    "LikeCount" integer NOT NULL DEFAULT 0,
    "VerificationCount" integer NOT NULL DEFAULT 0,
    "LastVerifiedAt" timestamp,
    "ModerationStatus" integer NOT NULL DEFAULT 0,
    "ModerationScore" integer,
    "ModerationFlags" text[] NOT NULL DEFAULT '{}',
    "ModerationRejectReason" text,
    "DuplicateOfDealId" text,
    "ContributorId" uuid,
    "DealType" text NOT NULL DEFAULT 'Standard',
    "LookupStatus" text NOT NULL DEFAULT 'None',
    "LookupDeadline" timestamp,
    "MinLookups" integer NOT NULL DEFAULT 0,
    "CurrentLookups" integer NOT NULL DEFAULT 0,
    "Etp" timestamp,
    "Etd" timestamp,
    "DeliveryMode" text,
    "DispatchNotes" text,
    CONSTRAINT "FK_Deals_Users_OrganizerId" FOREIGN KEY ("OrganizerId") REFERENCES "Users"("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_Deals_Users_ContributorId" FOREIGN KEY ("ContributorId") REFERENCES "Users"("Id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IX_Deals_Status" ON "Deals" ("Status");
CREATE INDEX IF NOT EXISTS "IX_Deals_Category" ON "Deals" ("Category");
CREATE INDEX IF NOT EXISTS "IX_Deals_Deadline" ON "Deals" ("Deadline");
CREATE INDEX IF NOT EXISTS "IX_Deals_OrganizerId" ON "Deals" ("OrganizerId");

-- ── DealOrders ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DealOrders" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "DealId" uuid,
    "BuyerId" uuid,
    "Quantity" integer NOT NULL DEFAULT 1,
    "TotalPrice" numeric(10,2) NOT NULL,
    "Status" text NOT NULL DEFAULT 'Pending',
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    "UpdatedAt" timestamp,
    CONSTRAINT "FK_DealOrders_Deals_DealId" FOREIGN KEY ("DealId") REFERENCES "Deals"("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_DealOrders_Users_BuyerId" FOREIGN KEY ("BuyerId") REFERENCES "Users"("Id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IX_DealOrders_DealId" ON "DealOrders" ("DealId");
CREATE INDEX IF NOT EXISTS "IX_DealOrders_BuyerId" ON "DealOrders" ("BuyerId");

-- ── NotificationPreferences ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "NotificationPreferences" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserId" uuid NOT NULL,
    "PushEnabled" boolean NOT NULL DEFAULT true,
    "NotifyByCategory" boolean NOT NULL DEFAULT true,
    "NotifyByLocation" boolean NOT NULL DEFAULT true,
    "NotifyByProduct" boolean NOT NULL DEFAULT true,
    "LocationRadiusKm" double precision NOT NULL DEFAULT 10.0,
    "EnabledCategories" text[] NOT NULL DEFAULT '{}',
    "UpdatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- ── OtpCodes ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "OtpCodes" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "Email" text NOT NULL,
    "Phone" text,
    "Code" text NOT NULL,
    "Purpose" integer NOT NULL,
    "ExpiresAt" timestamp NOT NULL,
    "Used" boolean NOT NULL DEFAULT false,
    "Attempts" integer NOT NULL DEFAULT 0,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW()
);

-- ── PushTokens ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PushTokens" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserId" uuid NOT NULL,
    "Token" text NOT NULL,
    "Platform" text NOT NULL,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    "LastUsedAt" timestamp,
    "IsActive" boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_PushTokens_Token" ON "PushTokens" ("Token");
CREATE INDEX IF NOT EXISTS "IX_PushTokens_UserId" ON "PushTokens" ("UserId");

-- ── UserNotifications ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "UserNotifications" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserId" uuid NOT NULL,
    "Type" text NOT NULL,
    "Title" text NOT NULL,
    "Body" text NOT NULL,
    "DataJson" text,
    "IsRead" boolean NOT NULL DEFAULT false,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "IX_UserNotifications_UserId" ON "UserNotifications" ("UserId");
CREATE INDEX IF NOT EXISTS "IX_UserNotifications_CreatedAt" ON "UserNotifications" ("CreatedAt");
CREATE INDEX IF NOT EXISTS "IX_UserNotifications_IsRead" ON "UserNotifications" ("IsRead");

-- ── Reports ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Reports" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "Type" integer NOT NULL,
    "TargetId" uuid NOT NULL,
    "ReporterId" uuid NOT NULL,
    "Reasons" text NOT NULL,
    "Description" text,
    "Status" integer NOT NULL DEFAULT 0,
    "AdminNotes" text,
    "Action" integer NOT NULL DEFAULT 0,
    "ResolvedById" uuid,
    "ResolvedAt" timestamp,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    "UpdatedAt" timestamp
);

CREATE INDEX IF NOT EXISTS "IX_Reports_ReporterId" ON "Reports" ("ReporterId");
CREATE INDEX IF NOT EXISTS "IX_Reports_TargetId" ON "Reports" ("TargetId");

-- ── SavedLists ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SavedLists" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserId" uuid NOT NULL,
    "Name" varchar(30) NOT NULL,
    "IsPublic" boolean NOT NULL DEFAULT false,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_SavedLists_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_SavedLists_UserId" ON "SavedLists" ("UserId");

-- ── UserAddresses ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "UserAddresses" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserId" uuid NOT NULL,
    "Label" text NOT NULL,
    "FullAddress" text NOT NULL,
    "Postcode" text,
    "City" text,
    "State" text,
    "Latitude" double precision,
    "Longitude" double precision,
    "IsDefault" boolean NOT NULL DEFAULT false,
    CONSTRAINT "FK_UserAddresses_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_UserAddresses_UserId" ON "UserAddresses" ("UserId");

-- ── UserFollows ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "UserFollows" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "FollowerId" uuid NOT NULL,
    "FollowingId" uuid NOT NULL,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_UserFollows_Users_FollowerId" FOREIGN KEY ("FollowerId") REFERENCES "Users"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_UserFollows_Users_FollowingId" FOREIGN KEY ("FollowingId") REFERENCES "Users"("Id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_UserFollows_Follower_Following" ON "UserFollows" ("FollowerId", "FollowingId");
CREATE INDEX IF NOT EXISTS "IX_UserFollows_FollowingId" ON "UserFollows" ("FollowingId");

-- ── UserNotificationPreferences ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "UserNotificationPreferences" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserId" uuid NOT NULL,
    "FollowNotification" boolean NOT NULL DEFAULT true,
    "DealUpdates" boolean NOT NULL DEFAULT true,
    "ReminderNotification" boolean NOT NULL DEFAULT true,
    "MarketingNotification" boolean NOT NULL DEFAULT false,
    "UpdatedAt" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "IX_UserNotificationPreferences_UserId" ON "UserNotificationPreferences" ("UserId");

-- ── DealComments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DealComments" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "DealId" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "Content" text NOT NULL,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    "UpdatedAt" timestamp NOT NULL DEFAULT NOW(),
    "IsHidden" boolean NOT NULL DEFAULT false,
    "ModerationStatus" text NOT NULL DEFAULT 'Approved',
    CONSTRAINT "FK_DealComments_Deals_DealId" FOREIGN KEY ("DealId") REFERENCES "Deals"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_DealComments_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_DealComments_DealId" ON "DealComments" ("DealId");
CREATE INDEX IF NOT EXISTS "IX_DealComments_UserId" ON "DealComments" ("UserId");
CREATE INDEX IF NOT EXISTS "IX_DealComments_DealId_CreatedAt" ON "DealComments" ("DealId", "CreatedAt");

-- ── DealLookups ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DealLookups" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "DealId" uuid NOT NULL,
    "BookingId" text NOT NULL,
    "LookupType" text NOT NULL DEFAULT 'Standard',
    "LookupStatus" text NOT NULL DEFAULT 'InProcess',
    "DeliveryStatus" text,
    "QrCodeData" text,
    "VerifiedAt" timestamp,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_DealLookups_Deals_DealId" FOREIGN KEY ("DealId") REFERENCES "Deals"("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_DealLookups_DealId" ON "DealLookups" ("DealId");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_DealLookups_BookingId" ON "DealLookups" ("BookingId");

-- ── DealReaction ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DealReaction" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "DealId" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "ReactionType" integer NOT NULL DEFAULT 0,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_DealReaction_Deals_DealId" FOREIGN KEY ("DealId") REFERENCES "Deals"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_DealReaction_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_DealReaction_DealId_UserId" ON "DealReaction" ("DealId", "UserId");

-- ── DealReposts ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DealReposts" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "DealId" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_DealReposts_Deals_DealId" FOREIGN KEY ("DealId") REFERENCES "Deals"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_DealReposts_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_DealReposts_DealId" ON "DealReposts" ("DealId");
CREATE INDEX IF NOT EXISTS "IX_DealReposts_UserId" ON "DealReposts" ("UserId");

-- ── DealVerification ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "DealVerification" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "DealId" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "VerifiedAt" timestamp NOT NULL DEFAULT NOW(),
    "Notes" text,
    CONSTRAINT "FK_DealVerification_Deals_DealId" FOREIGN KEY ("DealId") REFERENCES "Deals"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_DealVerification_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_DealVerification_DealId" ON "DealVerification" ("DealId");

-- ── SavedDeals ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SavedDeals" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserId" uuid NOT NULL,
    "DealId" uuid NOT NULL,
    "ListId" uuid NOT NULL,
    "SavedAt" timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_SavedDeals_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_SavedDeals_Deals_DealId" FOREIGN KEY ("DealId") REFERENCES "Deals"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_SavedDeals_SavedLists_ListId" FOREIGN KEY ("ListId") REFERENCES "SavedLists"("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_SavedDeals_UserId" ON "SavedDeals" ("UserId");
CREATE INDEX IF NOT EXISTS "IX_SavedDeals_DealId" ON "SavedDeals" ("DealId");
CREATE INDEX IF NOT EXISTS "IX_SavedDeals_ListId" ON "SavedDeals" ("ListId");

-- ── ContributorRatings ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ContributorRatings" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "ContributorId" uuid NOT NULL,
    "RaterId" uuid NOT NULL,
    "DealId" uuid NOT NULL,
    "Rating" integer NOT NULL,
    "Review" text,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT "FK_ContributorRatings_Users_ContributorId" FOREIGN KEY ("ContributorId") REFERENCES "Users"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ContributorRatings_Users_RaterId" FOREIGN KEY ("RaterId") REFERENCES "Users"("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_ContributorRatings_ContributorId" ON "ContributorRatings" ("ContributorId");

-- ── Conversations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Conversations" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "DealId" uuid,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    "LastMessageAt" timestamp,
    "LastMessageId" uuid
);

CREATE INDEX IF NOT EXISTS "IX_Conversations_DealId" ON "Conversations" ("DealId");

-- ── ConversationParticipants ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ConversationParticipants" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "ConversationId" uuid NOT NULL,
    "UserId" uuid NOT NULL,
    "LastReadAt" timestamp,
    CONSTRAINT "FK_ConversationParticipants_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ConversationParticipants_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_ConversationParticipants_ConversationId" ON "ConversationParticipants" ("ConversationId");
CREATE INDEX IF NOT EXISTS "IX_ConversationParticipants_UserId" ON "ConversationParticipants" ("UserId");

-- ── ChatMessages ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ChatMessages" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "ConversationId" uuid NOT NULL,
    "SenderId" uuid NOT NULL,
    "Content" text NOT NULL,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    "IsRead" boolean NOT NULL DEFAULT false,
    CONSTRAINT "FK_ChatMessages_Conversations_ConversationId" FOREIGN KEY ("ConversationId") REFERENCES "Conversations"("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_ChatMessages_Users_SenderId" FOREIGN KEY ("SenderId") REFERENCES "Users"("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_ChatMessages_ConversationId" ON "ChatMessages" ("ConversationId");
CREATE INDEX IF NOT EXISTS "IX_ChatMessages_CreatedAt" ON "ChatMessages" ("CreatedAt");

-- ── ContributorApplications ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ContributorApplications" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserId" uuid NOT NULL,
    "Status" text NOT NULL DEFAULT 'Pending',
    "RejectionReason" text,
    "MobileNo" text NOT NULL,
    "IcPassportNo" text NOT NULL,
    "Nationality" text NOT NULL,
    "Race" text NOT NULL,
    "ResidentStatus" text NOT NULL,
    "ReviewedBy" integer,
    "ReviewedAt" timestamp,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    "UpdatedAt" timestamp NOT NULL DEFAULT NOW(),
    "ApprovedAt" timestamp,
    CONSTRAINT "FK_ContributorApplications_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IX_ContributorApplications_UserId" ON "ContributorApplications" ("UserId");
CREATE INDEX IF NOT EXISTS "IX_ContributorApplications_Status" ON "ContributorApplications" ("Status");

-- ── ModerationRules ─────────────────────────────────────────────────────────
-- (should already exist from admin DB setup, but create if missing)
CREATE TABLE IF NOT EXISTS "ModerationRules" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "Key" text NOT NULL,
    "Value" text NOT NULL,
    "Description" text,
    "Category" text NOT NULL,
    "IsActive" boolean NOT NULL DEFAULT true,
    "UpdatedAt" timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "IX_ModerationRules_Category" ON "ModerationRules" ("Category");

-- ── AiConfigs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AiConfigs" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "Name" text NOT NULL,
    "Provider" text NOT NULL,
    "ApiKey" text NOT NULL,
    "Endpoint" text,
    "BaseUrl" text,
    "DeploymentName" text,
    "ModelName" text,
    "IsActive" boolean NOT NULL DEFAULT false,
    "CreatedAt" timestamp NOT NULL DEFAULT NOW(),
    "UpdatedAt" timestamp NOT NULL DEFAULT NOW()
);

COMMIT;
