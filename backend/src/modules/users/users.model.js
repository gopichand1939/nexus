export function createUsersModel(pool) {
  return {
    async remove(id){await pool.query('DELETE FROM nexus_accounts WHERE id=$1',[id]);},
    async search(query) {
      if(!query)return null;
      const q=String(query).trim();
      const clean=q.replace(/^@/,'');
      const local=clean.split(':')[0].toLowerCase();
      const exact=(await pool.query(
        "SELECT id,username,display_name,preferences FROM nexus_accounts WHERE (id=$1 OR username=$2 OR username=$3) AND status='ACTIVE'",
        [q,q.toLowerCase(),local]
      )).rows[0];
      if(exact)return exact;
      const pattern=`%${local}%`;
      return (await pool.query(
        "SELECT id,username,display_name,preferences FROM nexus_accounts WHERE (id ILIKE $1 OR username ILIKE $1 OR display_name ILIKE $2) AND status='ACTIVE' ORDER BY (username=$3) DESC LIMIT 1",
        [pattern,`%${q}%`,local]
      )).rows[0];
    },
    async searchAll(query,limit=10) {
      if(!query)return [];
      const q=String(query).trim();
      const clean=q.replace(/^@/,'');
      const local=clean.split(':')[0].toLowerCase();
      const pattern=`%${local}%`;
      return (await pool.query(
        "SELECT id,username,display_name,preferences FROM nexus_accounts WHERE (id=$1 OR username=$2 OR username=$3 OR id ILIKE $4 OR username ILIKE $4 OR display_name ILIKE $5) AND status='ACTIVE' ORDER BY (id=$1 OR username=$2) DESC, created_at ASC LIMIT $6",
        [q,q.toLowerCase(),local,pattern,`%${q}%`,limit]
      )).rows;
    },
    async getById(id) { return (await pool.query("SELECT id,username,display_name,preferences FROM nexus_accounts WHERE id=$1 AND status='ACTIVE'",[id])).rows[0]; },
    async update(id, displayName, preferences) {
      return (await pool.query('UPDATE nexus_accounts SET display_name=$2,preferences=$3,updated_at=now() WHERE id=$1 RETURNING *',[id,displayName,JSON.stringify(preferences)])).rows[0];
    },
    async savePushSubscription(userId,{endpoint,p256dh,auth}) {
      const id=(await import('node:crypto')).randomUUID();
      await pool.query('INSERT INTO nexus_push_subscriptions(id,user_id,endpoint,p256dh,auth) VALUES($1,$2,$3,$4,$5) ON CONFLICT (endpoint) DO UPDATE SET p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth',[id,userId,endpoint,p256dh,auth]);
    },
    async deletePushSubscription(userId,endpoint) {
      await pool.query('DELETE FROM nexus_push_subscriptions WHERE user_id=$1 AND endpoint=$2',[userId,endpoint]);
    }
  };
}
