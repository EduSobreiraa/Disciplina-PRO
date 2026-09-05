ALTER TABLE invitation_email_retries
  ADD COLUMN notice_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN notice_claimed_at TIMESTAMPTZ(3),
  ADD CONSTRAINT invitation_notice_status_check CHECK (notice_status IN ('PENDING', 'CLAIMED', 'SENT', 'FAILED', 'BLOCKED', 'UNCERTAIN'));
CREATE INDEX invitation_email_retries_status_notice_status_idx
  ON invitation_email_retries(status, notice_status);
