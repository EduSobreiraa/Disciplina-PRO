CREATE UNIQUE INDEX "internal_events_id_tenant_id_key"
    ON "internal_events"("id", "tenant_id");

CREATE TABLE "xp_transactions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "internal_event_id" UUID NOT NULL,
    "rule_key" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(120) NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "xp_transactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "xp_transactions_content_check" CHECK (
        btrim("rule_key") <> ''
        AND btrim("event_type") <> ''
        AND btrim("description") <> ''
        AND "amount" BETWEEN -10000 AND 10000
        AND "amount" <> 0
    )
);

CREATE UNIQUE INDEX "xp_transactions_internal_event_id_rule_key_key"
    ON "xp_transactions"("internal_event_id", "rule_key");
CREATE INDEX "xp_transactions_tenant_id_membership_id_occurred_at_idx"
    ON "xp_transactions"("tenant_id", "membership_id", "occurred_at");
CREATE INDEX "xp_transactions_membership_id_created_at_idx"
    ON "xp_transactions"("membership_id", "created_at");

ALTER TABLE "xp_transactions"
    ADD CONSTRAINT "xp_transactions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "xp_transactions"
    ADD CONSTRAINT "xp_transactions_membership_id_tenant_id_fkey"
    FOREIGN KEY ("membership_id", "tenant_id")
    REFERENCES "tenant_memberships"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "xp_transactions"
    ADD CONSTRAINT "xp_transactions_internal_event_id_tenant_id_fkey"
    FOREIGN KEY ("internal_event_id", "tenant_id")
    REFERENCES "internal_events"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "achievement_key" VARCHAR(100) NOT NULL,
    "source_event_id" UUID NOT NULL,
    "unlocked_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_achievements_key_check" CHECK (btrim("achievement_key") <> '')
);

CREATE UNIQUE INDEX "user_achievements_membership_id_achievement_key_key"
    ON "user_achievements"("membership_id", "achievement_key");
CREATE INDEX "user_achievements_tenant_id_membership_id_unlocked_at_idx"
    ON "user_achievements"("tenant_id", "membership_id", "unlocked_at");
CREATE INDEX "user_achievements_source_event_id_idx"
    ON "user_achievements"("source_event_id");

ALTER TABLE "user_achievements"
    ADD CONSTRAINT "user_achievements_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_achievements"
    ADD CONSTRAINT "user_achievements_membership_id_tenant_id_fkey"
    FOREIGN KEY ("membership_id", "tenant_id")
    REFERENCES "tenant_memberships"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_achievements"
    ADD CONSTRAINT "user_achievements_source_event_id_tenant_id_fkey"
    FOREIGN KEY ("source_event_id", "tenant_id")
    REFERENCES "internal_events"("id", "tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION enforce_gamification_fact_immutability() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'gamification facts are immutable' USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER "xp_transactions_immutable_trigger"
    BEFORE UPDATE OR DELETE ON "xp_transactions"
    FOR EACH ROW EXECUTE FUNCTION enforce_gamification_fact_immutability();

CREATE TRIGGER "user_achievements_immutable_trigger"
    BEFORE UPDATE OR DELETE ON "user_achievements"
    FOR EACH ROW EXECUTE FUNCTION enforce_gamification_fact_immutability();
