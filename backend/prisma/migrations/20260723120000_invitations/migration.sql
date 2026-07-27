-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "normalized_email" VARCHAR(320) NOT NULL,
    "role" "TenantRole" NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "accepted_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "expired_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_by_membership_id" UUID,
    "created_by_platform_access_id" UUID,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_teams" (
    "invitation_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "invitation_teams_pkey" PRIMARY KEY ("invitation_id", "team_id")
);

-- Domain invariants not expressible in Prisma Schema.
ALTER TABLE "invitations"
    ADD CONSTRAINT "invitations_email_check"
    CHECK (
        btrim("email") <> ''
        AND "normalized_email" <> ''
        AND "normalized_email" = lower(btrim("normalized_email"))
    ),
    ADD CONSTRAINT "invitations_token_hash_check"
    CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT "invitations_expiry_check"
    CHECK ("expires_at" > "created_at"),
    ADD CONSTRAINT "invitations_creator_role_check"
    CHECK (
        (
            "role" = 'CEO'
            AND "created_by_platform_access_id" IS NOT NULL
            AND "created_by_membership_id" IS NULL
        )
        OR (
            "role" IN ('USER', 'MANAGER')
            AND "created_by_membership_id" IS NOT NULL
            AND "created_by_platform_access_id" IS NULL
        )
    ),
    ADD CONSTRAINT "invitations_lifecycle_timestamps_check"
    CHECK (
        (
            "status" = 'PENDING'
            AND "accepted_at" IS NULL
            AND "revoked_at" IS NULL
            AND "expired_at" IS NULL
        )
        OR (
            "status" = 'ACCEPTED'
            AND "accepted_at" IS NOT NULL
            AND "accepted_at" >= "created_at"
            AND "revoked_at" IS NULL
            AND "expired_at" IS NULL
        )
        OR (
            "status" = 'REVOKED'
            AND "accepted_at" IS NULL
            AND "revoked_at" IS NOT NULL
            AND "revoked_at" >= "created_at"
            AND "expired_at" IS NULL
        )
        OR (
            "status" = 'EXPIRED'
            AND "accepted_at" IS NULL
            AND "revoked_at" IS NULL
            AND "expired_at" IS NOT NULL
            AND "expired_at" >= "expires_at"
        )
    );

-- Composite addressability for tenant-safe foreign keys.
CREATE UNIQUE INDEX "invitations_id_tenant_id_key"
    ON "invitations"("id", "tenant_id");

CREATE UNIQUE INDEX "invitations_token_hash_key"
    ON "invitations"("token_hash");

-- Only one actionable invitation can exist for the same tenant and e-mail.
CREATE UNIQUE INDEX "invitations_tenant_id_normalized_email_pending_key"
    ON "invitations"("tenant_id", "normalized_email")
    WHERE "status" = 'PENDING';

CREATE INDEX "invitations_tenant_id_status_created_at_idx"
    ON "invitations"("tenant_id", "status", "created_at");

CREATE INDEX "invitations_created_by_membership_id_status_idx"
    ON "invitations"("created_by_membership_id", "status");

CREATE INDEX "invitations_created_by_platform_access_id_status_idx"
    ON "invitations"("created_by_platform_access_id", "status");

CREATE INDEX "invitation_teams_tenant_id_team_id_idx"
    ON "invitation_teams"("tenant_id", "team_id");

-- AddForeignKey
ALTER TABLE "invitations"
    ADD CONSTRAINT "invitations_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A membership creator must belong to the invitation tenant.
ALTER TABLE "invitations"
    ADD CONSTRAINT "invitations_created_by_membership_id_tenant_id_fkey"
    FOREIGN KEY ("created_by_membership_id", "tenant_id")
    REFERENCES "tenant_memberships"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invitations"
    ADD CONSTRAINT "invitations_created_by_platform_access_id_fkey"
    FOREIGN KEY ("created_by_platform_access_id")
    REFERENCES "platform_accesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Invitation and team must always belong to the same tenant.
ALTER TABLE "invitation_teams"
    ADD CONSTRAINT "invitation_teams_invitation_id_tenant_id_fkey"
    FOREIGN KEY ("invitation_id", "tenant_id")
    REFERENCES "invitations"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invitation_teams"
    ADD CONSTRAINT "invitation_teams_team_id_tenant_id_fkey"
    FOREIGN KEY ("team_id", "tenant_id")
    REFERENCES "teams"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
