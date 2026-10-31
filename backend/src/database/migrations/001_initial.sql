CREATE TABLE IF NOT EXISTS nexus_accounts (
  id text PRIMARY KEY,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'USER' CHECK (role IN ('USER','ADMIN')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED')),
  preferences jsonb NOT NULL DEFAULT '{"readReceipts":true,"presence":false}',
  last_mfa_step bigint NOT NULL DEFAULT -1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS nexus_sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES nexus_accounts(id) ON DELETE CASCADE,
  matrix_token text NOT NULL,
  device_id text NOT NULL,
  csrf_hash text NOT NULL,
  mfa_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS nexus_sessions_user_idx ON nexus_sessions(user_id);
CREATE INDEX IF NOT EXISTS nexus_sessions_expiry_idx ON nexus_sessions(expires_at);
CREATE TABLE IF NOT EXISTS nexus_contacts (
  owner_id text NOT NULL REFERENCES nexus_accounts(id) ON DELETE CASCADE,
  contact_id text NOT NULL REFERENCES nexus_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id,contact_id), CHECK(owner_id <> contact_id)
);
CREATE TABLE IF NOT EXISTS nexus_reports (
  id uuid PRIMARY KEY,
  reporter_id text REFERENCES nexus_accounts(id) ON DELETE SET NULL,
  reported_id text REFERENCES nexus_accounts(id) ON DELETE SET NULL,
  category text NOT NULL,
  evidence text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','RESOLVED')),
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS nexus_reports_status_idx ON nexus_reports(status,created_at DESC);
CREATE TABLE IF NOT EXISTS nexus_audit (
  id uuid PRIMARY KEY,
  actor_id text,
  target_id text,
  action text NOT NULL,
  reason text NOT NULL,
  outcome text NOT NULL CHECK(outcome IN ('STARTED','SUCCEEDED','FAILED')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nexus_audit_time_idx ON nexus_audit(created_at DESC);
