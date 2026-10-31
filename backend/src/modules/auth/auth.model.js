export function createAuthModel(pool) {
  return {
    async upsertAccount({id, username, displayName, role}) {
      return (await pool.query(`INSERT INTO nexus_accounts(id,username,display_name,role) VALUES($1,$2,$3,$4)
        ON CONFLICT(id) DO UPDATE SET display_name=EXCLUDED.display_name,role=EXCLUDED.role,updated_at=now() RETURNING *`, [id,username,displayName,role])).rows[0];
    },
    async createSession(s) {
      await pool.query(`INSERT INTO nexus_sessions(token_hash,user_id,matrix_token,device_id,csrf_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6)`,[s.hash,s.userId,s.matrixToken,s.deviceId,s.csrfHash,s.expiresAt]);
    },
    async session(hash) {
      return (await pool.query(`SELECT s.*, a.username,a.display_name,a.role,a.status,a.preferences FROM nexus_sessions s JOIN nexus_accounts a ON a.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`,[hash])).rows[0];
    },
    async account(id) { return (await pool.query('SELECT * FROM nexus_accounts WHERE id=$1',[id])).rows[0]; },
    async deleteSession(hash) { await pool.query('DELETE FROM nexus_sessions WHERE token_hash=$1',[hash]); },
    async deleteExpired() { await pool.query('DELETE FROM nexus_sessions WHERE expires_at<now()'); }
  };
}
