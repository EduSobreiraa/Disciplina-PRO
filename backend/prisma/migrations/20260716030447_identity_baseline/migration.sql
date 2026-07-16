-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('USER', 'MANAGER', 'CEO');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "PlatformAccessStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('MEMBERSHIP', 'PLATFORM_ACCESS', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "email" VARCHAR(320) NOT NULL,
    "normalized_email" VARCHAR(320) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "disabled_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "time_zone" VARCHAR(100) NOT NULL DEFAULT 'America/Bahia',
    "status" "TenantStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "suspended_at" TIMESTAMPTZ(3),
    "closed_at" TIMESTAMPTZ(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_memberships" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "TenantRole" NOT NULL DEFAULT 'USER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "suspended_at" TIMESTAMPTZ(3),
    "deactivated_at" TIMESTAMPTZ(3),

    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_accesses" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "role" "PlatformRole" NOT NULL DEFAULT 'SUPER_ADMIN',
    "status" "PlatformAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspended_at" TIMESTAMPTZ(3),
    "granted_by_access_id" UUID,

    CONSTRAINT "platform_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL DEFAULT uuidv7(),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "absolute_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "revocation_reason" VARCHAR(120),

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "session_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumed_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "replaced_by_token_id" UUID,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID,
    "actor_type" "AuditActorType" NOT NULL,
    "actor_membership_id" UUID,
    "actor_platform_access_id" UUID,
    "target_membership_id" UUID,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" UUID,
    "action" VARCHAR(120) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- Domain invariants that Prisma Schema cannot express directly.
ALTER TABLE "users"
    ADD CONSTRAINT "users_normalized_email_canonical_check"
    CHECK ("normalized_email" = lower(btrim("normalized_email")));

ALTER TABLE "tenants"
    ADD CONSTRAINT "tenants_lifecycle_timestamps_check"
    CHECK (
        ("status" <> 'SUSPENDED' OR "suspended_at" IS NOT NULL)
        AND ("status" <> 'CLOSED' OR "closed_at" IS NOT NULL)
    );

ALTER TABLE "tenant_memberships"
    ADD CONSTRAINT "tenant_memberships_lifecycle_timestamps_check"
    CHECK (
        ("status" <> 'SUSPENDED' OR "suspended_at" IS NOT NULL)
        AND ("status" <> 'INACTIVE' OR "deactivated_at" IS NOT NULL)
    );

ALTER TABLE "platform_accesses"
    ADD CONSTRAINT "platform_accesses_lifecycle_timestamps_check"
    CHECK ("status" <> 'SUSPENDED' OR "suspended_at" IS NOT NULL);

ALTER TABLE "auth_sessions"
    ADD CONSTRAINT "auth_sessions_expiry_check"
    CHECK ("absolute_expires_at" > "created_at");

ALTER TABLE "refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_expiry_check"
    CHECK ("expires_at" > "created_at"),
    ADD CONSTRAINT "refresh_tokens_rotation_check"
    CHECK ("replaced_by_token_id" IS NULL OR "consumed_at" IS NOT NULL);

ALTER TABLE "audit_events"
    ADD CONSTRAINT "audit_events_actor_check"
    CHECK (
        ("actor_type" = 'SYSTEM' AND "actor_membership_id" IS NULL AND "actor_platform_access_id" IS NULL)
        OR ("actor_type" = 'MEMBERSHIP' AND "actor_membership_id" IS NOT NULL AND "actor_platform_access_id" IS NULL)
        OR ("actor_type" = 'PLATFORM_ACCESS' AND "actor_membership_id" IS NULL AND "actor_platform_access_id" IS NOT NULL)
    );

-- CreateIndex
CREATE UNIQUE INDEX "users_normalized_email_key" ON "users"("normalized_email");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenant_memberships_user_id_status_idx" ON "tenant_memberships"("user_id", "status");

-- CreateIndex
CREATE INDEX "tenant_memberships_tenant_id_status_role_idx" ON "tenant_memberships"("tenant_id", "status", "role");

-- The MVP has exactly one active CEO per operational tenant.
CREATE UNIQUE INDEX "tenant_memberships_one_active_ceo_per_tenant"
    ON "tenant_memberships"("tenant_id")
    WHERE "role" = 'CEO' AND "status" = 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "tenant_memberships_tenant_id_user_id_key" ON "tenant_memberships"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_accesses_user_id_key" ON "platform_accesses"("user_id");

-- CreateIndex
CREATE INDEX "platform_accesses_status_idx" ON "platform_accesses"("status");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_family_id_key" ON "auth_sessions"("family_id");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_revoked_at_idx" ON "auth_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "auth_sessions_absolute_expires_at_idx" ON "auth_sessions"("absolute_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_replaced_by_token_id_key" ON "refresh_tokens"("replaced_by_token_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_session_id_revoked_at_idx" ON "refresh_tokens"("session_id", "revoked_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "audit_events_tenant_id_occurred_at_idx" ON "audit_events"("tenant_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_events_actor_membership_id_occurred_at_idx" ON "audit_events"("actor_membership_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_events_actor_platform_access_id_occurred_at_idx" ON "audit_events"("actor_platform_access_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_accesses" ADD CONSTRAINT "platform_accesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_accesses" ADD CONSTRAINT "platform_accesses_granted_by_access_id_fkey" FOREIGN KEY ("granted_by_access_id") REFERENCES "platform_accesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replaced_by_token_id_fkey" FOREIGN KEY ("replaced_by_token_id") REFERENCES "refresh_tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_membership_id_fkey" FOREIGN KEY ("actor_membership_id") REFERENCES "tenant_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_platform_access_id_fkey" FOREIGN KEY ("actor_platform_access_id") REFERENCES "platform_accesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_target_membership_id_fkey" FOREIGN KEY ("target_membership_id") REFERENCES "tenant_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Audit events are append-only facts. Corrections must be new events.
CREATE FUNCTION prevent_audit_event_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_events are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_immutable
    BEFORE UPDATE OR DELETE ON "audit_events"
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();
