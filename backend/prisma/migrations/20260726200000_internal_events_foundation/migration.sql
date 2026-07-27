CREATE TYPE "InternalEventDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

CREATE TABLE "internal_events" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID,
    "type" VARCHAR(120) NOT NULL,
    "version" INTEGER NOT NULL,
    "aggregate_type" VARCHAR(80) NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "source_key" VARCHAR(200) NOT NULL,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "internal_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "internal_events_envelope_check" CHECK (
        btrim("type") <> ''
        AND "version" > 0
        AND btrim("aggregate_type") <> ''
        AND btrim("source_key") <> ''
        AND jsonb_typeof("payload") = 'object'
    )
);

CREATE UNIQUE INDEX "internal_events_type_source_key_key"
    ON "internal_events"("type", "source_key");
CREATE INDEX "internal_events_tenant_id_occurred_at_idx"
    ON "internal_events"("tenant_id", "occurred_at");
CREATE INDEX "internal_events_type_occurred_at_idx"
    ON "internal_events"("type", "occurred_at");

CREATE TABLE "internal_event_deliveries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "internal_event_id" UUID NOT NULL,
    "consumer" VARCHAR(100) NOT NULL,
    "status" "InternalEventDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMPTZ(3),
    "locked_until" TIMESTAMPTZ(3),
    "processed_at" TIMESTAMPTZ(3),
    "last_error_code" VARCHAR(80),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "internal_event_deliveries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "internal_event_deliveries_state_check" CHECK (
        btrim("consumer") <> ''
        AND "attempts" >= 0
        AND (
            ("status" = 'PENDING'
                AND "locked_at" IS NULL AND "locked_until" IS NULL
                AND "processed_at" IS NULL AND "last_error_code" IS NULL)
            OR
            ("status" = 'PROCESSING'
                AND "locked_at" IS NOT NULL AND "locked_until" IS NOT NULL
                AND "locked_until" > "locked_at"
                AND "processed_at" IS NULL AND "last_error_code" IS NULL)
            OR
            ("status" = 'PROCESSED'
                AND "locked_at" IS NULL AND "locked_until" IS NULL
                AND "processed_at" IS NOT NULL AND "last_error_code" IS NULL)
            OR
            ("status" = 'FAILED'
                AND "locked_at" IS NULL AND "locked_until" IS NULL
                AND "processed_at" IS NULL AND "last_error_code" IS NOT NULL
                AND btrim("last_error_code") <> '')
        )
    )
);

CREATE UNIQUE INDEX "internal_event_deliveries_internal_event_id_consumer_key"
    ON "internal_event_deliveries"("internal_event_id", "consumer");
CREATE INDEX "internal_event_deliveries_status_next_attempt_at_idx"
    ON "internal_event_deliveries"("status", "next_attempt_at");
CREATE INDEX "internal_event_deliveries_status_locked_until_idx"
    ON "internal_event_deliveries"("status", "locked_until");

ALTER TABLE "internal_events"
    ADD CONSTRAINT "internal_events_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "internal_event_deliveries"
    ADD CONSTRAINT "internal_event_deliveries_internal_event_id_fkey"
    FOREIGN KEY ("internal_event_id") REFERENCES "internal_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION enforce_internal_event_immutability() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'internal events are immutable' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER "internal_events_immutable_trigger"
    BEFORE UPDATE OR DELETE ON "internal_events"
    FOR EACH ROW EXECUTE FUNCTION enforce_internal_event_immutability();

CREATE FUNCTION enforce_internal_event_delivery_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'internal event deliveries cannot be deleted' USING ERRCODE = '23514';
    END IF;
    IF NEW."internal_event_id" <> OLD."internal_event_id"
        OR NEW."consumer" <> OLD."consumer"
        OR NEW."created_at" <> OLD."created_at" THEN
        RAISE EXCEPTION 'internal event delivery identity is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER "internal_event_deliveries_identity_trigger"
    BEFORE UPDATE OR DELETE ON "internal_event_deliveries"
    FOR EACH ROW EXECUTE FUNCTION enforce_internal_event_delivery_identity();
