import {randomUUID} from 'node:crypto';
export function createCallsModel(pool) {
 return {
  async log(userId,{peerId,peerName,callType,direction,status,durationSeconds=0}) {
   const id=randomUUID();
   return (await pool.query(
    `INSERT INTO nexus_call_logs(id,user_id,peer_id,peer_name,call_type,direction,status,duration_seconds)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id,user_id AS "userId",peer_id AS "peerId",peer_name AS "peerName",call_type AS "callType",direction,status,duration_seconds AS "durationSeconds",created_at AS "createdAt"`,
    [id,userId,peerId,peerName,callType,direction,status,durationSeconds]
   )).rows[0];
  },
  async list(userId,limit=50) {
   return (await pool.query(
    `SELECT id,user_id AS "userId",peer_id AS "peerId",peer_name AS "peerName",call_type AS "callType",direction,status,duration_seconds AS "durationSeconds",created_at AS "createdAt"
     FROM nexus_call_logs WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [userId,limit]
   )).rows;
  },
  async clear(userId) {await pool.query('DELETE FROM nexus_call_logs WHERE user_id=$1',[userId]);}
 };
}
