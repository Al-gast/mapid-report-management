BEGIN;

CREATE TABLE app.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES app.users(id) ON DELETE CASCADE,

    token_hash TEXT NOT NULL UNIQUE
        CHECK (token_hash ~ '^[0-9a-f]{64}$'),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_user_id
    ON app.sessions(user_id);

CREATE INDEX idx_sessions_expires_at
    ON app.sessions(expires_at);

REVOKE ALL ON app.sessions
    FROM PUBLIC, anon, authenticated, service_role;

COMMIT;