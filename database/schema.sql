
-- ============================================
-- DATABASE SCHEMA
-- MAPID Report Management System
-- PostgreSQL / Supabase
-- ============================================

-- ============================================
-- 1. APPLICATION SCHEMA
-- ============================================

CREATE SCHEMA IF NOT EXISTS app;


-- ============================================
-- 2. USERS
-- ============================================

CREATE TABLE app.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,

    role VARCHAR(20) NOT NULL
        CHECK (
            role IN ('admin', 'pelapor', 'approver')
        ),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_name_not_empty
        CHECK (LENGTH(TRIM(name)) > 0),

    CONSTRAINT users_email_not_empty
        CHECK (LENGTH(TRIM(email)) > 0)
);

-- Case-insensitive email uniqueness
CREATE UNIQUE INDEX idx_users_email_unique
ON app.users (LOWER(email));


-- ============================================
-- 3. SESSIONS
-- ============================================
-- Server-side session authentication
-- Session tokens are stored as SHA-256 hashes.
-- Raw session tokens must never be stored here.

CREATE TABLE app.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES app.users(id) ON DELETE CASCADE,

    token_hash TEXT NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT sessions_token_hash_format
        CHECK (
            token_hash ~ '^[0-9a-f]{64}$'
        ),

    CONSTRAINT sessions_valid_expiration
        CHECK (
            expires_at > created_at
        )
);

-- Find sessions belonging to a user
CREATE INDEX idx_sessions_user_id
ON app.sessions (user_id);

-- Support expired-session cleanup
CREATE INDEX idx_sessions_expires_at
ON app.sessions (expires_at);


-- ============================================
-- 4. REPORTS
-- ============================================

CREATE TABLE app.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    reporter_id UUID NOT NULL
        REFERENCES app.users(id) ON DELETE RESTRICT,

    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'approved',
                'rejected'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT reports_name_not_empty
        CHECK (LENGTH(TRIM(name)) > 0),

    CONSTRAINT reports_description_not_empty
        CHECK (LENGTH(TRIM(description)) > 0)
);

-- Optimize reporter-specific reports and pagination
CREATE INDEX idx_reports_reporter_created
ON app.reports (
    reporter_id,
    created_at DESC,
    id DESC
);


-- ============================================
-- 5. REPORT APPROVAL HISTORY
-- ============================================
-- Every approval/rejection creates a new record.
-- History records are retained for auditing.

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
            new_status IN (
                'approved',
                'rejected'
            )
        ),

    -- Optional approval note / rejection reason
    -- Nullable for backward compatibility
    reason TEXT,

    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prevent empty or excessively long reasons
    CONSTRAINT chk_approval_reason_length
        CHECK (
            reason IS NULL
            OR char_length(btrim(reason)) BETWEEN 1 AND 1000
        ),

    -- A decision must change the current status
    CONSTRAINT approval_status_must_change
        CHECK (
            previous_status <> new_status
        )
);

-- Optimize approval history retrieval
CREATE INDEX idx_approval_history_report_decided
ON app.report_approval_history (
    report_id,
    decided_at DESC,
    id DESC
);


-- ============================================
-- 6. SCHEMA ACCESS RESTRICTIONS
-- ============================================
-- These restrictions are intended for Supabase.
-- All application queries go through Express.
-- Browser clients must not access these tables
-- directly via Supabase Data API.

REVOKE ALL ON SCHEMA app FROM PUBLIC;

REVOKE ALL ON SCHEMA app
FROM anon, authenticated, service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA app
FROM PUBLIC, anon, authenticated, service_role;


-- ============================================
-- END OF SCHEMA
-- ============================================
