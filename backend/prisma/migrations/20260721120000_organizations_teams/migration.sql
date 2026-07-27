-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('MEMBER', 'MANAGER');

-- TenantMembership must be addressable together with its tenant by a composite FK.
CREATE UNIQUE INDEX "tenant_memberships_id_tenant_id_key"
    ON "tenant_memberships"("id", "tenant_id");

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "normalized_name" VARCHAR(160) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_memberships" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),

    CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("id")
);

-- Domain invariants that Prisma Schema cannot express directly.
ALTER TABLE "teams"
    ADD CONSTRAINT "teams_name_not_blank_check"
    CHECK (btrim("name") <> ''),
    ADD CONSTRAINT "teams_normalized_name_canonical_check"
    CHECK (
        "normalized_name" <> ''
        AND "normalized_name" = regexp_replace(lower(btrim("normalized_name")), '[[:space:]]+', ' ', 'g')
    ),
    ADD CONSTRAINT "teams_archived_at_check"
    CHECK ("archived_at" IS NULL OR "archived_at" >= "created_at");

ALTER TABLE "team_memberships"
    ADD CONSTRAINT "team_memberships_ended_at_check"
    CHECK ("ended_at" IS NULL OR "ended_at" >= "assigned_at");

-- CreateIndex
CREATE UNIQUE INDEX "teams_id_tenant_id_key" ON "teams"("id", "tenant_id");

-- Active team names are unique inside a tenant; archived names may be reused.
CREATE UNIQUE INDEX "teams_tenant_id_normalized_name_active_key"
    ON "teams"("tenant_id", "normalized_name")
    WHERE "archived_at" IS NULL;

-- CreateIndex
CREATE INDEX "teams_tenant_id_archived_at_idx" ON "teams"("tenant_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "team_memberships_team_id_membership_id_key"
    ON "team_memberships"("team_id", "membership_id");

-- CreateIndex
CREATE INDEX "team_memberships_tenant_id_membership_id_ended_at_idx"
    ON "team_memberships"("tenant_id", "membership_id", "ended_at");

-- CreateIndex
CREATE INDEX "team_memberships_tenant_id_team_id_ended_at_role_idx"
    ON "team_memberships"("tenant_id", "team_id", "ended_at", "role");

-- AddForeignKey
ALTER TABLE "teams"
    ADD CONSTRAINT "teams_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Composite foreign keys make cross-tenant associations structurally impossible.
ALTER TABLE "team_memberships"
    ADD CONSTRAINT "team_memberships_team_id_tenant_id_fkey"
    FOREIGN KEY ("team_id", "tenant_id") REFERENCES "teams"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "team_memberships"
    ADD CONSTRAINT "team_memberships_membership_id_tenant_id_fkey"
    FOREIGN KEY ("membership_id", "tenant_id") REFERENCES "tenant_memberships"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
