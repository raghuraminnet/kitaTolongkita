-- Migration: AddActivityLogs
-- Generated manually — run against PostgreSQL

CREATE TABLE IF NOT EXISTS "ActivityLogs" (
    "Id"            uuid        NOT NULL DEFAULT gen_random_uuid(),
    "UserId"        uuid        NULL,
    "UserEmail"      varchar(255) NULL,
    "Category"       integer     NOT NULL DEFAULT 4,
    "Level"         integer     NOT NULL DEFAULT 1,
    "Action"         varchar(100) NOT NULL,
    "EntityType"     varchar(100) NULL,
    "EntityId"       uuid        NULL,
    "Message"        text        NOT NULL,
    "Metadata"       text        NULL,
    "IpAddress"      varchar(45) NULL,
    "UserAgent"      varchar(500) NULL,
    "CreatedAt"      timestamptz NOT NULL DEFAULT NOW(),

    CONSTRAINT "PK_ActivityLogs" PRIMARY KEY ("Id")
);

CREATE INDEX IF NOT EXISTS "IX_ActivityLogs_Category"        ON "ActivityLogs" ("Category");
CREATE INDEX IF NOT EXISTS "IX_ActivityLogs_Level"           ON "ActivityLogs" ("Level");
CREATE INDEX IF NOT EXISTS "IX_ActivityLogs_CreatedAt"       ON "ActivityLogs" ("CreatedAt" DESC);
CREATE INDEX IF NOT EXISTS "IX_ActivityLogs_UserId"          ON "ActivityLogs" ("UserId");
CREATE INDEX IF NOT EXISTS "IX_ActivityLogs_EntityType_EntityId" ON "ActivityLogs" ("EntityType", "EntityId");
CREATE INDEX IF NOT EXISTS "IX_ActivityLogs_Action"          ON "ActivityLogs" ("Action");
