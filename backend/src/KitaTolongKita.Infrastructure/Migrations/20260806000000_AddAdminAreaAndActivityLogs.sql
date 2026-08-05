-- Migration: AddAdminAreaAndActivityLogs
-- Run this ONCE on a fresh or existing DB to add:
--   - ActivityLogs (was referenced in DbContext but never migrated)
--   - AdminUsers, AuditLogs, AppSettings, AiConfigs, ModerationRules, Categories (new from merge)

BEGIN;

-- ── ActivityLogs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ActivityLogs" (
    "Id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "UserId" uuid NULL,
    "UserEmail" text NULL,
    "Action" text NOT NULL,
    "Category" integer NOT NULL DEFAULT 0,
    "Level" integer NOT NULL DEFAULT 0,
    "Message" text NOT NULL,
    "EntityType" text NULL,
    "EntityId" text NULL,
    "IpAddress" text NULL,
    "UserAgent" text NULL,
    "Metadata" text NULL,
    "CreatedAt" timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT "PK_ActivityLogs" PRIMARY KEY ("Id")
);
CREATE INDEX IF NOT EXISTS "IX_ActivityLogs_CreatedAt" ON "ActivityLogs" ("CreatedAt");
CREATE INDEX IF NOT EXISTS "IX_ActivityLogs_UserId" ON "ActivityLogs" ("UserId");
CREATE INDEX IF NOT EXISTS "IX_ActivityLogs_Action" ON "ActivityLogs" ("Action");

-- ── AdminUsers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AdminUsers" (
    "Id" serial NOT NULL,
    "Email" varchar(255) NOT NULL,
    "FullName" varchar(255) NOT NULL,
    "PasswordHash" varchar(255) NOT NULL,
    "Role" varchar(50) NOT NULL DEFAULT 'Viewer',
    "IsActive" boolean NOT NULL DEFAULT TRUE,
    "CreatedAt" timestamptz NOT NULL DEFAULT NOW(),
    "LastLoginAt" timestamptz NULL,
    "LastLoginIp" varchar(45) NULL,
    "PasswordResetToken" varchar(255) NULL,
    "PasswordResetTokenExpiry" timestamptz NULL,
    CONSTRAINT "PK_AdminUsers" PRIMARY KEY ("Id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_AdminUsers_Email" ON "AdminUsers" ("Email");

-- Seed: default super admin (password: Admin@123)
INSERT INTO "AdminUsers" ("Email", "FullName", "PasswordHash", "Role", "IsActive", "CreatedAt")
VALUES ('admin@kitatolongkita.com', 'Super Admin',
        '$2a$11$K8vNQv5H5yJ8O9F1mQZv4.3X7Z1JqR6HnF9dL8kMpOlWqXsAiYuMe',
        'SuperAdmin', TRUE, '2024-01-01 00:00:00+00')
ON CONFLICT ("Email") DO NOTHING;

-- ── AuditLogs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AuditLogs" (
    "Id" serial NOT NULL,
    "AdminUserId" int NOT NULL,
    "AdminEmail" varchar(255) NOT NULL,
    "Action" varchar(100) NOT NULL,
    "EntityType" varchar(100) NOT NULL,
    "EntityId" varchar(100) NOT NULL,
    "Details" text NULL,
    "CreatedAt" timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT "PK_AuditLogs" PRIMARY KEY ("Id")
);
CREATE INDEX IF NOT EXISTS "IX_AuditLogs_CreatedAt" ON "AuditLogs" ("CreatedAt");
CREATE INDEX IF NOT EXISTS "IX_AuditLogs_EntityType_EntityId" ON "AuditLogs" ("EntityType", "EntityId");

-- ── AppSettings ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AppSettings" (
    "Id" serial NOT NULL,
    "Key" varchar(255) NOT NULL,
    "Value" text NOT NULL,
    "Description" text NULL,
    "UpdatedAt" timestamptz NOT NULL DEFAULT NOW(),
    "UpdatedByAdminId" int NOT NULL,
    CONSTRAINT "PK_AppSettings" PRIMARY KEY ("Id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_AppSettings_Key" ON "AppSettings" ("Key");

-- ── AiConfigs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AiConfigs" (
    "Id" serial NOT NULL,
    "Name" varchar(255) NOT NULL,
    "Provider" varchar(50) NOT NULL,
    "ApiKey" text NULL,
    "Endpoint" text NULL,
    "BaseUrl" text NULL,
    "DeploymentName" text NULL,
    "ModelName" text NULL,
    "IsActive" boolean NOT NULL DEFAULT FALSE,
    "CreatedAt" timestamptz NOT NULL DEFAULT NOW(),
    "UpdatedAt" timestamptz NOT NULL DEFAULT NOW(),
    "CreatedByAdminId" int NOT NULL,
    CONSTRAINT "PK_AiConfigs" PRIMARY KEY ("Id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_AiConfigs_Name" ON "AiConfigs" ("Name");
CREATE INDEX IF NOT EXISTS "IX_AiConfigs_IsActive" ON "AiConfigs" ("IsActive");

INSERT INTO "AiConfigs" ("Name", "Provider", "IsActive", "CreatedAt", "UpdatedAt", "CreatedByAdminId") VALUES
    ('Azure OpenAI (Default)', 'azure-openai', TRUE,  '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00', 1),
    ('OpenAI Direct',           'openai',       FALSE, '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00', 1),
    ('Anthropic Claude',       'anthropic',    FALSE, '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00', 1)
ON CONFLICT ("Name") DO NOTHING;

-- ── ModerationRules ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ModerationRules" (
    "Id" serial NOT NULL,
    "Key" varchar(100) NOT NULL,
    "Value" text NOT NULL,
    "Description" text NULL,
    "Category" varchar(50) NOT NULL DEFAULT 'ai',
    "IsActive" boolean NOT NULL DEFAULT TRUE,
    "UpdatedAt" timestamptz NOT NULL DEFAULT NOW(),
    "UpdatedByAdminId" int NOT NULL,
    CONSTRAINT "PK_ModerationRules" PRIMARY KEY ("Id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_ModerationRules_Key" ON "ModerationRules" ("Key");
CREATE INDEX IF NOT EXISTS "IX_ModerationRules_Category" ON "ModerationRules" ("Category");

INSERT INTO "ModerationRules" ("Key", "Value", "Description", "Category", "IsActive", "UpdatedByAdminId") VALUES
    ('auto_approve_threshold',     '80',  'AI score >= 80 → auto-approve',         'ai',    TRUE, 1),
    ('pending_review_threshold',   '50',  'AI score 50-79 → pending manual review',  'ai',    TRUE, 1),
    ('reject_threshold',           '50',  'AI score < 50 → auto-reject',           'ai',    TRUE, 1),
    ('pilot_mode_enabled',            'true',  'Enable pilot mode',                      'pilot', TRUE, 1),
    ('pilot_skip_email_verification', 'true',  'Skip email verification during pilot',   'pilot', TRUE, 1),
    ('pilot_auto_approve_deals',      'true',  'Auto-approve all deals during pilot',    'pilot', TRUE, 1),
    ('deal_min_group_size',           '5',    'Minimum group size for a deal',         'deal',  TRUE, 1),
    ('deal_max_group_size',           '100',  'Maximum group size for a deal',         'deal',  TRUE, 1)
ON CONFLICT ("Key") DO NOTHING;

-- ── Categories ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Categories" (
    "Id" serial NOT NULL,
    "Name" varchar(100) NOT NULL,
    "Description" text NULL,
    "IsActive" boolean NOT NULL DEFAULT TRUE,
    "CreatedAt" timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT "PK_Categories" PRIMARY KEY ("Id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "IX_Categories_Name" ON "Categories" ("Name");

INSERT INTO "Categories" ("Name", "Description", "IsActive", "CreatedAt") VALUES
    ('Food & Beverages',     'Food deals, group orders, restaurant vouchers',     TRUE, '2024-01-01 00:00:00+00'),
    ('Fashion',             'Clothing, accessories, footwear',                    TRUE, '2024-01-01 00:00:00+00'),
    ('Electronics',         'Gadgets, devices, accessories',                     TRUE, '2024-01-01 00:00:00+00'),
    ('Beauty & Personal Care', 'Skincare, cosmetics, wellness',                  TRUE, '2024-01-01 00:00:00+00'),
    ('Home & Living',       'Furniture, decor, household items',                 TRUE, '2024-01-01 00:00:00+00'),
    ('Sports & Outdoors',   'Sports equipment, outdoor gear',                    TRUE, '2024-01-01 00:00:00+00'),
    ('Education',           'Books, courses, tutoring',                          TRUE, '2024-01-01 00:00:00+00'),
    ('Services',            'Professional services, freelance',                  TRUE, '2024-01-01 00:00:00+00'),
    ('Others',              'Miscellaneous deals',                               TRUE, '2024-01-01 00:00:00+00')
ON CONFLICT ("Name") DO NOTHING;

COMMIT;
