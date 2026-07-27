-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "ProgramVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ActivityType" AS ENUM ('CHECKLIST', 'TASK', 'MISSION', 'DAILY_SCORE', 'MEDITATION', 'REFLECTION');
CREATE TYPE "ActivityFrequency" AS ENUM ('ONCE', 'DAILY', 'WEEKLY');
CREATE TYPE "TenantProgramStatus" AS ENUM ('ENABLED', 'DISABLED');
CREATE TYPE "EnrollmentStatus" AS ENUM ('AVAILABLE', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "programs" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "ProgramStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "program_versions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "program_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "ProgramVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "published_at" TIMESTAMPTZ(3),
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "program_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "program_phases" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "program_version_id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "program_phases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "program_activities" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "program_version_id" UUID NOT NULL,
    "program_phase_id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "ActivityType" NOT NULL,
    "frequency" "ActivityFrequency" NOT NULL,
    "configuration" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "program_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_programs" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "status" "TenantProgramStatus" NOT NULL DEFAULT 'ENABLED',
    "enabled_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tenant_programs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enrollments" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "tenant_program_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "program_version_id" UUID,
    "cycle_number" INTEGER NOT NULL DEFAULT 1,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'AVAILABLE',
    "time_zone" VARCHAR(100),
    "started_at" TIMESTAMPTZ(3),
    "started_on" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- Domain checks.
ALTER TABLE "programs"
    ADD CONSTRAINT "programs_content_check"
    CHECK ("slug" = lower(btrim("slug")) AND "slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND btrim("name") <> '' AND btrim("summary") <> ''),
    ADD CONSTRAINT "programs_lifecycle_check"
    CHECK (
        ("status" = 'ACTIVE' AND "archived_at" IS NULL)
        OR
        ("status" = 'ARCHIVED' AND "archived_at" IS NOT NULL AND "archived_at" >= "created_at")
    );

ALTER TABLE "program_versions"
    ADD CONSTRAINT "program_versions_definition_check"
    CHECK ("version_number" > 0 AND "duration_days" > 0 AND btrim("title") <> '' AND btrim("description") <> ''),
    ADD CONSTRAINT "program_versions_lifecycle_check"
    CHECK (
        ("status" = 'DRAFT' AND "published_at" IS NULL AND "archived_at" IS NULL)
        OR
        ("status" = 'PUBLISHED' AND "published_at" IS NOT NULL AND "published_at" >= "created_at" AND "archived_at" IS NULL)
        OR
        (
            "status" = 'ARCHIVED'
            AND "published_at" IS NOT NULL
            AND "archived_at" IS NOT NULL
            AND "published_at" >= "created_at"
            AND "archived_at" >= "published_at"
        )
    );

ALTER TABLE "program_phases"
    ADD CONSTRAINT "program_phases_definition_check"
    CHECK ("position" > 0 AND btrim("key") <> '' AND btrim("title") <> '' AND btrim("description") <> '');

ALTER TABLE "program_activities"
    ADD CONSTRAINT "program_activities_definition_check"
    CHECK (
        "position" > 0
        AND btrim("key") <> ''
        AND btrim("title") <> ''
        AND btrim("description") <> ''
        AND jsonb_typeof("configuration") = 'object'
    );

ALTER TABLE "tenant_programs"
    ADD CONSTRAINT "tenant_programs_lifecycle_check"
    CHECK (
        ("status" = 'ENABLED' AND "disabled_at" IS NULL)
        OR
        ("status" = 'DISABLED' AND "disabled_at" IS NOT NULL AND "disabled_at" >= "enabled_at")
    );

ALTER TABLE "enrollments"
    ADD CONSTRAINT "enrollments_lifecycle_check"
    CHECK (
        "cycle_number" > 0
        AND (
            (
                "status" = 'AVAILABLE'
                AND "program_version_id" IS NULL
                AND "time_zone" IS NULL
                AND "started_at" IS NULL
                AND "started_on" IS NULL
            )
            OR
            (
                "status" IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED')
                AND "program_version_id" IS NOT NULL
                AND "time_zone" IS NOT NULL
                AND "started_at" IS NOT NULL
                AND "started_on" IS NOT NULL
            )
        )
    );

-- Unique constraints and lookup indexes.
CREATE UNIQUE INDEX "programs_slug_key" ON "programs"("slug");
CREATE INDEX "programs_status_name_idx" ON "programs"("status", "name");

CREATE UNIQUE INDEX "program_versions_id_program_id_key" ON "program_versions"("id", "program_id");
CREATE UNIQUE INDEX "program_versions_program_id_version_number_key" ON "program_versions"("program_id", "version_number");
CREATE UNIQUE INDEX "program_versions_one_draft_per_program_key"
    ON "program_versions"("program_id") WHERE "status" = 'DRAFT';
CREATE UNIQUE INDEX "program_versions_one_published_per_program_key"
    ON "program_versions"("program_id") WHERE "status" = 'PUBLISHED';
CREATE INDEX "program_versions_program_id_status_idx" ON "program_versions"("program_id", "status");

CREATE UNIQUE INDEX "program_phases_id_program_version_id_key" ON "program_phases"("id", "program_version_id");
CREATE UNIQUE INDEX "program_phases_program_version_id_key_key" ON "program_phases"("program_version_id", "key");
CREATE UNIQUE INDEX "program_phases_program_version_id_position_key" ON "program_phases"("program_version_id", "position");

CREATE UNIQUE INDEX "program_activities_program_version_id_key_key" ON "program_activities"("program_version_id", "key");
CREATE UNIQUE INDEX "program_activities_program_phase_id_position_key" ON "program_activities"("program_phase_id", "position");
CREATE INDEX "program_activities_program_version_id_program_phase_id_idx"
    ON "program_activities"("program_version_id", "program_phase_id");

CREATE UNIQUE INDEX "tenant_programs_id_tenant_id_key" ON "tenant_programs"("id", "tenant_id");
CREATE UNIQUE INDEX "tenant_programs_id_tenant_id_program_id_key" ON "tenant_programs"("id", "tenant_id", "program_id");
CREATE UNIQUE INDEX "tenant_programs_tenant_id_program_id_key" ON "tenant_programs"("tenant_id", "program_id");
CREATE INDEX "tenant_programs_tenant_id_status_idx" ON "tenant_programs"("tenant_id", "status");
CREATE INDEX "tenant_programs_program_id_status_idx" ON "tenant_programs"("program_id", "status");

CREATE UNIQUE INDEX "enrollments_tenant_program_id_membership_id_cycle_number_key"
    ON "enrollments"("tenant_program_id", "membership_id", "cycle_number");
CREATE INDEX "enrollments_tenant_id_membership_id_status_idx"
    ON "enrollments"("tenant_id", "membership_id", "status");
CREATE INDEX "enrollments_tenant_program_id_status_idx" ON "enrollments"("tenant_program_id", "status");
CREATE INDEX "enrollments_program_version_id_idx" ON "enrollments"("program_version_id");

-- AddForeignKey
ALTER TABLE "program_versions"
    ADD CONSTRAINT "program_versions_program_id_fkey"
    FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "program_phases"
    ADD CONSTRAINT "program_phases_program_version_id_fkey"
    FOREIGN KEY ("program_version_id") REFERENCES "program_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "program_activities"
    ADD CONSTRAINT "program_activities_program_version_id_fkey"
    FOREIGN KEY ("program_version_id") REFERENCES "program_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "program_activities"
    ADD CONSTRAINT "program_activities_program_phase_id_program_version_id_fkey"
    FOREIGN KEY ("program_phase_id", "program_version_id")
    REFERENCES "program_phases"("id", "program_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_programs"
    ADD CONSTRAINT "tenant_programs_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_programs"
    ADD CONSTRAINT "tenant_programs_program_id_fkey"
    FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enrollments"
    ADD CONSTRAINT "enrollments_tenant_program_id_tenant_id_program_id_fkey"
    FOREIGN KEY ("tenant_program_id", "tenant_id", "program_id")
    REFERENCES "tenant_programs"("id", "tenant_id", "program_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enrollments"
    ADD CONSTRAINT "enrollments_membership_id_tenant_id_fkey"
    FOREIGN KEY ("membership_id", "tenant_id")
    REFERENCES "tenant_memberships"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enrollments"
    ADD CONSTRAINT "enrollments_program_version_id_program_id_fkey"
    FOREIGN KEY ("program_version_id", "program_id")
    REFERENCES "program_versions"("id", "program_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Published and archived definitions are immutable. A published version may only
-- transition to ARCHIVED, preserving all definition fields.
CREATE FUNCTION enforce_program_version_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' AND OLD."status" <> 'DRAFT' THEN
        RAISE EXCEPTION 'published program versions are immutable' USING ERRCODE = '23514';
    END IF;

    IF TG_OP = 'UPDATE' AND OLD."status" = 'ARCHIVED' THEN
        RAISE EXCEPTION 'archived program versions are immutable' USING ERRCODE = '23514';
    END IF;

    IF TG_OP = 'UPDATE' AND OLD."status" = 'PUBLISHED' AND (
        NEW."status" <> 'ARCHIVED'
        OR NEW."program_id" <> OLD."program_id"
        OR NEW."version_number" <> OLD."version_number"
        OR NEW."title" <> OLD."title"
        OR NEW."description" <> OLD."description"
        OR NEW."duration_days" <> OLD."duration_days"
        OR NEW."published_at" <> OLD."published_at"
        OR NEW."archived_at" IS NULL
    ) THEN
        RAISE EXCEPTION 'published program versions are immutable' USING ERRCODE = '23514';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER "program_versions_immutability_trigger"
BEFORE UPDATE OR DELETE ON "program_versions"
FOR EACH ROW EXECUTE FUNCTION enforce_program_version_immutability();

CREATE FUNCTION enforce_draft_program_tree()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    old_version_is_draft BOOLEAN;
    new_version_is_draft BOOLEAN;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        SELECT EXISTS (
            SELECT 1 FROM "program_versions"
            WHERE "id" = OLD."program_version_id" AND "status" = 'DRAFT'
        ) INTO old_version_is_draft;
    END IF;

    IF TG_OP <> 'DELETE' THEN
        SELECT EXISTS (
            SELECT 1 FROM "program_versions"
            WHERE "id" = NEW."program_version_id" AND "status" = 'DRAFT'
        ) INTO new_version_is_draft;
    END IF;

    IF (TG_OP = 'INSERT' AND NOT new_version_is_draft)
        OR (TG_OP = 'DELETE' AND NOT old_version_is_draft)
        OR (TG_OP = 'UPDATE' AND (NOT old_version_is_draft OR NOT new_version_is_draft))
    THEN
        RAISE EXCEPTION 'only draft program trees are mutable' USING ERRCODE = '23514';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER "program_phases_draft_only_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "program_phases"
FOR EACH ROW EXECUTE FUNCTION enforce_draft_program_tree();

CREATE TRIGGER "program_activities_draft_only_trigger"
BEFORE INSERT OR UPDATE OR DELETE ON "program_activities"
FOR EACH ROW EXECUTE FUNCTION enforce_draft_program_tree();
