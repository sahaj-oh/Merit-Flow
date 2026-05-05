-- ============================================================
-- Merit Flow — STEP 2 / Reviews table (workflow + ratings)
-- Run this AFTER 01_users.sql.
-- ============================================================

DROP TABLE IF EXISTS reviews CASCADE;
DROP TYPE  IF EXISTS review_status;

CREATE TYPE review_status AS ENUM (
  'not_started',
  'self_submitted',
  'manager_reviewed',
  'founder_reviewed',
  'finalized'
);

CREATE TABLE reviews (
  id                          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id                 UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cycle                       TEXT            NOT NULL DEFAULT 'current',
  status                      review_status   NOT NULL DEFAULT 'not_started',

  -- Employee
  self_review_text            TEXT,
  self_submitted_at           TIMESTAMP,

  -- Manager
  kra_rating                  INTEGER         CHECK (kra_rating BETWEEN 1 AND 5),
  behavioral_rating           INTEGER         CHECK (behavioral_rating BETWEEN 1 AND 5),
  manager_overall_rating      INTEGER         CHECK (manager_overall_rating BETWEEN 1 AND 5),
  manager_comments            TEXT,
  manager_reviewed_at         TIMESTAMP,
  manager_reviewed_by         UUID            REFERENCES users(id) ON DELETE SET NULL,

  -- Founder overrides (each optional; null = keep manager value)
  founder_kra_rating          INTEGER         CHECK (founder_kra_rating BETWEEN 1 AND 5),
  founder_behavioral_rating   INTEGER         CHECK (founder_behavioral_rating BETWEEN 1 AND 5),
  founder_overall_rating      INTEGER         CHECK (founder_overall_rating BETWEEN 1 AND 5),
  founder_comments            TEXT,
  founder_reviewed_at         TIMESTAMP,
  founder_reviewed_by         UUID            REFERENCES users(id) ON DELETE SET NULL,

  final_rating                NUMERIC(3,1),
  finalized_at                TIMESTAMP,
  finalized_by                UUID            REFERENCES users(id) ON DELETE SET NULL,

  created_at                  TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMP       NOT NULL DEFAULT NOW(),

  CONSTRAINT reviews_employee_cycle_uniq UNIQUE (employee_id, cycle)
);

CREATE INDEX reviews_status_idx   ON reviews(status);
CREATE INDEX reviews_employee_idx ON reviews(employee_id);

-- Optional: pre-create a 'not_started' review row for every employee, so the
-- /reviews/team list shows everyone with a status from day one. Otherwise rows
-- are lazily created by the app when an employee opens /reviews/me.
INSERT INTO reviews (employee_id, cycle, status)
SELECT id, 'current', 'not_started'
FROM users
ON CONFLICT (employee_id, cycle) DO NOTHING;

-- Verify
SELECT status, COUNT(*) FROM reviews GROUP BY status ORDER BY status;
