CREATE TABLE "ritual_days" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "ritual_date" DATE NOT NULL,
    "completed_cycles" INTEGER NOT NULL DEFAULT 0,
    "remaining_seconds" INTEGER NOT NULL DEFAULT 1800,
    "running_started_at" TIMESTAMPTZ(3),
    "running_until" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ritual_days_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ritual_days_timer_check" CHECK (
        "completed_cycles" BETWEEN 0 AND 8
        AND "remaining_seconds" BETWEEN 0 AND 1800
        AND (
            ("completed_cycles" = 8 AND "remaining_seconds" = 0 AND "running_started_at" IS NULL AND "running_until" IS NULL)
            OR
            ("completed_cycles" < 8 AND "remaining_seconds" BETWEEN 1 AND 1800 AND (
                ("running_started_at" IS NULL AND "running_until" IS NULL)
                OR
                ("running_started_at" IS NOT NULL AND "running_until" IS NOT NULL AND "running_until" > "running_started_at")
            ))
        )
    )
);

CREATE UNIQUE INDEX "ritual_days_id_tenant_id_membership_id_key"
    ON "ritual_days"("id", "tenant_id", "membership_id");
CREATE UNIQUE INDEX "ritual_days_membership_id_ritual_date_key"
    ON "ritual_days"("membership_id", "ritual_date");
CREATE INDEX "ritual_days_tenant_id_membership_id_ritual_date_idx"
    ON "ritual_days"("tenant_id", "membership_id", "ritual_date");

CREATE TABLE "ritual_checks" (
    "ritual_day_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "section_key" VARCHAR(40) NOT NULL,
    "item_key" VARCHAR(80) NOT NULL,
    "completed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ritual_checks_pkey" PRIMARY KEY ("ritual_day_id", "section_key", "item_key"),
    CONSTRAINT "ritual_checks_key_check" CHECK (
        btrim("section_key") <> '' AND btrim("item_key") <> ''
        AND "section_key" = lower("section_key")
        AND "item_key" = lower("item_key")
    )
);

CREATE INDEX "ritual_checks_tenant_id_membership_id_completed_at_idx"
    ON "ritual_checks"("tenant_id", "membership_id", "completed_at");

ALTER TABLE "ritual_days" ADD CONSTRAINT "ritual_days_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ritual_days" ADD CONSTRAINT "ritual_days_membership_id_tenant_id_fkey"
    FOREIGN KEY ("membership_id", "tenant_id") REFERENCES "tenant_memberships"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ritual_checks" ADD CONSTRAINT "ritual_checks_day_scope_fkey"
    FOREIGN KEY ("ritual_day_id", "tenant_id", "membership_id")
    REFERENCES "ritual_days"("id", "tenant_id", "membership_id") ON DELETE RESTRICT ON UPDATE CASCADE;
