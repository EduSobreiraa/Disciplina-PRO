-- Additive rollout: old application versions do not use these tables.
CREATE TABLE "resend_invitation_messages" (
  "provider_email_id" UUID PRIMARY KEY,
  "invitation_id" UUID NOT NULL REFERENCES "invitations"("id") ON DELETE RESTRICT,
  "status" VARCHAR(24) NOT NULL DEFAULT 'SENT',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "resend_message_status_check" CHECK ("status" IN ('SENT','DELAYED','DELIVERED','FAILED','BOUNCED','COMPLAINED','SUPPRESSED'))
);
CREATE INDEX "resend_invitation_messages_invitation_id_status_idx" ON "resend_invitation_messages"("invitation_id", "status");
CREATE TABLE "resend_email_events" (
  "event_id" VARCHAR(160) PRIMARY KEY,
  "provider_email_id" UUID NOT NULL,
  "status" VARCHAR(24) NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "resend_event_status_check" CHECK ("status" IN ('SENT','DELAYED','DELIVERED','FAILED','BOUNCED','COMPLAINED','SUPPRESSED'))
);
CREATE INDEX "resend_email_events_provider_email_id_occurred_at_idx" ON "resend_email_events"("provider_email_id", "occurred_at");
