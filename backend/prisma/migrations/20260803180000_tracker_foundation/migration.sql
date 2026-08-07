CREATE TYPE "TrackerMarkStatus" AS ENUM ('COMPLETED', 'FAILED');

CREATE TABLE "tracker_behaviors" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "normalized_name" VARCHAR(200) NOT NULL,
    "position" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    CONSTRAINT "tracker_behaviors_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tracker_behaviors_data_check" CHECK (
        btrim("name") <> ''
        AND "normalized_name" = lower(regexp_replace(btrim("name"), '\s+', ' ', 'g'))
        AND "position" >= 0
        AND (("active" AND "archived_at" IS NULL) OR (NOT "active" AND "archived_at" IS NOT NULL))
    )
);

CREATE UNIQUE INDEX "tracker_behaviors_id_tenant_id_membership_id_key"
    ON "tracker_behaviors"("id", "tenant_id", "membership_id");
CREATE UNIQUE INDEX "tracker_behaviors_membership_id_position_key"
    ON "tracker_behaviors"("membership_id", "position");
CREATE UNIQUE INDEX "tracker_behaviors_active_name_key"
    ON "tracker_behaviors"("membership_id", "normalized_name") WHERE "active";
CREATE INDEX "tracker_behaviors_tenant_id_membership_id_active_position_idx"
    ON "tracker_behaviors"("tenant_id", "membership_id", "active", "position");

CREATE TABLE "tracker_marks" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "behavior_id" UUID NOT NULL,
    "tracked_on" DATE NOT NULL,
    "status" "TrackerMarkStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "tracker_marks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tracker_marks_id_tenant_id_membership_id_key"
    ON "tracker_marks"("id", "tenant_id", "membership_id");
CREATE UNIQUE INDEX "tracker_marks_behavior_id_tracked_on_key"
    ON "tracker_marks"("behavior_id", "tracked_on");
CREATE INDEX "tracker_marks_tenant_id_membership_id_tracked_on_idx"
    ON "tracker_marks"("tenant_id", "membership_id", "tracked_on");

CREATE TABLE "tracker_justifications" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "tracker_mark_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "tracker_justifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tracker_justifications_text_check" CHECK (
        btrim("text") <> '' AND char_length("text") <= 2000
    )
);

CREATE UNIQUE INDEX "tracker_justifications_tracker_mark_id_tenant_id_membership_id_key"
    ON "tracker_justifications"("tracker_mark_id", "tenant_id", "membership_id");
CREATE INDEX "tracker_justifications_tenant_id_membership_id_idx"
    ON "tracker_justifications"("tenant_id", "membership_id");

ALTER TABLE "tracker_behaviors" ADD CONSTRAINT "tracker_behaviors_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tracker_behaviors" ADD CONSTRAINT "tracker_behaviors_membership_id_tenant_id_fkey"
    FOREIGN KEY ("membership_id", "tenant_id") REFERENCES "tenant_memberships"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tracker_marks" ADD CONSTRAINT "tracker_marks_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tracker_marks" ADD CONSTRAINT "tracker_marks_membership_id_tenant_id_fkey"
    FOREIGN KEY ("membership_id", "tenant_id") REFERENCES "tenant_memberships"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tracker_marks" ADD CONSTRAINT "tracker_marks_behavior_scope_fkey"
    FOREIGN KEY ("behavior_id", "tenant_id", "membership_id")
    REFERENCES "tracker_behaviors"("id", "tenant_id", "membership_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tracker_justifications" ADD CONSTRAINT "tracker_justifications_mark_scope_fkey"
    FOREIGN KEY ("tracker_mark_id", "tenant_id", "membership_id")
    REFERENCES "tracker_marks"("id", "tenant_id", "membership_id") ON DELETE RESTRICT ON UPDATE CASCADE;
