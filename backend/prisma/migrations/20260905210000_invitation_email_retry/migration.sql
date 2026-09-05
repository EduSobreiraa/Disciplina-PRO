CREATE TABLE "invitation_email_retries" (
  "id" UUID PRIMARY KEY DEFAULT uuidv7(),
  "invitation_id" UUID NOT NULL REFERENCES "invitations"("id") ON DELETE RESTRICT,
  "expected_token_hash" CHAR(64) NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  "reason" VARCHAR(32) NOT NULL,
  "due_at" TIMESTAMPTZ(3) NOT NULL,
  "claimed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "invitation_email_retry_status_check" CHECK ("status" IN ('PENDING','CLAIMED','SENT','CANCELLED','REVIEW')),
  CONSTRAINT "invitation_email_retry_reason_check" CHECK ("reason" IN ('TEMPORARY','PERMANENT','AMBIGUOUS','EXHAUSTED','INTERRUPTED'))
);
CREATE UNIQUE INDEX "invitation_email_retries_invitation_id_expected_token_hash_key" ON "invitation_email_retries"("invitation_id", "expected_token_hash");
CREATE INDEX "invitation_email_retries_status_due_at_idx" ON "invitation_email_retries"("status", "due_at");
