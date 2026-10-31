CREATE TABLE IF NOT EXISTS nexus_blocks (
  blocker_id text NOT NULL REFERENCES nexus_accounts(id) ON DELETE CASCADE,
  blocked_id text NOT NULL REFERENCES nexus_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(blocker_id, blocked_id),
  CHECK(blocker_id <> blocked_id)
);
CREATE INDEX IF NOT EXISTS nexus_blocks_blocker_idx ON nexus_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS nexus_blocks_blocked_idx ON nexus_blocks(blocked_id);

CREATE TABLE IF NOT EXISTS nexus_call_logs (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES nexus_accounts(id) ON DELETE CASCADE,
  peer_id text NOT NULL,
  peer_name text NOT NULL,
  call_type text NOT NULL CHECK (call_type IN ('audio', 'video', 'group')),
  direction text NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  status text NOT NULL CHECK (status IN ('completed', 'missed', 'rejected', 'failed')),
  duration_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nexus_call_logs_user_idx ON nexus_call_logs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS nexus_push_subscriptions (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES nexus_accounts(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nexus_push_subs_user_idx ON nexus_push_subscriptions(user_id);
