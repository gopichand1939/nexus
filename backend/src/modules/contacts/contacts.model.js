export function createContactsModel(pool) {
 return {
  async list(owner) {return (await pool.query(`SELECT a.id,a.username,a.display_name AS "displayName" FROM nexus_contacts c JOIN nexus_accounts a ON a.id=c.contact_id WHERE c.owner_id=$1 ORDER BY a.display_name LIMIT 500`,[owner])).rows;},
  async add(owner,target) {await pool.query('INSERT INTO nexus_contacts(owner_id,contact_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[owner,target]);},
  async remove(owner,target) {await pool.query('DELETE FROM nexus_contacts WHERE owner_id=$1 AND contact_id=$2',[owner,target]);},
  async block(owner,target) {await pool.query('INSERT INTO nexus_blocks(blocker_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[owner,target]);},
  async unblock(owner,target) {await pool.query('DELETE FROM nexus_blocks WHERE blocker_id=$1 AND blocked_id=$2',[owner,target]);},
  async listBlocked(owner) {return (await pool.query(`SELECT a.id,a.username,a.display_name AS "displayName",b.created_at AS "blockedAt" FROM nexus_blocks b JOIN nexus_accounts a ON a.id=b.blocked_id WHERE b.blocker_id=$1 ORDER BY b.created_at DESC LIMIT 500`,[owner])).rows;},
  async isBlocked(userA,userB) {const r=await pool.query('SELECT 1 FROM nexus_blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1) LIMIT 1',[userA,userB]);return r.rowCount>0;},
  async hasContact(owner,contact) {const r=await pool.query('SELECT 1 FROM nexus_contacts WHERE owner_id=$1 AND contact_id=$2 LIMIT 1',[owner,contact]);return r.rowCount>0;}
 };
}
