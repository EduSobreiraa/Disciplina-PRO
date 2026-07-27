CREATE TYPE "EnrollmentPauseSource" AS ENUM ('USER', 'MEMBERSHIP', 'TENANT', 'PLATFORM');

ALTER TABLE "enrollments"
    ADD COLUMN "completed_at" TIMESTAMPTZ(3),
    ADD COLUMN "abandoned_at" TIMESTAMPTZ(3),
    ADD COLUMN "abandonment_reason" VARCHAR(500);

ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_lifecycle_check";
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_lifecycle_check" CHECK (
    "cycle_number" > 0 AND (
        ("status" = 'AVAILABLE' AND "program_version_id" IS NULL AND "time_zone" IS NULL
            AND "started_at" IS NULL AND "started_on" IS NULL AND "completed_at" IS NULL
            AND "abandoned_at" IS NULL AND "abandonment_reason" IS NULL)
        OR
        ("status" IN ('ACTIVE', 'PAUSED') AND "program_version_id" IS NOT NULL AND "time_zone" IS NOT NULL
            AND "started_at" IS NOT NULL AND "started_on" IS NOT NULL AND "completed_at" IS NULL
            AND "abandoned_at" IS NULL AND "abandonment_reason" IS NULL)
        OR
        ("status" = 'COMPLETED' AND "program_version_id" IS NOT NULL AND "time_zone" IS NOT NULL
            AND "started_at" IS NOT NULL AND "started_on" IS NOT NULL AND "completed_at" IS NOT NULL
            AND "completed_at" >= "started_at" AND "abandoned_at" IS NULL AND "abandonment_reason" IS NULL)
        OR
        ("status" = 'ABANDONED' AND "program_version_id" IS NOT NULL AND "time_zone" IS NOT NULL
            AND "started_at" IS NOT NULL AND "started_on" IS NOT NULL AND "abandoned_at" IS NOT NULL
            AND "abandoned_at" >= "started_at" AND "completed_at" IS NULL
            AND "abandonment_reason" IS NOT NULL AND btrim("abandonment_reason") <> '')
    )
);

CREATE UNIQUE INDEX "enrollments_id_tenant_id_key" ON "enrollments"("id", "tenant_id");
CREATE UNIQUE INDEX "enrollments_id_tenant_id_program_version_id_key"
    ON "enrollments"("id", "tenant_id", "program_version_id");
CREATE UNIQUE INDEX "enrollments_one_running_cycle_key"
    ON "enrollments"("tenant_program_id", "membership_id")
    WHERE "status" IN ('ACTIVE', 'PAUSED');
CREATE UNIQUE INDEX "program_activities_id_program_version_id_key"
    ON "program_activities"("id", "program_version_id");

CREATE TABLE "enrollment_pauses" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "paused_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pause_starts_on" DATE NOT NULL,
    "resumed_at" TIMESTAMPTZ(3),
    "resumed_on" DATE,
    CONSTRAINT "enrollment_pauses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "enrollment_pauses_interval_check" CHECK (
        ("resumed_at" IS NULL AND "resumed_on" IS NULL)
        OR ("resumed_at" IS NOT NULL AND "resumed_on" IS NOT NULL
            AND "resumed_at" >= "paused_at")
    )
);
CREATE UNIQUE INDEX "enrollment_pauses_id_tenant_id_enrollment_id_key"
    ON "enrollment_pauses"("id", "tenant_id", "enrollment_id");
CREATE UNIQUE INDEX "enrollment_pauses_one_open_key"
    ON "enrollment_pauses"("enrollment_id") WHERE "resumed_at" IS NULL;
CREATE INDEX "enrollment_pauses_tenant_id_enrollment_id_paused_at_idx"
    ON "enrollment_pauses"("tenant_id", "enrollment_id", "paused_at");

CREATE TABLE "enrollment_pause_causes" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "enrollment_pause_id" UUID NOT NULL,
    "source" "EnrollmentPauseSource" NOT NULL,
    "source_reference_id" UUID,
    "reason" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(3),
    "created_by_membership_id" UUID,
    "created_by_platform_access_id" UUID,
    "resolved_by_membership_id" UUID,
    "resolved_by_platform_access_id" UUID,
    CONSTRAINT "enrollment_pause_causes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "enrollment_pause_causes_reason_check" CHECK (btrim("reason") <> ''),
    CONSTRAINT "enrollment_pause_causes_created_actor_check" CHECK (
        num_nonnulls("created_by_membership_id", "created_by_platform_access_id") = 1
    ),
    CONSTRAINT "enrollment_pause_causes_resolution_check" CHECK (
        ("resolved_at" IS NULL AND num_nonnulls("resolved_by_membership_id", "resolved_by_platform_access_id") = 0)
        OR ("resolved_at" IS NOT NULL AND "resolved_at" >= "created_at"
            AND num_nonnulls("resolved_by_membership_id", "resolved_by_platform_access_id") = 1)
    )
);
CREATE UNIQUE INDEX "enrollment_pause_causes_one_open_source_key"
    ON "enrollment_pause_causes"("enrollment_id", "source", COALESCE("source_reference_id", '00000000-0000-0000-0000-000000000000'::uuid))
    WHERE "resolved_at" IS NULL;
CREATE INDEX "enrollment_pause_causes_tenant_id_enrollment_id_resolved_at_idx"
    ON "enrollment_pause_causes"("tenant_id", "enrollment_id", "resolved_at");

CREATE TABLE "activity_completions" (
    "id" UUID NOT NULL DEFAULT uuidv7(), "tenant_id" UUID NOT NULL, "enrollment_id" UUID NOT NULL,
    "program_version_id" UUID NOT NULL, "activity_id" UUID NOT NULL, "program_day" INTEGER NOT NULL,
    "program_date" DATE NOT NULL, "occurrence_key" VARCHAR(40) NOT NULL,
    "completed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_completions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activity_completions_data_check" CHECK ("program_day" > 0 AND btrim("occurrence_key") <> '')
);
CREATE UNIQUE INDEX "activity_completions_enrollment_id_activity_id_occurrence_key_key"
    ON "activity_completions"("enrollment_id", "activity_id", "occurrence_key");
CREATE INDEX "activity_completions_tenant_id_enrollment_id_program_day_idx"
    ON "activity_completions"("tenant_id", "enrollment_id", "program_day");

CREATE TABLE "daily_records" (
    "id" UUID NOT NULL DEFAULT uuidv7(), "tenant_id" UUID NOT NULL, "enrollment_id" UUID NOT NULL,
    "program_day" INTEGER NOT NULL, "program_date" DATE NOT NULL,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "daily_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "daily_records_day_check" CHECK ("program_day" > 0)
);
CREATE UNIQUE INDEX "daily_records_id_tenant_id_key" ON "daily_records"("id", "tenant_id");
CREATE UNIQUE INDEX "daily_records_enrollment_id_program_day_key" ON "daily_records"("enrollment_id", "program_day");
CREATE UNIQUE INDEX "daily_records_enrollment_id_program_date_key" ON "daily_records"("enrollment_id", "program_date");
CREATE INDEX "daily_records_tenant_id_enrollment_id_submitted_at_idx" ON "daily_records"("tenant_id", "enrollment_id", "submitted_at");

CREATE TABLE "pillar_scores" (
    "id" UUID NOT NULL DEFAULT uuidv7(), "tenant_id" UUID NOT NULL, "daily_record_id" UUID NOT NULL,
    "pillar_key" VARCHAR(80) NOT NULL, "score" INTEGER NOT NULL,
    CONSTRAINT "pillar_scores_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pillar_scores_data_check" CHECK (btrim("pillar_key") <> '' AND "score" >= 0)
);
CREATE UNIQUE INDEX "pillar_scores_daily_record_id_pillar_key_key" ON "pillar_scores"("daily_record_id", "pillar_key");
CREATE INDEX "pillar_scores_tenant_id_pillar_key_idx" ON "pillar_scores"("tenant_id", "pillar_key");

CREATE TABLE "private_activity_responses" (
    "id" UUID NOT NULL DEFAULT uuidv7(), "tenant_id" UUID NOT NULL, "enrollment_id" UUID NOT NULL,
    "program_version_id" UUID NOT NULL, "activity_id" UUID NOT NULL, "program_day" INTEGER NOT NULL,
    "program_date" DATE NOT NULL, "payload" JSONB NOT NULL,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "private_activity_responses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "private_activity_responses_data_check" CHECK ("program_day" > 0 AND jsonb_typeof("payload") = 'object')
);
CREATE UNIQUE INDEX "private_activity_responses_enrollment_id_activity_id_program_day_key"
    ON "private_activity_responses"("enrollment_id", "activity_id", "program_day");
CREATE INDEX "private_activity_responses_tenant_id_enrollment_id_program_day_idx"
    ON "private_activity_responses"("tenant_id", "enrollment_id", "program_day");

ALTER TABLE "enrollment_pauses" ADD CONSTRAINT "enrollment_pauses_enrollment_id_tenant_id_fkey"
    FOREIGN KEY ("enrollment_id", "tenant_id") REFERENCES "enrollments"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollment_pause_causes" ADD CONSTRAINT "enrollment_pause_causes_pause_fkey"
    FOREIGN KEY ("enrollment_pause_id", "tenant_id", "enrollment_id")
    REFERENCES "enrollment_pauses"("id", "tenant_id", "enrollment_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollment_pause_causes" ADD CONSTRAINT "enrollment_pause_causes_created_membership_fkey"
    FOREIGN KEY ("created_by_membership_id", "tenant_id") REFERENCES "tenant_memberships"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollment_pause_causes" ADD CONSTRAINT "enrollment_pause_causes_resolved_membership_fkey"
    FOREIGN KEY ("resolved_by_membership_id", "tenant_id") REFERENCES "tenant_memberships"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollment_pause_causes" ADD CONSTRAINT "enrollment_pause_causes_created_platform_fkey"
    FOREIGN KEY ("created_by_platform_access_id") REFERENCES "platform_accesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollment_pause_causes" ADD CONSTRAINT "enrollment_pause_causes_resolved_platform_fkey"
    FOREIGN KEY ("resolved_by_platform_access_id") REFERENCES "platform_accesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "activity_completions" ADD CONSTRAINT "activity_completions_enrollment_fkey"
    FOREIGN KEY ("enrollment_id", "tenant_id", "program_version_id")
    REFERENCES "enrollments"("id", "tenant_id", "program_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activity_completions" ADD CONSTRAINT "activity_completions_activity_fkey"
    FOREIGN KEY ("activity_id", "program_version_id") REFERENCES "program_activities"("id", "program_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_records" ADD CONSTRAINT "daily_records_enrollment_fkey"
    FOREIGN KEY ("enrollment_id", "tenant_id") REFERENCES "enrollments"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pillar_scores" ADD CONSTRAINT "pillar_scores_daily_record_fkey"
    FOREIGN KEY ("daily_record_id", "tenant_id") REFERENCES "daily_records"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "private_activity_responses" ADD CONSTRAINT "private_activity_responses_enrollment_fkey"
    FOREIGN KEY ("enrollment_id", "tenant_id", "program_version_id")
    REFERENCES "enrollments"("id", "tenant_id", "program_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "private_activity_responses" ADD CONSTRAINT "private_activity_responses_activity_fkey"
    FOREIGN KEY ("activity_id", "program_version_id") REFERENCES "program_activities"("id", "program_version_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION enforce_execution_fact_immutability() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'execution facts are immutable' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER "activity_completions_immutable_trigger" BEFORE UPDATE OR DELETE ON "activity_completions"
    FOR EACH ROW EXECUTE FUNCTION enforce_execution_fact_immutability();
CREATE TRIGGER "daily_records_immutable_trigger" BEFORE UPDATE OR DELETE ON "daily_records"
    FOR EACH ROW EXECUTE FUNCTION enforce_execution_fact_immutability();
CREATE TRIGGER "pillar_scores_immutable_trigger" BEFORE UPDATE OR DELETE ON "pillar_scores"
    FOR EACH ROW EXECUTE FUNCTION enforce_execution_fact_immutability();

CREATE FUNCTION enforce_closed_pause_immutability() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' OR OLD."resumed_at" IS NOT NULL THEN
        RAISE EXCEPTION 'enrollment pause history is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER "enrollment_pauses_closed_immutable_trigger" BEFORE UPDATE OR DELETE ON "enrollment_pauses"
    FOR EACH ROW EXECUTE FUNCTION enforce_closed_pause_immutability();

CREATE FUNCTION enforce_resolved_cause_immutability() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' OR OLD."resolved_at" IS NOT NULL THEN
        RAISE EXCEPTION 'enrollment pause cause history is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER "enrollment_pause_causes_resolved_immutable_trigger"
    BEFORE UPDATE OR DELETE ON "enrollment_pause_causes"
    FOR EACH ROW EXECUTE FUNCTION enforce_resolved_cause_immutability();
