import {randomUUID} from 'node:crypto';
export function createAdminModel(pool) {return {
 async counts() {return (await pool.query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE status='ACTIVE')::int AS active,count(*) FILTER(WHERE status='SUSPENDED')::int AS suspended FROM nexus_accounts`)).rows[0];},
 async users(offset) {return (await pool.query('SELECT id,username,display_name AS "displayName",role,status,created_at FROM nexus_accounts ORDER BY created_at DESC LIMIT 50 OFFSET $1',[offset])).rows;},
 async account(id) {return (await pool.query('SELECT * FROM nexus_accounts WHERE id=$1',[id])).rows[0];},
 async audit(actor,target,action,reason,outcome) {await pool.query('INSERT INTO nexus_audit(id,actor_id,target_id,action,reason,outcome) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),actor,target,action,reason,outcome]);},
 async auditLog(offset) {return (await pool.query('SELECT * FROM nexus_audit ORDER BY created_at DESC LIMIT 50 OFFSET $1',[offset])).rows;},
 async setStatus(id,status) {
  const c=await pool.connect();try {await c.query('BEGIN');await c.query('UPDATE nexus_accounts SET status=$2,updated_at=now() WHERE id=$1',[id,status]);if(status==='SUSPENDED')await c.query('DELETE FROM nexus_sessions WHERE user_id=$1',[id]);await c.query('COMMIT');}
  catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 },
 async unlock(userId,hash,step) {
  const c=await pool.connect();try {await c.query('BEGIN');
   const result=await c.query('UPDATE nexus_accounts SET last_mfa_step=$2 WHERE id=$1 AND last_mfa_step<$2 RETURNING id',[userId,step]);
   if(!result.rowCount){await c.query('ROLLBACK');return false;}
   await c.query("UPDATE nexus_sessions SET mfa_until=now()+interval '10 minutes' WHERE token_hash=$1",[hash]);await c.query('COMMIT');return true;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 },
 async reports(offset){return (await pool.query('SELECT * FROM nexus_reports ORDER BY created_at DESC LIMIT 50 OFFSET $1',[offset])).rows;},
 async resolve(id,resolution){return (await pool.query("UPDATE nexus_reports SET status='RESOLVED',resolution=$2,resolved_at=now() WHERE id=$1 RETURNING id",[id,resolution])).rows[0];},
 async health(){await pool.query('SELECT 1');return true;},
 async storageStats() {
  const [accounts,sessions,reports,audit,blocks,callLogs,pushSubs]=await Promise.all([
   pool.query('SELECT count(*)::int AS count FROM nexus_accounts'),
   pool.query('SELECT count(*)::int AS count FROM nexus_sessions'),
   pool.query('SELECT count(*)::int AS count FROM nexus_reports'),
   pool.query('SELECT count(*)::int AS count FROM nexus_audit'),
   pool.query('SELECT count(*)::int AS count FROM nexus_blocks'),
   pool.query('SELECT count(*)::int AS count FROM nexus_call_logs'),
   pool.query('SELECT count(*)::int AS count FROM nexus_push_subscriptions')
  ]);
  return {
   accounts:accounts.rows[0].count,sessions:sessions.rows[0].count,reports:reports.rows[0].count,
   auditLogs:audit.rows[0].count,blocks:blocks.rows[0].count,callLogs:callLogs.rows[0].count,
   pushSubscriptions:pushSubs.rows[0].count
  };
 },
 async purgeData(retentionDays=30) {
  const days=Math.max(7,parseInt(retentionDays,10)||30);
  const [sessions,audit,calls]=await Promise.all([
   pool.query('DELETE FROM nexus_sessions WHERE expires_at<now()'),
   pool.query(`DELETE FROM nexus_audit WHERE created_at<now()-($1||' days')::interval`,[days]),
   pool.query(`DELETE FROM nexus_call_logs WHERE created_at<now()-($1||' days')::interval`,[days])
  ]);
  return {purgedSessions:sessions.rowCount,purgedAuditLogs:audit.rowCount,purgedCallLogs:calls.rowCount,retentionDays:days};
 }
};}
