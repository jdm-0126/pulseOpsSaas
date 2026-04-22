ALTER TABLE invites
  DROP CONSTRAINT IF EXISTS invites_invited_by_fkey,
  ADD CONSTRAINT invites_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth_users(id) ON DELETE SET NULL;
