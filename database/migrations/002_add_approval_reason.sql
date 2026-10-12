BEGIN;

ALTER TABLE app.report_approval_history
ADD COLUMN IF NOT EXISTS reason TEXT;

ALTER TABLE app.report_approval_history
ADD CONSTRAINT chk_approval_reason_length
CHECK (
  reason IS NULL
  OR char_length(btrim(reason)) BETWEEN 1 AND 1000
);

COMMIT;