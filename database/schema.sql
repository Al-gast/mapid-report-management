-- ============================================
-- DATABASE SCHEMA
-- MAPID Report Management System
-- ============================================

CREATE SCHEMA IF NOT EXISTS app;

-- ============================================
-- USERS
-- ============================================

CREATE TABLE app.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,

    role VARCHAR(20) NOT NULL
        CHECK (role IN ('admin', 'pelapor', 'approver')),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_name_not_empty
        CHECK (LENGTH(TRIM(name)) > 0),

    CONSTRAINT users_email_not_empty
        CHECK (LENGTH(TRIM(email)) > 0)
);

CREATE UNIQUE INDEX idx_users_email_unique
ON app.users (LOWER(email));

-- ============================================
-- REPORTS
-- ============================================

CREATE TABLE app.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    reporter_id UUID NOT NULL
        REFERENCES app.users(id) ON DELETE RESTRICT,

    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN ('pending', 'approved', 'rejected')
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT reports_name_not_empty
        CHECK (LENGTH(TRIM(name)) > 0),

    CONSTRAINT reports_description_not_empty
        CHECK (LENGTH(TRIM(description)) > 0)
);

CREATE INDEX idx_reports_reporter_created
ON app.reports (reporter_id, created_at DESC, id DESC);

-- ============================================
-- REPORT APPROVAL HISTORY
-- ============================================

CREATE TABLE app.report_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    report_id UUID NOT NULL
        REFERENCES app.reports(id) ON DELETE RESTRICT,

    approver_id UUID NOT NULL
        REFERENCES app.users(id) ON DELETE RESTRICT,

    previous_status VARCHAR(20) NOT NULL
        CHECK (
            previous_status IN (
                'pending',
                'approved',
                'rejected'
            )
        ),

    new_status VARCHAR(20) NOT NULL
        CHECK (
            new_status IN ('approved', 'rejected')
        ),

    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT approval_status_must_change
        CHECK (previous_status <> new_status)
);

CREATE INDEX idx_approval_history_report_decided
ON app.report_approval_history (
    report_id,
    decided_at DESC,
    id DESC
);

-- ============================================
-- SCHEMA ACCESS RESTRICTIONS
-- ============================================

REVOKE ALL ON SCHEMA app FROM PUBLIC;

REVOKE ALL ON SCHEMA app
FROM anon, authenticated, service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA app
FROM PUBLIC, anon, authenticated, service_role;