ALTER TABLE "audit_events"
    ADD COLUMN "internal_event_id" UUID;

CREATE UNIQUE INDEX "audit_events_internal_event_id_key"
    ON "audit_events"("internal_event_id");

ALTER TABLE "audit_events"
    ADD CONSTRAINT "audit_events_internal_event_id_tenant_id_fkey"
    FOREIGN KEY ("internal_event_id", "tenant_id")
    REFERENCES "internal_events"("id", "tenant_id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
